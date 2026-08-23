from __future__ import annotations

import time
from urllib.parse import quote

from google.genai import types

from .config import settings
from .gemini_service import studio


def _spoken_language(locale: str) -> str:
    normalized = (locale or "en-US").replace("_", "-")
    known = {
        "es-DO": "Dominican Spanish",
        "es-ES": "Spanish from Spain",
        "es-US": "Latin American Spanish",
        "en-US": "American English",
        "en-GB": "British English",
        "fr-FR": "French",
        "pt-BR": "Brazilian Portuguese",
        "de-DE": "German",
        "it-IT": "Italian",
        "ja-JP": "Japanese",
        "ko-KR": "Korean",
    }
    return known.get(normalized, normalized)


class VideoService:
    def generate_prompt(
        self,
        prompt: str,
        locale: str = "en-US",
        narration: str = "",
        dialogue: str = "",
        dialogue_speaker: str = "",
        voice_descriptor: str = "",
        reference_uris: list[str] | None = None,
        first_frame_uri: str = "",
        last_frame_uri: str = "",
        require_native_audio: bool = False,
    ) -> dict:
        if not settings.enable_video:
            raise RuntimeError("Video generation is disabled. Set CINEMIND_ENABLE_VIDEO_GENERATION=true when you want to spend Veo credits.")
        if not settings.video_gcs_uri:
            raise RuntimeError("CINEMIND_VIDEO_GCS_URI must point to a writable gs:// bucket prefix")

        language = _spoken_language(locale)
        selected_model = settings.veo_audio_model if require_native_audio else settings.veo_visual_model

        if dialogue.strip():
            speaker = dialogue_speaker.strip() or "the visible speaking character"
            voice = voice_descriptor.strip() or f"natural adult voice appropriate to {language}, restrained premium-drama delivery"
            audio_direction = (
                "\nAUDIO DIRECTION: The visible character must deliver synchronized dialogue in the same generated take. "
                f"{speaker} says exactly this line in {language}: \"{dialogue.strip()}\". "
                f"Vocal identity: {voice}. Natural conversational timing, believable breath support, no announcer cadence. "
                "Do not translate, paraphrase, add English, add another speaker, or invent extra words. Keep realistic location ambience underneath. "
            )
        elif narration.strip():
            voice = voice_descriptor.strip() or f"restrained premium-drama narrator speaking {language}"
            audio_direction = (
                "\nAUDIO DIRECTION: A single off-screen narrator says exactly this line in the requested language: "
                f"\"{narration.strip()}\". Voice identity: {voice}. Do not translate, paraphrase, or add other speech. "
            )
        else:
            audio_direction = (
                "\nAUDIO DIRECTION: Generate only believable diegetic location sound for the visible action; no dialogue or narration. "
            ) if require_native_audio else ""

        if first_frame_uri and last_frame_uri:
            continuity_instruction = (
                "The supplied start and end frames are exact immutable boundaries for this take. Begin from the first frame and arrive naturally at the last frame. "
                "Preserve face, hair, age, wardrobe, props, room geography, lighting, screen direction, eyelines and physical causality between them. "
            )
        elif first_frame_uri:
            continuity_instruction = (
                "The supplied first frame is the exact starting visual state. Continue from it immediately without resetting poses or geography. "
            )
        else:
            continuity_instruction = (
                "Use supplied asset references as immutable identity and production-design anchors. "
            )

        final_prompt = (
            f"{prompt.strip()}\n"
            "LIVE-ACTION PHOTOREALISM ONLY: real human skin texture, subtle microexpressions, physically plausible lighting/materials/anatomy, natural motion, "
            "restrained premium television camera language. No glossy CGI skin, game rendering, concept art, beauty-filter look, surreal AI artifacts, or trailer montage energy. "
            f"{continuity_instruction}"
            "The visible action must be causally understandable and begin exactly where the prior beat leaves off. "
            "This is an original CINEMIND production; no real actors, copyrighted characters, logos, or franchise identity. "
            f"{audio_direction}"
        )

        refs: list[types.VideoGenerationReferenceImage] = []
        config_kwargs: dict = {
            "number_of_videos": 1,
            "duration_seconds": settings.veo_duration_seconds,
            "enhance_prompt": False,
            "aspect_ratio": "16:9",
            "output_gcs_uri": settings.video_gcs_uri,
        }

        call_kwargs: dict = {
            "model": selected_model,
            "prompt": final_prompt,
        }

        if first_frame_uri:
            call_kwargs["image"] = types.Image(gcs_uri=first_frame_uri, mime_type="image/png")
        if last_frame_uri:
            # Veo first/last-frame generation exposes last_frame on the generation config.
            config_kwargs["last_frame"] = types.Image(gcs_uri=last_frame_uri, mime_type="image/png")

        if not first_frame_uri:
            for uri in (reference_uris or [])[:3]:
                if uri:
                    refs.append(
                        types.VideoGenerationReferenceImage(
                            image=types.Image(gcs_uri=uri, mime_type="image/png"),
                            reference_type="asset",
                        )
                    )
            if refs:
                config_kwargs["duration_seconds"] = 8
                config_kwargs["reference_images"] = refs

        call_kwargs["config"] = types.GenerateVideosConfig(**config_kwargs)
        operation = studio.client().models.generate_videos(**call_kwargs)

        deadline = time.time() + settings.veo_operation_timeout_seconds
        while not operation.done and time.time() < deadline:
            time.sleep(settings.veo_poll_seconds)
            operation = studio.client().operations.get(operation)
        if not operation.done:
            raise RuntimeError(f"Veo generation exceeded the {settings.veo_operation_timeout_seconds}s operation deadline")
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
            "model": selected_model,
            "durationSeconds": duration,
            "referenceCount": len(refs),
            "firstFrameApplied": bool(first_frame_uri),
            "lastFrameApplied": bool(last_frame_uri),
            "nativeAudio": require_native_audio,
            "spokenLocale": locale,
        }

    def generate(self, title: dict, locale: str = "en-US") -> dict:
        meta = title.get("_cinemind", {})
        prompt = meta.get("teaserPrompt") or f"Original cinematic teaser for {title.get('title')}: {title.get('synopsis')}"
        return self.generate_prompt(prompt, locale=locale, require_native_audio=False)


videos = VideoService()
