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


def veo_duration() -> int:
    value = int(os.getenv("VEO_DURATION_SECONDS", "8"))
    if value not in {4, 6, 8}:
        raise ValueError("VEO_DURATION_SECONDS must be one of 4, 6, or 8")
    return value

@dataclass(frozen=True)
class Settings:
    project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    text_model: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-3.6-flash")
    image_model: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    veo_model: str = os.getenv("VEO_MODEL", "veo-3.1-fast-generate-001")
    veo_duration_seconds: int = veo_duration()
    enable_images: bool = truthy("CINEMIND_ENABLE_IMAGE_GENERATION", True)
    enable_video: bool = truthy("CINEMIND_ENABLE_VIDEO_GENERATION", False)
    video_gcs_uri: str = os.getenv("CINEMIND_VIDEO_GCS_URI", "")
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
