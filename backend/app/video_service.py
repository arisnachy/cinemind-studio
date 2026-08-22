from __future__ import annotations
import time
from urllib.parse import quote
from google.genai import types
from .config import settings
from .gemini_service import studio

class VideoService:
    def generate_prompt(self, prompt: str, locale: str = "en-US", narration: str = "", dialogue: str = "") -> dict:
        if not settings.enable_video:
            raise RuntimeError("Video generation is disabled. Set CINEMIND_ENABLE_VIDEO_GENERATION=true when you want to spend Veo credits.")
        if not settings.video_gcs_uri:
            raise RuntimeError("CINEMIND_VIDEO_GCS_URI must point to a writable gs:// bucket prefix")

        # Veo 3.1 expects directing prompts in English. Spoken content can still be
        # explicitly requested in the viewer's locale.
        audio_direction = (
            f"\nAUDIO DIRECTION: Preserve cinematic environmental sound. "
            f"All spoken audio must be natural for locale {locale}. "
        )
        if narration:
            audio_direction += f"A narrator clearly says, in {locale}: {narration!r}. "
        if dialogue:
            audio_direction += f"Character dialogue, in {locale}: {dialogue!r}. "
        if not narration and not dialogue:
            audio_direction += "Use subtle cinematic ambience and meaningful diegetic sound; no random vocalizations. "

        final_prompt = (
            f"{prompt.strip()}\n"
            "This is an original CINEMIND production. No real actors, copyrighted characters, logos, or franchise visual identity. "
            "Maintain character appearance, wardrobe, lighting language, lens style, geography and time-of-day continuity with adjacent shots. "
            f"{audio_direction}"
        )

        operation = studio.client().models.generate_videos(
            model=settings.veo_model,
            source=types.GenerateVideosSource(prompt=final_prompt),
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                duration_seconds=settings.veo_duration_seconds,
                enhance_prompt=True,
                aspect_ratio="16:9",
                output_gcs_uri=settings.video_gcs_uri,
            ),
        )
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
        return {
            "status": "DONE",
            "videoUri": uri,
            "playbackUrl": f"/api/media/video/content?uri={quote(uri, safe='')}",
            "model": settings.veo_model,
            "durationSeconds": settings.veo_duration_seconds,
        }

    def generate(self, title: dict, locale: str = "en-US") -> dict:
        meta = title.get("_cinemind", {})
        prompt = meta.get("teaserPrompt") or f"Original cinematic teaser for {title.get('title')}: {title.get('synopsis')}"
        synopsis = title.get("synopsis", "")
        narration = f"{title.get('title')}. {synopsis}" if synopsis else title.get("title", "")
        return self.generate_prompt(prompt, locale=locale, narration=narration)

videos = VideoService()
