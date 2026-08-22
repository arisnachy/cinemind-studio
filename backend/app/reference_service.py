from __future__ import annotations
import base64
import logging
import re
import uuid
from google.cloud import storage
from .config import settings
from .gemini_service import studio

log = logging.getLogger(__name__)

class ReferenceService:
    def _upload_data_url(self, data_url: str, label: str) -> str:
        if not data_url or not settings.video_gcs_uri:
            return ""
        match = re.match(r"data:(image/[^;]+);base64,(.+)", data_url, re.DOTALL)
        if not match:
            return ""
        mime_type, payload = match.groups()
        raw = base64.b64decode(payload)
        prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
        bucket_name, _, base_prefix = prefix.partition("/")
        ext = "png" if "png" in mime_type else "jpg"
        safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-").lower() or "reference"
        object_name = "/".join(x for x in [base_prefix.rstrip('/'), "references", f"{safe}-{uuid.uuid4().hex[:8]}.{ext}"] if x)
        blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
        blob.upload_from_string(raw, content_type=mime_type)
        return f"gs://{bucket_name}/{object_name}"

    def build_for_title(self, title: dict) -> list[str]:
        """Build a quota-efficient continuity lock for Veo.

        Reuse the key art that CINEMIND already generated before video production:
        poster = protagonist identity anchor, backdrop = primary-location anchor.
        Only attempt an additional dedicated character image if quota allows.
        Production fails closed if fewer than two useful anchors exist.
        """
        if not settings.enable_images or not settings.video_gcs_uri:
            raise RuntimeError("Continuity Lock requires image generation and a writable GCS media bucket")

        refs: list[str] = []
        cast = title.get("cast", []) or []
        meta = title.get("_cinemind", {}) or {}

        # 1) Reuse already-generated protagonist-oriented poster.
        poster_uri = self._upload_data_url(title.get("posterUrl", ""), "protagonist-master")
        if poster_uri:
            refs.append(poster_uri)
            if cast:
                cast[0]["referenceImageUri"] = poster_uri
            meta["protagonistReferenceUri"] = poster_uri

        # 2) Reuse already-generated location/style backdrop.
        backdrop_uri = self._upload_data_url(title.get("backdropUrl", ""), "location-master")
        if backdrop_uri and backdrop_uri not in refs:
            refs.append(backdrop_uri)
            meta["locationReferenceUri"] = backdrop_uri

        # 3) Optional second speaking character. This is the only extra image request
        # during continuity setup, avoiding the 3-request burst that exhausted quota.
        if len(refs) < 3 and len(cast) > 1:
            character = cast[1]
            prompt = (
                "Original fictional adult character identity reference for a premium scripted television series. "
                f"Character name: {character.get('name')}. Role: {character.get('role')}. "
                f"Canonical appearance: {character.get('visualDescriptor')}. "
                "Clear face, three-quarter body, exact stable wardrobe, neutral practical lighting, realistic production reference. "
                "No text, logos, real actor likeness, franchise resemblance, montage, or extra people."
            )
            data_url = studio.generate_image_data_url(prompt, "16:9")
            uri = self._upload_data_url(data_url, f"character-{character.get('name','second-lead')}")
            if uri:
                refs.append(uri)
                character["referenceImageUri"] = uri

        title["_cinemind"] = meta
        refs = refs[:3]
        log.info("Continuity lock created %d Veo asset references", len(refs))

        if len(refs) < 2:
            raise RuntimeError(
                "CONTINUITY_LOCK_UNAVAILABLE: fewer than two visual anchors were available. "
                "CINEMIND will not spend Veo credits on an identity-unstable production. "
                "Wait for Gemini image quota to recover and retry."
            )
        return refs

references = ReferenceService()
