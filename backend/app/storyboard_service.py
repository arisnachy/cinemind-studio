from __future__ import annotations

import logging
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.cloud import storage
from google.genai import types

from .config import settings
from .gemini_service import studio
from .schemas import EpisodeRenderPlan

log = logging.getLogger(__name__)


class StoryboardFrameService:
    @staticmethod
    def _mime(uri: str) -> str:
        lowered = uri.lower()
        if lowered.endswith(".jpg") or lowered.endswith(".jpeg"):
            return "image/jpeg"
        return "image/png"

    def _upload(self, raw: bytes, label: str, mime_type: str = "image/png") -> str:
        prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
        bucket_name, _, base_prefix = prefix.partition("/")
        if not bucket_name:
            raise RuntimeError("Invalid CINEMIND_VIDEO_GCS_URI")
        safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-").lower() or "frame"
        ext = "png" if "png" in mime_type else "jpg"
        object_name = "/".join(
            x for x in [base_prefix.rstrip('/'), "storyboard/keyframes", f"{safe}-{uuid.uuid4().hex[:10]}.{ext}"] if x
        )
        blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
        blob.upload_from_string(raw, content_type=mime_type)
        return f"gs://{bucket_name}/{object_name}"

    def _generate_one(self, prompt: str, reference_uris: list[str], label: str) -> str:
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
        response = studio.client().models.generate_content(
            model=settings.image_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
                temperature=0.15,
            ),
        )
        for candidate in response.candidates or []:
            if not candidate.content:
                continue
            for part in candidate.content.parts or []:
                if part.inline_data and part.inline_data.data:
                    raw = part.inline_data.data if isinstance(part.inline_data.data, bytes) else bytes(part.inline_data.data)
                    return self._upload(raw, label, part.inline_data.mime_type or "image/png")
        raise RuntimeError(f"Gemini image model returned no keyframe for {label}")

    def build_shared_boundaries(self, plan: EpisodeRenderPlan, reference_uris: list[str]) -> list[str]:
        """Return N+1 exact boundary frames for N shots.

        Shot i uses frames[i] -> frames[i+1]. Adjacent shots therefore share an
        identical visual boundary while Veo operations can run concurrently.
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
        workers = min(4, len(prompts))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(self._generate_one, prompt, reference_uris, f"boundary-{index:03d}"): index
                for index, prompt in enumerate(prompts)
            }
            for future in as_completed(futures):
                index = futures[future]
                frames[index] = future.result()

        if any(not frame for frame in frames):
            raise RuntimeError("Storyboard keyframe generation returned an incomplete boundary set")
        log.info("Generated %d shared storyboard boundary frames", len(frames))
        return frames


storyboard_frames = StoryboardFrameService()
