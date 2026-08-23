from __future__ import annotations
import base64
import logging
import random
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from google import genai
from google.genai import types
from .adk_runtime import run_creative_room
from .config import settings
from .schemas import GenerateTitleRequest, StudioBlueprint

log = logging.getLogger(__name__)


class GeminiStudio:
    def __init__(self) -> None:
        self._client = None

    @property
    def ready(self) -> bool:
        return settings.google_ready

    def client(self):
        if not self.ready:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT is not configured")
        if self._client is None:
            self._client = genai.Client(vertexai=True, project=settings.project, location=settings.location)
        return self._client

    async def generate_blueprint(self, req: GenerateTitleRequest) -> tuple[StudioBlueprint, str]:
        room_prompt = f"""
Viewer: {req.profile.name}
Top genres: {', '.join(req.profile.topGenres)}
Narrative pacing: {req.profile.narrativePacing}
Current obsession: {req.profile.currentObsession}
Requested format: {req.format}
Primary genre: {req.genre}
Mood: {req.mood}
Complexity: {req.intensity}/100
Existing universe id: {req.universeId or 'new universe'}
Viewer locale: {req.locale}
Director brief: {req.prompt or 'Autonomously invent the strongest original concept for this viewer.'}

Use ClickHouse narrative memory when available. Develop an original concept and have the specialist agents challenge it for character depth, causal plotting, continuity and producibility.
""".strip()
        room_memo = ""
        try:
            room_memo = await run_creative_room(room_prompt, req.profile.id)
        except Exception as exc:
            log.warning("ADK creative room unavailable; continuing with Gemini structured generation: %s", exc)

        schema_prompt = f"""
You are the final publishing editor and head writer for CINEMIND Studio, an AI-native premium streaming service.
Create an entirely original {req.format}. Do not reference or imitate existing franchises, performers, studios, trademarks, or copyrighted characters.

DIRECTOR REQUEST:
{room_prompt}

MULTI-AGENT CREATIVE ROOM MEMO:
{room_memo or 'No memo was available; create the concept directly while preserving originality.'}

LANGUAGE:
- All user-facing creative text MUST be natural for locale {req.locale}.
- backdropPrompt, posterPrompt and teaserPrompt MUST remain in English for Google visual/video generation.

QUALITY CONTRACT:
- Choose ONE unmistakable protagonist with a concrete external objective and internal pressure.
- The core premise must be explainable in one sentence and create repeatable episode conflict.
- Characters must have distinct motivations, knowledge states and relationships that create dramatic friction.
- visualDescriptor for every major character is an IMMUTABLE identity anchor: adult age range, facial structure, skin tone, hair, build, practical wardrobe and one signature prop/detail. Avoid vague adjectives and glamour descriptions.
- voiceDescriptor for every speaking character is an IMMUTABLE performance anchor written in English: perceived adult age, vocal register, timbre, cadence/accent appropriate to locale {req.locale}, emotional restraint and speaking style. Never name or imitate a real performer.
- Poster/backdrop are MARKETING ART ONLY; continuity will use a separate Reality Pack. They must still be live-action photorealistic: plausible anatomy, natural skin texture, real-world materials, practical lighting, no glossy CGI or game-render look.
- The season must have escalation, not unrelated premises.
- Episode 1 MUST work as a real pilot: establish place/time and protagonist BEFORE the disturbance; normal objective → inciting incident → consequential reaction → reveal → cliffhanger. Every beat is causally connected.
- Episode synopses describe actions and consequences, not mood, symbolism or trailer language.
- directorNotes for Episode 1 state primary location, protagonist wardrobe, lighting/time of day, key prop, opening normal-world action, and exact dramatic reveal.
- Prefer 2-4 recurring primary locations and a manageable cast so video continuity is achievable.
- Avoid dream imagery, random glitches, mysterious silhouettes, abstract cosmic imagery, generic cyberpunk neon and unexplained creatures unless the premise explicitly requires them.
- If series: produce 4-6 episode outlines. If movie: produce 3 causally connected chapter segments.
- canonFacts must be atomic facts that can be stored and queried later.
- whyCreated must use only supplied taste signals.
- teaserPrompt describes a concrete story moment, not an abstract montage.
""".strip()

        errors: list[str] = []
        attempts = [
            types.GenerateContentConfig(response_mime_type="application/json", response_schema=StudioBlueprint, temperature=0.32),
            types.GenerateContentConfig(response_mime_type="application/json", response_schema=StudioBlueprint, temperature=0.16),
        ]
        for index, config in enumerate(attempts, start=1):
            try:
                response = self.client().models.generate_content(model=settings.text_model, contents=schema_prompt, config=config)
                if isinstance(response.parsed, StudioBlueprint):
                    return response.parsed, room_memo
                text = (response.text or "").strip()
                if not text:
                    raise RuntimeError("Gemini returned an empty structured response")
                return StudioBlueprint.model_validate_json(text), room_memo
            except Exception as exc:
                message = f"attempt {index}: {exc.__class__.__name__}: {exc}"
                errors.append(message)
                log.warning("Structured blueprint generation %s", message)

        fallback_prompt = schema_prompt + """

Return ONLY one valid JSON object with these exact top-level keys:
universeName, universePremise, title, tagline, synopsis, rating, genres, tones,
canonStatus, characters, episodes, whyCreated, canonFacts, backdropPrompt,
posterPrompt, teaserPrompt. Do not use markdown fences.
"""
        try:
            response = self.client().models.generate_content(
                model=settings.text_model,
                contents=fallback_prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.10),
            )
            text = (response.text or "").strip()
            if not text:
                raise RuntimeError("Gemini returned an empty JSON fallback response")
            return StudioBlueprint.model_validate_json(text), room_memo
        except Exception as exc:
            errors.append(f"fallback: {exc.__class__.__name__}: {exc}")
            raise RuntimeError("Blueprint generation failed after retries. " + " | ".join(errors)) from exc

    @staticmethod
    def _is_quota_error(exc: Exception) -> bool:
        text = str(exc).upper()
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        return code == 429 or "429" in text or "RESOURCE_EXHAUSTED" in text

    def generate_image_data_url(self, prompt: str, aspect_ratio: str) -> str:
        if not settings.enable_images:
            return ""

        models = [settings.image_model]
        if settings.image_fallback_model and settings.image_fallback_model not in models:
            models.append(settings.image_fallback_model)

        last_error: Exception | None = None
        for attempt in range(1, settings.image_retry_attempts + 1):
            quota_seen = False
            for model in models:
                try:
                    response = self.client().models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_modalities=["IMAGE"],
                            image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
                        ),
                    )
                    for candidate in response.candidates or []:
                        if not candidate.content:
                            continue
                        for part in candidate.content.parts or []:
                            if part.inline_data and part.inline_data.data:
                                mime = part.inline_data.mime_type or "image/png"
                                raw = part.inline_data.data
                                encoded = base64.b64encode(raw).decode("ascii") if isinstance(raw, bytes) else str(raw)
                                return f"data:{mime};base64,{encoded}"
                    last_error = RuntimeError(f"Image model {model} returned no image")
                except Exception as exc:
                    last_error = exc
                    if self._is_quota_error(exc):
                        quota_seen = True
                        log.warning(
                            "Gemini image quota hit on %s (attempt %d/%d)",
                            model,
                            attempt,
                            settings.image_retry_attempts,
                        )
                    else:
                        log.warning("Gemini image generation failed on %s: %s", model, exc)

            if attempt < settings.image_retry_attempts:
                base = min(
                    settings.image_retry_max_seconds,
                    settings.image_retry_base_seconds * (2 ** (attempt - 1)),
                )
                delay = base + random.uniform(0.0, max(1.0, base * 0.35))
                log.info(
                    "Waiting %.1fs before Gemini image retry (%s)",
                    delay,
                    "quota recovery" if quota_seen else "model fallback",
                )
                time.sleep(delay)

        log.warning("Gemini image generation exhausted retries: %s", last_error)
        return ""

    def to_title(self, req: GenerateTitleRequest, bp: StudioBlueprint) -> dict:
        generated_id = f"title-{uuid.uuid4().hex[:12]}"
        universe_id = req.universeId if req.universeId and req.universeId != "new" else f"univ-{uuid.uuid4().hex[:10]}"

        # Marketing art is low priority. Use the same quota-aware image lane instead
        # of bursting poster + backdrop concurrently and starving the Reality Pack.
        with ThreadPoolExecutor(max_workers=min(settings.image_max_concurrency, 2)) as pool:
            backdrop_future = pool.submit(self.generate_image_data_url, bp.backdropPrompt, "16:9")
            poster_future = pool.submit(self.generate_image_data_url, bp.posterPrompt, "3:4")
            backdrop = backdrop_future.result()
            poster = poster_future.result()

        chars = []
        for c in bp.characters:
            chars.append({
                "id": f"char-{uuid.uuid4().hex[:10]}", "universeId": universe_id, "name": c.name,
                "role": c.role, "visualDescriptor": c.visualDescriptor, "voiceDescriptor": c.voiceDescriptor,
                "motivation": c.motivation, "relationships": c.relationships, "knowledgeState": c.knowledgeState,
                "avatarUrl": "", "status": c.status,
            })
        episodes = []
        for index, ep in enumerate(bp.episodes, start=1):
            episodes.append({
                "id": f"ep-{uuid.uuid4().hex[:10]}", "titleId": generated_id, "seasonNumber": 1,
                "episodeNumber": index, "title": ep.title, "synopsis": ep.synopsis,
                "durationMinutes": ep.durationMinutes, "thumbnailUrl": backdrop, "status": "Writing",
                "watchedPercentage": 0, "releaseDate": "Generated now", "directorNotes": ep.directorNotes,
            })
        return {
            "id": generated_id,
            "universeId": universe_id,
            "universeName": bp.universeName,
            "title": bp.title,
            "tagline": bp.tagline,
            "synopsis": bp.synopsis,
            "type": req.format,
            "releaseYear": datetime.utcnow().year,
            "rating": bp.rating,
            "duration": f"1 Season · {len(episodes)} Episodes" if req.format == "series" else f"{sum(e['durationMinutes'] for e in episodes)} min",
            "totalSeasons": 1 if req.format == "series" else None,
            "matchScore": min(99, 88 + round(req.intensity / 10)),
            "genres": list(dict.fromkeys([req.genre, *bp.genres]))[:4],
            "tones": list(dict.fromkeys([req.mood, *bp.tones]))[:4],
            "badges": ["Gemini Generated", "Reality Pack", "Created For You"],
            "backdropUrl": backdrop,
            "posterUrl": poster or backdrop,
            "logoText": "CINEMIND ORIGINAL",
            "canonStatus": bp.canonStatus,
            "whyCreated": [x.model_dump() for x in bp.whyCreated],
            "cast": chars,
            "episodes": episodes,
            "hasGeneratedVideo": False,
            "videoPreviewUrl": "",
            "_cinemind": {
                "canonFacts": bp.canonFacts,
                "universePremise": bp.universePremise,
                "backdropPrompt": bp.backdropPrompt,
                "posterPrompt": bp.posterPrompt,
                "teaserPrompt": bp.teaserPrompt,
                "locale": req.locale,
                "generatedBy": settings.text_model,
            },
        }


studio = GeminiStudio()
