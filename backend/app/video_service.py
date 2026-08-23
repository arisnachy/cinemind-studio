from __future__ import annotations

import logging
import random
import threading
import time
from urllib.parse import quote

from google import genai
from google.genai import types

from .config import settings

log = logging.getLogger(__name__)


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
    def __init__(self) -> None:
        self._client = None
        # Worker parallelism and Vertex long-running-operation quota are different
        # resources. Keep a central adaptive gate across every render thread so a
        # burst of prepared shots cannot exceed the base-model LRO quota.
        self._quota_condition = threading.Condition()
        self._active_lros = 0
        self._adaptive_lro_limit = settings.veo_lro_max_inflight
        self._quota_cooldown_until = 0.0
        self._success_streak = 0

    def client(self):
        if self._client is None:
            self._client = genai.Client(vertexai=True, project=settings.project, location=settings.video_location)
        return self._client

    @staticmethod
    def _is_veo3(model: str) -> bool:
        lowered = (model or "").lower()
        return lowered.startswith("veo-3.") or lowered.startswith("veo-3-")

    @staticmethod
    def _is_quota_error(exc: object) -> bool:
        text = str(exc).upper()
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        return (
            code == 429
            or "429" in text
            or "RESOURCE_EXHAUSTED" in text
            or "LONG_RUNNING_ONLINE_PREDICTION_REQUESTS_PER_BASE_MODEL" in text
        )

    @classmethod
    def _validate_request_contract(
        cls,
        *,
        model: str,
        config_kwargs: dict,
        first_frame_uri: str = "",
        reference_count: int = 0,
    ) -> None:
        """Fail locally before any Vertex request when a known Veo contract is invalid.

        Google documents that Veo 3/3.1 prompt rewriting cannot be disabled. The
        service therefore never sends enhance_prompt=False for those models. This
        validator also enforces the duration/reference-image constraints used by
        CINEMIND so an invalid request cannot consume an LRO slot.
        """
        errors: list[str] = []
        duration = int(config_kwargs.get("duration_seconds", settings.veo_duration_seconds))
        if duration not in {4, 6, 8}:
            errors.append(f"duration_seconds={duration} is invalid for Veo 3.x; use 4, 6, or 8")

        if cls._is_veo3(model) and config_kwargs.get("enhance_prompt") is False:
            errors.append("Veo 3/3.1 prompt enhancement cannot be disabled; omit enhance_prompt or leave it enabled")

        if reference_count and duration != 8:
            errors.append("reference-image generation requires an 8-second Veo clip in the CINEMIND pipeline")

        if first_frame_uri and reference_count:
            errors.append("CINEMIND does not combine first-frame mode with asset reference_images in one Veo request")

        if config_kwargs.get("aspect_ratio") not in {"16:9", "9:16"}:
            errors.append("unsupported Veo aspect ratio")

        if errors:
            raise RuntimeError("VEO_CONTRACT_PREFLIGHT_FAILED: " + "; ".join(errors))

    def contract_status(self) -> dict:
        """Zero-spend health status for the request contract CINEMIND will use."""
        checks: dict[str, dict] = {}
        for label, model in (
            ("visual", settings.veo_visual_model),
            ("audio", settings.veo_audio_model),
        ):
            config_kwargs = {
                "number_of_videos": 1,
                "duration_seconds": settings.veo_duration_seconds,
                "aspect_ratio": "16:9",
                "output_gcs_uri": settings.video_gcs_uri or "gs://preflight-only/",
            }
            try:
                self._validate_request_contract(model=model, config_kwargs=config_kwargs)
                # SDK-level schema construction catches renamed/removed fields
                # without making a network request or spending Veo quota.
                types.GenerateVideosConfig(**config_kwargs)
                checks[label] = {
                    "ok": True,
                    "model": model,
                    "promptEnhancement": "managed-by-veo" if self._is_veo3(model) else "default",
                }
            except Exception as exc:
                checks[label] = {"ok": False, "model": model, "error": str(exc)}

        return {
            "ok": all(item.get("ok") for item in checks.values()),
            "checks": checks,
            "location": settings.video_location,
            "durationSeconds": settings.veo_duration_seconds,
        }

    def _quota_backoff(self, attempt: int) -> float:
        base = min(
            settings.veo_retry_max_seconds,
            settings.veo_retry_base_seconds * (2 ** max(0, attempt - 1)),
        )
        return base + random.uniform(0.0, max(1.0, base * 0.30))

    def _acquire_lro_slot(self) -> int:
        with self._quota_condition:
            while True:
                now = time.time()
                cooldown = max(0.0, self._quota_cooldown_until - now)
                if cooldown <= 0 and self._active_lros < self._adaptive_lro_limit:
                    self._active_lros += 1
                    return self._adaptive_lro_limit
                self._quota_condition.wait(timeout=max(0.5, min(5.0, cooldown if cooldown > 0 else 2.0)))

    def _release_lro_slot(self, *, success: bool) -> None:
        with self._quota_condition:
            self._active_lros = max(0, self._active_lros - 1)
            if success:
                self._success_streak += 1
                if (
                    self._success_streak >= settings.veo_successes_before_probe
                    and self._adaptive_lro_limit < settings.veo_lro_max_inflight
                ):
                    self._adaptive_lro_limit += 1
                    self._success_streak = 0
                    log.info("Veo LRO controller cautiously increased limit to %d", self._adaptive_lro_limit)
            self._quota_condition.notify_all()

    def _penalize_quota(self, delay: float, model: str) -> None:
        with self._quota_condition:
            self._active_lros = max(0, self._active_lros - 1)
            previous = self._adaptive_lro_limit
            self._adaptive_lro_limit = max(1, self._adaptive_lro_limit - 1)
            self._success_streak = 0
            self._quota_cooldown_until = max(self._quota_cooldown_until, time.time() + delay)
            log.warning(
                "Veo LRO quota pressure on %s: adaptive limit %d -> %d; cooldown %.1fs",
                model,
                previous,
                self._adaptive_lro_limit,
                delay,
            )
            self._quota_condition.notify_all()

    def quota_status(self) -> dict:
        with self._quota_condition:
            return {
                "workerConcurrency": settings.veo_max_concurrency,
                "configuredLroMaxInflight": settings.veo_lro_max_inflight,
                "adaptiveLroLimit": self._adaptive_lro_limit,
                "activeLros": self._active_lros,
                "quotaCooldownSeconds": round(max(0.0, self._quota_cooldown_until - time.time()), 1),
            }

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
            continuity_instruction = "Use supplied asset references as immutable identity and production-design anchors. "

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
            # IMPORTANT: Veo 3/3.1 does not permit disabling prompt enhancement.
            # Do not send enhance_prompt=False. Omitting it leaves Google's required
            # prompt rewriter enabled and avoids a deterministic server-side failure.
            "aspect_ratio": "16:9",
            "output_gcs_uri": settings.video_gcs_uri,
        }
        call_kwargs: dict = {"model": selected_model, "prompt": final_prompt}

        if first_frame_uri:
            call_kwargs["image"] = types.Image(gcs_uri=first_frame_uri, mime_type="image/png")
        if last_frame_uri:
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

        # Zero-spend local gate before acquiring an LRO slot or making any request.
        self._validate_request_contract(
            model=selected_model,
            config_kwargs=config_kwargs,
            first_frame_uri=first_frame_uri,
            reference_count=len(refs),
        )
        call_kwargs["config"] = types.GenerateVideosConfig(**config_kwargs)
        client = self.client()
        last_quota_error: object | None = None

        for attempt in range(1, settings.veo_submit_retry_attempts + 1):
            acquired_limit = self._acquire_lro_slot()
            slot_owned = True
            log.info(
                "Submitting Veo shot to %s (attempt %d/%d, active gate limit=%d)",
                selected_model,
                attempt,
                settings.veo_submit_retry_attempts,
                acquired_limit,
            )
            try:
                try:
                    operation = client.models.generate_videos(**call_kwargs)
                except Exception as exc:
                    if self._is_quota_error(exc):
                        last_quota_error = exc
                        delay = self._quota_backoff(attempt)
                        self._penalize_quota(delay, selected_model)
                        slot_owned = False
                        if attempt < settings.veo_submit_retry_attempts:
                            continue
                        break
                    raise

                deadline = time.time() + settings.veo_operation_timeout_seconds
                while not operation.done and time.time() < deadline:
                    time.sleep(settings.veo_poll_seconds)
                    operation = client.operations.get(operation)
                if not operation.done:
                    raise RuntimeError(f"Veo generation exceeded the {settings.veo_operation_timeout_seconds}s operation deadline")
                if operation.error:
                    error = RuntimeError(f"Veo generation failed: {operation.error}")
                    if self._is_quota_error(error):
                        last_quota_error = error
                        delay = self._quota_backoff(attempt)
                        self._penalize_quota(delay, selected_model)
                        slot_owned = False
                        if attempt < settings.veo_submit_retry_attempts:
                            continue
                        break
                    raise error

                generated = (operation.response.generated_videos if operation.response else []) or []
                if not generated:
                    raise RuntimeError("Veo completed without a generated video")

                uri = generated[0].video.uri
                duration = int(config_kwargs["duration_seconds"])
                self._release_lro_slot(success=True)
                slot_owned = False
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
                    "quotaAttempts": attempt,
                }
            finally:
                if slot_owned:
                    self._release_lro_slot(success=False)

        raise RuntimeError(
            "VEO_QUOTA_EXHAUSTED: Vertex AI kept rejecting long-running Veo operations after "
            f"{settings.veo_submit_retry_attempts} adaptive attempts. Some already-finished Veo objects may remain in GCS, "
            "but this job cannot assemble a complete master until the missing shot obtains an LRO slot. "
            "Reduce VEO_LRO_MAX_INFLIGHT or request a quota increase. "
            f"Last error: {last_quota_error}"
        )

    def generate(self, title: dict, locale: str = "en-US") -> dict:
        meta = title.get("_cinemind", {})
        prompt = meta.get("teaserPrompt") or f"Original cinematic teaser for {title.get('title')}: {title.get('synopsis')}"
        return self.generate_prompt(prompt, locale=locale, require_native_audio=False)


videos = VideoService()
