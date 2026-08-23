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
    ) -> dict:
        if not settings.enable_video:
            raise RuntimeError("Video generation is disabled. Set CINEMIND_ENABLE_VIDEO_GENERATION=true when you want to spend Veo credits.")
        if not settings.video_gcs_uri:
            raise RuntimeError("CINEMIND_VIDEO_GCS_URI must point to a writable gs:// bucket prefix")

        language = _spoken_language(locale)
        if dialogue.strip():
            speaker = dialogue_speaker.strip() or "the visible speaking character"
            voice = voice_descriptor.strip() or f"natural adult voice appropriate to {language}, restrained premium-drama delivery"
            audio_direction = (
                "\nNATIVE AUDIO DIRECTION: Generate synchronized production audio in the SAME pass as the picture. "
                f"The character {speaker} speaks exactly this line in {language}: \"{dialogue.strip()}\". "
                f"VOICE IDENTITY FOR {speaker}: {voice}. Preserve this vocal identity across the series. "
                "Lip movement must match the spoken line naturally. Do not translate, paraphrase, add English, add another speaker, or invent extra words. "
                "Keep environmental ambience realistic and subordinate to the dialogue. No narrator unless explicitly requested. "
            )
        elif narration.strip():
            voice = voice_descriptor.strip() or f"restrained premium-drama narrator speaking {language}"
            audio_direction = (
                "\nNATIVE AUDIO DIRECTION: Generate synchronized production audio in the SAME pass as the picture. "
                f"A single off-screen narrator says exactly this line in {language}: \"{narration.strip()}\". "
                f"NARRATOR VOICE IDENTITY: {voice}. Do not translate, paraphrase, add English, or add other speech. "
                "Keep environmental ambience subtle under the narration. "
            )
        else:
            audio_direction = (
                "\nNATIVE AUDIO DIRECTION: Generate only realistic diegetic environmental sound for the visible action. "
                "No dialogue, narration, intelligible speech, whispers, moans, random breathing, filler vocalizations, singing, or off-screen voices. "
            )

        if first_frame_uri:
            continuity_instruction = (
                "The supplied first frame is the exact final visual state of the previous shot. "
                "Continue from it immediately: same people, faces, hair, wardrobe, props, geography, lighting, screen direction and dramatic action. "
                "Do not reset poses, re-establish the location, or jump forward in story time. "
            )
        else:
            continuity_instruction = (
                "Use the supplied asset references as immutable identity and production-design anchors. "
                "Preserve facial structure, hair, age, wardrobe, props, geography, lighting direction and lens family. "
            )

        final_prompt = (
            f"{prompt.strip()}\n"
            "PREMIUM SCRIPTED-SERIES DIRECTION: This is one shot from the OPENING of a coherent television episode, not a trailer montage and not an isolated AI clip. "
            f"{continuity_instruction}"
            "The visible action must begin where the prior story beat logically leaves off. Use natural human blocking and believable eyelines. "
            "Do not introduce new characters, props or locations unless explicitly directed. Avoid random symbolic imagery and montage logic. "
            "This is an original CINEMIND production. No real actors, copyrighted characters, logos, or franchise visual identity. "
            f"{audio_direction}"
        )

        refs: list[types.VideoGenerationReferenceImage] = []
        config_kwargs: dict = {
            "number_of_videos": 1,
            "duration_seconds": settings.veo_duration_seconds,
            # We already construct a detailed cinematic + exact-dialogue prompt.
            # Keeping enhancement off reduces unwanted rewrites/translation of speech.
            "enhance_prompt": False,
            "aspect_ratio": "16:9",
            "output_gcs_uri": settings.video_gcs_uri,
        }

        call_kwargs: dict = {
            "model": settings.veo_model,
            "prompt": final_prompt,
        }

        if first_frame_uri:
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
            "nativeAudio": True,
            "spokenLocale": locale,
        }

    def generate(self, title: dict, locale: str = "en-US") -> dict:
        meta = title.get("_cinemind", {})
        prompt = meta.get("teaserPrompt") or f"Original cinematic teaser for {title.get('title')}: {title.get('synopsis')}"
        return self.generate_prompt(prompt, locale=locale)


videos = VideoService()
