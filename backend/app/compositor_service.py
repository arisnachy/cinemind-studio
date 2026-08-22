from __future__ import annotations

import logging
import subprocess
import tempfile
import uuid
from pathlib import Path
from urllib.parse import quote

import imageio_ffmpeg
from google.cloud import storage

from .config import settings

log = logging.getLogger(__name__)


class EpisodeCompositor:
    def __init__(self) -> None:
        self._storage = storage.Client(project=settings.project) if settings.project else storage.Client()

    @staticmethod
    def _split_gs(uri: str) -> tuple[str, str]:
        if not uri.startswith("gs://"):
            raise ValueError(f"Expected gs:// URI, got {uri!r}")
        bucket, _, name = uri[5:].partition("/")
        if not bucket or not name:
            raise ValueError(f"Invalid GCS URI: {uri}")
        return bucket, name

    def _download(self, uri: str, destination: Path) -> None:
        bucket, name = self._split_gs(uri)
        destination.parent.mkdir(parents=True, exist_ok=True)
        self._storage.bucket(bucket).blob(name).download_to_filename(str(destination))

    def _upload(self, source: Path, folder: str, extension: str, content_type: str) -> str:
        prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
        bucket_name, _, base_prefix = prefix.partition("/")
        if not bucket_name:
            raise RuntimeError("Invalid CINEMIND_VIDEO_GCS_URI")
        object_name = "/".join(
            part for part in [base_prefix.rstrip("/"), folder.strip("/"), f"{uuid.uuid4().hex}.{extension}"] if part
        )
        blob = self._storage.bucket(bucket_name).blob(object_name)
        blob.upload_from_filename(str(source), content_type=content_type)
        return f"gs://{bucket_name}/{object_name}"

    @staticmethod
    def _run(args: list[str], cwd: Path | None = None) -> None:
        proc = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if proc.returncode != 0:
            tail = (proc.stderr or "")[-4000:]
            raise RuntimeError(f"FFmpeg failed ({proc.returncode}): {tail}")

    def extract_last_frame(self, video_uri: str) -> str:
        """Extract the final stable frame from a Veo clip for next-shot handoff."""
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory(prefix="cinemind-frame-") as tmp:
            work = Path(tmp)
            source = work / "shot.mp4"
            frame = work / "last-frame.png"
            self._download(video_uri, source)
            self._run([
                ffmpeg,
                "-y",
                "-sseof",
                "-0.20",
                "-i",
                str(source),
                "-frames:v",
                "1",
                "-vf",
                "scale=1280:-2",
                str(frame),
            ])
            return self._upload(frame, "continuity/frames", "png", "image/png")

    def _normalize_segment(self, segment: dict, work: Path, index: int) -> Path:
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        video_path = work / f"shot-{index:03d}.mp4"
        normalized = work / f"shot-{index:03d}-master.mp4"
        self._download(segment["videoUri"], video_path)
        duration = max(1, int(segment.get("durationSeconds") or 8))
        voice_uri = segment.get("narrationUri") or ""

        video_filter = (
            "scale=1280:720:force_original_aspect_ratio=decrease,"
            "pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24,format=yuv420p"
        )

        if voice_uri:
            voice_path = work / f"voice-{index:03d}.wav"
            self._download(voice_uri, voice_path)
            mix_command = [
                ffmpeg,
                "-y",
                "-i",
                str(video_path),
                "-i",
                str(voice_path),
                "-filter_complex",
                (
                    f"[0:v]{video_filter}[v];"
                    "[0:a]volume=0.16[amb];"
                    "[1:a]volume=1.0,apad[voice];"
                    "[amb][voice]amix=inputs=2:duration=first:dropout_transition=0[a]"
                ),
                "-map",
                "[v]",
                "-map",
                "[a]",
                "-t",
                str(duration),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "20",
                "-c:a",
                "aac",
                "-b:a",
                "160k",
                "-ar",
                "48000",
                "-ac",
                "2",
                "-movflags",
                "+faststart",
                str(normalized),
            ]
            try:
                self._run(mix_command)
                return normalized
            except Exception as exc:
                log.warning("Ambient/TTS mix failed for shot %s, using voice-only mix: %s", index, exc)
                self._run([
                    ffmpeg,
                    "-y",
                    "-i",
                    str(video_path),
                    "-i",
                    str(voice_path),
                    "-filter_complex",
                    f"[0:v]{video_filter}[v];[1:a]volume=1.0,apad[a]",
                    "-map",
                    "[v]",
                    "-map",
                    "[a]",
                    "-t",
                    str(duration),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "20",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "160k",
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-movflags",
                    "+faststart",
                    str(normalized),
                ])
                return normalized

        self._run([
            ffmpeg,
            "-y",
            "-i",
            str(video_path),
            "-vf",
            video_filter,
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-t",
            str(duration),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            str(normalized),
        ])
        return normalized

    def compose(self, segments: list[dict], locale: str) -> dict:
        if not segments:
            raise RuntimeError("Cannot compose an empty episode")

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory(prefix="cinemind-master-") as tmp:
            work = Path(tmp)
            normalized: list[Path] = []
            for index, segment in enumerate(segments, start=1):
                normalized.append(self._normalize_segment(segment, work, index))

            # All normalized files live next to concat.txt. Relative names avoid
            # Windows drive-letter parsing issues and also work unchanged on Linux.
            concat_file = work / "concat.txt"
            concat_file.write_text(
                "\n".join(f"file '{path.name}'" for path in normalized),
                encoding="utf-8",
            )
            final_path = work / "episode-master.mp4"
            try:
                self._run([
                    ffmpeg,
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    concat_file.name,
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    final_path.name,
                ], cwd=work)
            except Exception:
                self._run([
                    ffmpeg,
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    concat_file.name,
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "20",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "160k",
                    "-movflags",
                    "+faststart",
                    final_path.name,
                ], cwd=work)

            uri = self._upload(final_path, "episodes/master", "mp4", "video/mp4")
            return {
                "videoUri": uri,
                "playbackUrl": f"/api/media/video/content?uri={quote(uri, safe='')}",
                "durationSeconds": sum(int(s.get("durationSeconds") or 0) for s in segments),
                "locale": locale,
                "segments": len(segments),
                "composition": "single-master-mp4",
            }


composer = EpisodeCompositor()
