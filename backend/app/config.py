from __future__ import annotations
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def truthy(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    value = int(os.getenv(name, str(default)))
    return max(minimum, min(maximum, value))


def veo_duration() -> int:
    value = int(os.getenv("VEO_DURATION_SECONDS", "8"))
    if value not in {4, 6, 8}:
        raise ValueError("VEO_DURATION_SECONDS must be one of 4, 6, or 8")
    return value


@dataclass(frozen=True)
class Settings:
    project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    video_location: str = os.getenv("VEO_LOCATION", "us-central1")

    text_model: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-3.6-flash")
    quality_model: str = os.getenv("GEMINI_QUALITY_MODEL", "gemini-3.5-flash")
    image_model: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
    image_fallback_model: str = os.getenv("GEMINI_IMAGE_FALLBACK_MODEL", "gemini-2.5-flash-image")
    # Image generation is intentionally throttled separately from Veo. Keyframes
    # are quick compared with video, and bursting them caused Vertex 429s.
    image_max_concurrency: int = bounded_int("GEMINI_IMAGE_MAX_CONCURRENCY", 1, 1, 4)
    image_retry_attempts: int = bounded_int("GEMINI_IMAGE_RETRY_ATTEMPTS", 5, 1, 8)
    image_retry_base_seconds: int = bounded_int("GEMINI_IMAGE_RETRY_BASE_SECONDS", 4, 1, 30)
    image_retry_max_seconds: int = bounded_int("GEMINI_IMAGE_RETRY_MAX_SECONDS", 45, 5, 120)

    tts_model: str = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
    tts_voice: str = os.getenv("GEMINI_TTS_VOICE", "Kore")
    enable_tts: bool = truthy("CINEMIND_ENABLE_TTS", False)

    # Veo 3.1 Fast is the low-latency reference-capable visual renderer.
    # Veo 3.1 Lite is configurable as the native-audio renderer. Google Cloud's
    # current model table exposes sound generation on Lite while the Fast/Generate
    # rows can vary by surface/rollout, so CINEMIND does not hard-code one assumption.
    veo_model: str = os.getenv("VEO_MODEL", "veo-3.1-fast-generate-001")
    veo_visual_model: str = os.getenv("VEO_VISUAL_MODEL", os.getenv("VEO_MODEL", "veo-3.1-fast-generate-001"))
    veo_audio_model: str = os.getenv("VEO_AUDIO_MODEL", "veo-3.1-lite-generate-001")
    veo_duration_seconds: int = veo_duration()
    veo_poll_seconds: int = bounded_int("VEO_POLL_SECONDS", 5, 2, 30)

    # VEO_MAX_CONCURRENCY controls local shot workers, not active Vertex LROs.
    # Vertex has a separate long_running_online_prediction_requests_per_base_model
    # quota. Keep a smaller adaptive in-flight window so worker parallelism cannot
    # stampede that quota. The controller can reduce this at runtime after a 429.
    veo_max_concurrency: int = bounded_int("VEO_MAX_CONCURRENCY", 6, 1, 16)
    veo_lro_max_inflight: int = bounded_int("VEO_LRO_MAX_INFLIGHT", 2, 1, 8)
    veo_submit_retry_attempts: int = bounded_int("VEO_SUBMIT_RETRY_ATTEMPTS", 8, 1, 12)
    veo_retry_base_seconds: int = bounded_int("VEO_RETRY_BASE_SECONDS", 8, 2, 60)
    veo_retry_max_seconds: int = bounded_int("VEO_RETRY_MAX_SECONDS", 90, 10, 300)
    veo_successes_before_probe: int = bounded_int("VEO_SUCCESSES_BEFORE_PROBE", 4, 2, 20)
    veo_operation_timeout_seconds: int = bounded_int("VEO_OPERATION_TIMEOUT_SECONDS", 900, 120, 1800)

    enable_images: bool = truthy("CINEMIND_ENABLE_IMAGE_GENERATION", True)
    enable_video: bool = truthy("CINEMIND_ENABLE_VIDEO_GENERATION", False)
    enable_quality_gate: bool = truthy("CINEMIND_ENABLE_QUALITY_GATE", True)
    video_gcs_uri: str = os.getenv("CINEMIND_VIDEO_GCS_URI", "")

    # Short cuts can still be produced in one foreground request. Long-form uses
    # the production-job API and is divided into bounded shot/scene work units.
    sync_preview_max_seconds: int = bounded_int("CINEMIND_SYNC_PREVIEW_MAX_SECONDS", 96, 24, 300)
    long_form_max_seconds: int = bounded_int("CINEMIND_LONG_FORM_MAX_SECONDS", 1800, 300, 3600)
    production_max_parallel_scenes: int = bounded_int("CINEMIND_MAX_PARALLEL_SCENES", 3, 1, 8)

    clickhouse_host: str = os.getenv("CLICKHOUSE_HOST", "")
    clickhouse_port: int = int(os.getenv("CLICKHOUSE_PORT", "8443"))
    clickhouse_user: str = os.getenv("CLICKHOUSE_USER", "")
    clickhouse_password: str = os.getenv("CLICKHOUSE_PASSWORD", "")
    clickhouse_database: str = os.getenv("CLICKHOUSE_DATABASE", "default")
    clickhouse_secure: bool = truthy("CLICKHOUSE_SECURE", True)
    clickhouse_verify: bool = truthy("CLICKHOUSE_VERIFY", True)
    clickhouse_allow_write: bool = truthy("CLICKHOUSE_ALLOW_WRITE_ACCESS", False)
    clickhouse_bootstrap: bool = truthy("CLICKHOUSE_BOOTSTRAP_SCHEMA", True)

    @property
    def google_ready(self) -> bool:
        return bool(self.project)

    @property
    def clickhouse_ready(self) -> bool:
        return bool(self.clickhouse_host and self.clickhouse_user)


settings = Settings()
