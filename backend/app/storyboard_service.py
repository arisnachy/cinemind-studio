from __future__ import annotations

import hashlib
import logging
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from google.cloud import storage
from google.genai import types

from .config import settings
from .gemini_service import studio
from .schemas import EpisodeRenderPlan

log = logging.getLogger(__name__)
StoryboardProgress = Callable[[int, int, str], None]


class StoryboardFrameService:
    @staticmethod
    def _mime(uri: str) -> str:
        lowered = uri.lower()
        if lowered.endswith(".jpg") or lowered.endswith(".jpeg"):
            return "image/jpeg"
        return "image/png"

    @staticmethod
    def _is_quota_error(exc: Exception) -> bool:
        text = str(exc).upper()
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        return code == 429 or "429" in text or "RESOURCE_EXHAUSTED" in text

    @staticmethod
    def _cache_key(prompt: str, reference_uris: list[str]) -> str:
        payload = "\n".join([prompt, *reference_uris]).encode("utf-8", errors="ignore")
        return hashlib.sha256(payload).hexdigest()[:20]

    @staticmethod
    def _split_output_prefix() -> tuple[str, str]:
        prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
        bucket_name, _, base_prefix = prefix.partition("/")
        if not bucket_name:
            raise RuntimeError("Invalid CINEMIND_VIDEO_GCS_URI")
        return bucket_name, base_prefix.rstrip("/")

    def _cached(self, label: str, cache_key: str) -> str:
        bucket_name, base_prefix = self._split_output_prefix()
        safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-").lower() or "frame"
        bucket = storage.Client(project=settings.project).bucket(bucket_name)
        for ext in ("png", "jpg"):
            object_name = "/".join(
                x for x in [base_prefix, "storyboard/keyframes", f"{safe}-{cache_key}.{ext}"] if x
            )
            blob = bucket.blob(object_name)
            try:
                if blob.exists():
                    return f"gs://{bucket_name}/{object_name}"
            except Exception:
                # Cache lookup must never block production.
                return ""
        return ""

    def _upload(self, raw: bytes, label: str, cache_key: str, mime_type: str = "image/png") -> str:
        bucket_name, base_prefix = self._split_output_prefix()
        safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-").lower() or "frame"
        ext = "png" if "png" in mime_type else "jpg"
        object_name = "/".join(
            x for x in [base_prefix, "storyboard/keyframes", f"{safe}-{cache_key}.{ext}"] if x
        )
        blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
        blob.upload_from_string(raw, content_type=mime_type)
        return f"gs://{bucket_name}/{object_name}"

    def _request_image(self, model: str, contents: list, label: str, cache_key: str) -> str:
        response = studio.client().models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
                temperature=0.12,
            ),
        )
        for candidate in response.candidates or []:
            if not candidate.content:
                continue
            for part in candidate.content.parts or []:
                if part.inline_data and part.inline_data.data:
                    raw = part.inline_data.data if isinstance(part.inline_data.data, bytes) else bytes(part.inline_data.data)
                    return self._upload(raw, label, cache_key, part.inline_data.mime_type or "image/png")
        raise RuntimeError(f"Gemini image model {model} returned no keyframe for {label}")

    def _generate_one(self, prompt: str, reference_uris: list[str], label: str) -> str:
        cache_key = self._cache_key(prompt, reference_uris)
        cached = self._cached(label, cache_key)
        if cached:
            log.info("Storyboard cache hit for %s", label)
            return cached

        contents: list = []
        for uri in reference_uris[:3]:
            contents.append(types.Part.from_uri(file_uri=uri, mime_type=self._mime(uri)))
        contents.append(
            "Use the supplied images as immutable identity/location references. "
            "Create the requested boundary frame as a LIVE-ACTION PHOTOREALISTIC television production still. "
            "Natural skin texture, plausible anatomy, practical lighting, physically believable set materials, restrained color grade, no glossy CGI, "
            "no beauty-filter skin, no concept-art look, no poster composition, no text or logos. "
            + prompt
        )

        models = [settings.image_model]
        if settings.image_fallback_model and settings.image_fallback_model not in models:
            models.append(settings.image_fallback_model)

        last_error: Exception | None = None
        for attempt in range(1, settings.image_retry_attempts + 1):
            quota_seen = False
            for model in models:
                try:
                    return self._request_image(model, contents, label, cache_key)
                except Exception as exc:
                    last_error = exc
                    if self._is_quota_error(exc):
                        quota_seen = True
                        log.warning(
                            "Storyboard %s hit quota on %s (attempt %d/%d)",
                            label,
                            model,
                            attempt,
                            settings.image_retry_attempts,
                        )
                        continue
                    # A model-specific incompatibility should not prevent trying the
                    # configured fallback image model.
                    log.warning("Storyboard %s failed on %s: %s", label, model, exc)
                    continue

            if attempt < settings.image_retry_attempts:
                base = min(
                    settings.image_retry_max_seconds,
                    settings.image_retry_base_seconds * (2 ** (attempt - 1)),
                )
                # Google recommends exponential backoff with jitter for 429/503.
                delay = base + random.uniform(0.0, max(1.0, base * 0.35))
                reason = "quota recovery" if quota_seen else "image retry"
                log.info("Waiting %.1fs before %s for %s", delay, reason, label)
                time.sleep(delay)

        if last_error and self._is_quota_error(last_error):
            raise RuntimeError(
                "STORYBOARD_QUOTA_EXHAUSTED: Vertex AI image capacity stayed unavailable after "
                f"{settings.image_retry_attempts} backoff attempts. No Veo credits were spent for this unfinished storyboard."
            ) from last_error
        raise RuntimeError(f"Storyboard keyframe generation failed for {label}: {last_error}") from last_error

    def build_shared_boundaries(
        self,
        plan: EpisodeRenderPlan,
        reference_uris: list[str],
        on_progress: StoryboardProgress | None = None,
    ) -> list[str]:
        """Return N+1 exact boundary frames for N shots.

        Shot i uses frames[i] -> frames[i+1]. Adjacent shots therefore share an
        identical visual boundary while Veo operations can run concurrently.

        Image calls are deliberately throttled separately from Veo. The video
        stage can be highly parallel; bursting Gemini Image requests is much more
        likely to trigger transient 429s and is not the latency bottleneck.
        """
        shots = plan.shots
        if not shots:
            raise RuntimeError("Cannot storyboard an empty render plan")

        prompts: list[str] = []
        for boundary in range(len(shots) + 1):
            if boundary == 0:
                prompts.append(
                    f"OPENING FRAME before shot 1. {shots[0].startFramePromptEnglish} "
                    f"Continuity state: {shots[0].continuityAnchor}. The viewer must immediately understand place, time and protagonist."
                )
            elif boundary == len(shots):
                prompts.append(
                    f"FINAL FRAME after shot {len(shots)}. {shots[-1].endFramePromptEnglish} "
                    "Hold a readable cold-open/title-break composition; no arbitrary mid-action cutoff."
                )
            else:
                previous = shots[boundary - 1]
                nxt = shots[boundary]
                prompts.append(
                    f"SHARED BOUNDARY FRAME between shot {boundary} and shot {boundary + 1}. "
                    f"End state required by previous shot: {previous.endFramePromptEnglish}. "
                    f"Start state required by next shot: {nxt.startFramePromptEnglish}. "
                    f"Preserve exact character positions, eyelines, wardrobe, props, geography, lighting and time-of-day."
                )

        frames: list[str] = [""] * len(prompts)
        workers = min(settings.image_max_concurrency, len(prompts))
        completed = 0
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(self._generate_one, prompt, reference_uris, f"boundary-{index:03d}"): index
                for index, prompt in enumerate(prompts)
            }
            for future in as_completed(futures):
                index = futures[future]
                frames[index] = future.result()
                completed += 1
                if on_progress:
                    on_progress(completed, len(prompts), f"Locked storyboard frame {completed}/{len(prompts)}")

        if any(not frame for frame in frames):
            raise RuntimeError("Storyboard keyframe generation returned an incomplete boundary set")
        log.info(
            "Generated %d shared storyboard boundary frames with image concurrency=%d",
            len(frames),
            workers,
        )
        return frames


storyboard_frames = StoryboardFrameService()
