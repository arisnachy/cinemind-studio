from __future__ import annotations
import base64
import logging
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
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
        object_name = "/".join(x for x in [base_prefix.rstrip('/'), "reality-pack", f"{safe}-{uuid.uuid4().hex[:8]}.{ext}"] if x)
        blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
        blob.upload_from_string(raw, content_type=mime_type)
        return f"gs://{bucket_name}/{object_name}"

    @staticmethod
    def _character_prompt(character: dict) -> str:
        return (
            "LIVE-ACTION PHOTOREALISTIC CAST REFERENCE. This is a neutral production identity photograph, NOT a poster, "
            "not concept art, not fashion advertising, not CGI. One original fictional adult person only. "
            f"Character: {character.get('name')}. Role: {character.get('role')}. "
            f"Canonical physical identity: {character.get('visualDescriptor')}. "
            "Three-quarter body reference with face clearly visible, relaxed neutral expression, natural skin texture with pores and small imperfections, "
            "physically plausible anatomy, realistic hair strands, exact practical wardrobe, neutral daylight-balanced soft illumination, 50mm documentary lens, "
            "minimal color grade, ordinary believable background, no beauty filter, no glamour pose, no text, no logos, no extra people, no real actor likeness."
        )

    @staticmethod
    def _environment_prompt(title: dict) -> str:
        meta = title.get("_cinemind", {}) or {}
        first_episode = (title.get("episodes") or [{}])[0]
        return (
            "LIVE-ACTION PHOTOREALISTIC LOCATION REFERENCE for a grounded premium television production. "
            "This must look like a real place a film crew could physically enter, NOT concept art, not a game environment, not glossy sci-fi CGI. "
            f"Series premise: {title.get('synopsis', '')}. "
            f"Episode director notes: {first_episode.get('directorNotes', '')}. "
            f"Location design brief: {meta.get('backdropPrompt', '')}. "
            "Wide eye-level production still, 28mm lens, plausible architecture and object placement, practical lighting, real-world materials with wear, "
            "subtle clutter appropriate to the location, physically correct reflections and shadows, restrained color grade, no people, no text, no logos."
        )

    def build_for_title(self, title: dict) -> list[str]:
        """Create a dedicated photoreal Reality Pack for continuity.

        Do not reuse marketing artwork as character identity. Generate neutral cast and
        location references, because neutral references preserve identity and realism
        much better across changes in angle, action and lighting.
        """
        if not settings.enable_images or not settings.video_gcs_uri:
            raise RuntimeError("Continuity Lock requires image generation and a writable GCS media bucket")

        cast = title.get("cast", []) or []
        if not cast:
            raise RuntimeError("CONTINUITY_LOCK_UNAVAILABLE: title has no locked cast")
        meta = title.get("_cinemind", {}) or {}

        requests: list[tuple[str, str, str, dict | None]] = []
        # Two principals + one environment fit Veo's three-reference budget.
        for index, character in enumerate(cast[:2]):
            requests.append((f"character-{index}", self._character_prompt(character), "3:4", character))
        requests.append(("primary-location", self._environment_prompt(title), "16:9", None))

        generated: dict[str, str] = {}
        # Reality Pack shares the same quota-aware lane as all Gemini Image work.
        # The expensive Veo stage remains highly parallel; image calls are throttled
        # so a brief burst cannot starve the storyboard with RESOURCE_EXHAUSTED.
        workers = min(settings.image_max_concurrency, len(requests))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(studio.generate_image_data_url, prompt, aspect): (label, character)
                for label, prompt, aspect, character in requests
            }
            for future in as_completed(futures):
                label, character = futures[future]
                try:
                    data_url = future.result()
                    uri = self._upload_data_url(data_url, label)
                except Exception as exc:
                    log.warning("Reality Pack generation failed for %s: %s", label, exc)
                    uri = ""
                if uri:
                    generated[label] = uri
                    if character is not None:
                        character["referenceImageUri"] = uri

        refs: list[str] = []
        for index in range(min(2, len(cast))):
            uri = generated.get(f"character-{index}", "")
            if uri:
                refs.append(uri)
        location_uri = generated.get("primary-location", "")
        if location_uri:
            refs.append(location_uri)
            meta["locationReferenceUri"] = location_uri

        if refs:
            meta["protagonistReferenceUri"] = refs[0]
        meta["realityPack"] = {
            "characterReferences": [x for x in refs if x != location_uri],
            "locationReference": location_uri,
            "photorealistic": True,
            "imageConcurrency": workers,
        }
        title["_cinemind"] = meta
        refs = refs[:3]
        log.info("Reality Pack created %d continuity references with image concurrency=%d", len(refs), workers)

        if len(refs) < 2:
            raise RuntimeError(
                "CONTINUITY_LOCK_UNAVAILABLE: fewer than two dedicated Reality Pack anchors were available. "
                "CINEMIND will not spend Veo credits on an identity-unstable production."
            )
        return refs


references = ReferenceService()
