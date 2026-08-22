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
        """Create up to three canonical asset references for Veo.

        Veo 3.1 accepts 1-3 asset images. We prioritize the two lead characters
        and one master location/style frame so every shot shares the same visual DNA.
        """
        if not settings.enable_images or not settings.video_gcs_uri:
            return []
        refs: list[str] = []
        cast = title.get("cast", []) or []
        for character in cast[:2]:
            prompt = (
                "Original fictional adult character reference image for a premium cinematic series. "
                f"Character name: {character.get('name')}. Role: {character.get('role')}. "
                f"Canonical appearance: {character.get('visualDescriptor')}. "
                "Neutral three-quarter full-body pose, face clearly visible, single consistent wardrobe, "
                "production concept-art realism, natural skin texture, clean unobtrusive background, 16:9 crop-safe. "
                "No text, no logos, no real actor likeness, no copyrighted character resemblance."
            )
            data_url = studio.generate_image_data_url(prompt, "16:9")
            uri = self._upload_data_url(data_url, f"character-{character.get('name','lead')}")
            if uri:
                refs.append(uri)
                character["referenceImageUri"] = uri

        if len(refs) < 3:
            meta = title.get("_cinemind", {}) or {}
            premise = meta.get("universePremise") or title.get("synopsis", "")
            location_prompt = (
                "Original master location reference frame for a premium cinematic television series. "
                f"Universe: {title.get('universeName')}. Story premise: {premise}. "
                f"Genres: {', '.join(title.get('genres', [])[:3])}. Tones: {', '.join(title.get('tones', [])[:3])}. "
                "Establish a distinctive primary location, consistent architecture, color palette, practical lighting, "
                "production design and camera texture that can be reused across shots. Empty set, no people, no text, no logos."
            )
            data_url = studio.generate_image_data_url(location_prompt, "16:9")
            uri = self._upload_data_url(data_url, "master-location")
            if uri:
                refs.append(uri)
                meta["locationReferenceUri"] = uri
                title["_cinemind"] = meta

        log.info("Continuity lock created %d Veo asset references", len(refs))
        return refs[:3]

references = ReferenceService()
