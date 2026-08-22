from __future__ import annotations
import io
import logging
import uuid
import wave
from urllib.parse import quote
from google.cloud import storage
from google.genai import types
from .config import settings
from .gemini_service import studio

log = logging.getLogger(__name__)

class NarrationService:
    def _wav_bytes(self, pcm: bytes, rate: int = 24000) -> bytes:
        out = io.BytesIO()
        with wave.open(out, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(rate)
            wf.writeframes(pcm)
        return out.getvalue()

    def synthesize_to_gcs(self, text: str, locale: str, style: str = "cinematic, emotionally natural narrator") -> dict | None:
        if not settings.enable_tts or not text.strip():
            return None
        if not settings.video_gcs_uri:
            return None
        try:
            response = studio.client().models.generate_content(
                model=settings.tts_model,
                contents=f"Speak the following text exactly in locale {locale}. Do not translate it. Text: {text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        language_code=locale,
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=settings.tts_voice)
                        ),
                    ),
                    system_instruction=f"You are the voice performer for an original cinematic series. Performance style: {style}. Keep pacing natural and intelligible.",
                ),
            )
            pcm = b""
            for candidate in response.candidates or []:
                content = candidate.content
                if not content:
                    continue
                for part in content.parts or []:
                    if part.inline_data and part.inline_data.data:
                        raw = part.inline_data.data
                        pcm += raw if isinstance(raw, bytes) else bytes(raw)
            if not pcm:
                raise RuntimeError("Gemini TTS returned no audio bytes")

            wav = self._wav_bytes(pcm)
            prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
            bucket_name, _, base_prefix = prefix.partition("/")
            if not bucket_name:
                raise RuntimeError("Invalid CINEMIND_VIDEO_GCS_URI")
            object_name = "/".join(x for x in [base_prefix.rstrip('/'), "audio", f"{uuid.uuid4().hex}.wav"] if x)
            blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
            blob.upload_from_string(wav, content_type="audio/wav")
            uri = f"gs://{bucket_name}/{object_name}"
            return {
                "audioUri": uri,
                "playbackUrl": f"/api/media/video/content?uri={quote(uri, safe='')}",
                "model": settings.tts_model,
                "voice": settings.tts_voice,
                "locale": locale,
            }
        except Exception as exc:
            # Rendering should remain usable even if TTS is unavailable for a locale.
            log.warning("Gemini TTS narration failed for %s: %s", locale, exc)
            return None

narration = NarrationService()
