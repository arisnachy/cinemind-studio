from __future__ import annotations

import time
from urllib.parse import quote

from google.genai import types

from .config import settings
from .gemini_service import studio


class VideoService:
    def generate_prompt(
        self,
        prompt: str,
        locale: str = "en-US",
        narration: str = "",
        dialogue: str = "",
        reference_uris: list[str] | None = None,
        first_frame_uri: str = "",
    ) -> dict:
        if not settings.enable_video:
            raise RuntimeError("Video generation is disabled. Set CINEMIND_ENABLE_VIDEO_GENERATION=true when you want to spend Veo credits.")
        if not settings.video_gcs_uri:
            raise RuntimeError("CINEMIND_VIDEO_GCS_URI must point to a writable gs:// bucket prefix")

        # Spoken language is authored by Gemini and rendered deterministically by
        # Gemini-TTS after picture generation. Veo supplies picture + restrained
        # diegetic ambience only. This prevents random English speech/vocalizations.
        audio_direction = (
            "\nAUDIO DIRECTION: DIEGETIC AMBIENCE ONLY. "
            "Do not generate dialogue, narration, intelligible speech, singing, whispers, moans, breaths, filler vocalizations, or any spoken language. "
            "Use only purposeful environmental sound appropriate to the visible action. "
        )

        if first_frame_uri:
            continuity_instruction = (
                "The supplied first frame is the exact final visual state of the previous shot. "
                "Continue from it immediately: same people, faces, hair, wardrobe, props, geography, lighting, screen direction and dramatic action. "
                "Do not reset the scene or re-establish the location. "
            )
        else:
            continuity_instruction = (
                "Use the supplied asset references as immutable identity and production-design anchors. "
                "Preserve facial structure, hair, age, wardrobe, props, geography, lighting direction and lens family. "
            )

        final_prompt = (
            f"{prompt.strip()}\n"
            "PREMIUM SERIES DIRECTION: This is one causally connected shot from a scripted television episode, not a trailer montage. "
            f"{continuity_instruction}"
            "Do not introduce new characters or locations unless explicitly directed. Avoid random symbolic imagery and montage logic. "
            "This is an original CINEMIND production. No real actors, copyrighted characters, logos, or franchise visual identity. "
            f"{audio_direction}"
        )

        refs: list[types.VideoGenerationReferenceImage] = []
        config_kwargs: dict = {
            "number_of_videos": 1,
            "duration_seconds": settings.veo_duration_seconds,
            "enhance_prompt": True,
            "aspect_ratio": "16:9",
            "output_gcs_uri": settings.video_gcs_uri,
        }

        call_kwargs: dict = {
            "model": settings.veo_model,
            "prompt": final_prompt,
        }

        if first_frame_uri:
            # Image-to-video handoff: the last frame of the preceding shot becomes
            # the exact first frame of this one. This avoids the 30-second extension
            # ceiling while preserving spatial/character continuity.
            call_kwargs["image"] = types.Image(gcs_uri=first_frame_uri, mime_type="image/png")
        else:
            for uri in (reference_uris or [])[:3]:
                if uri:
                    refs.append(
                        types.VideoGenerationReferenceImage(
                            image=types.Image(gcs_uri=uri, mime_type="image/png"),
                            reference_type="asset",
                        )
                    )
            if refs:
                # Veo reference-image mode is 8 seconds.
                config_kwargs["duration_seconds"] = 8
                config_kwargs["reference_images"] = refs

        call_kwargs["config"] = types.GenerateVideosConfig(**config_kwargs)
        operation = studio.client().models.generate_videos(**call_kwargs)

        deadline = time.time() + 720
        while not operation.done and time.time() < deadline:
            time.sleep(10)
            operation = studio.client().operations.get(operation)
        if not operation.done:
            raise RuntimeError("Veo generation exceeded the 12-minute server deadline")
        if operation.error:
            raise RuntimeError(f"Veo generation failed: {operation.error}")
        generated = (operation.response.generated_videos if operation.response else []) or []
        if not generated:
            raise RuntimeError("Veo completed without a generated video")

        uri = generated[0].video.uri
        duration = int(config_kwargs["duration_seconds"])
        return {
            "status": "DONE",
            "videoUri": uri,
            "playbackUrl": f"/api/media/video/content?uri={quote(uri, safe='')}",
            "model": settings.veo_model,
            "durationSeconds": duration,
            "referenceCount": len(refs),
            "firstFrameApplied": bool(first_frame_uri),
        }

    def generate(self, title: dict, locale: str = "en-US") -> dict:
        meta = title.get("_cinemind", {})
        prompt = meta.get("teaserPrompt") or f"Original cinematic teaser for {title.get('title')}: {title.get('synopsis')}"
        return self.generate_prompt(prompt, locale=locale)


videos = VideoService()
