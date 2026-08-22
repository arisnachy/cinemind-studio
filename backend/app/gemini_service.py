from __future__ import annotations
import base64
import logging
import uuid
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

Use ClickHouse narrative memory when available. Develop an original concept and have the specialist agents challenge it for character depth and continuity.
""".strip()
        room_memo = ""
        try:
            room_memo = await run_creative_room(room_prompt, req.profile.id)
        except Exception as exc:
            log.warning("ADK creative room unavailable; continuing with Gemini structured generation: %s", exc)

        schema_prompt = f"""
You are the final publishing editor for CINEMIND Studio, an AI-native streaming service.
Create an entirely original {req.format} from the brief below. Do not reference or imitate existing franchises, performers, studios, trademarks, or copyrighted characters.

DIRECTOR REQUEST:
{room_prompt}

MULTI-AGENT CREATIVE ROOM MEMO:
{room_memo or 'No memo was available; create the concept directly while preserving originality.'}

LANGUAGE REQUIREMENT:
- All user-facing creative text (title, tagline, synopsis, character roles/motivations, episode titles/synopses, director notes, whyCreated, and canonFacts) MUST be written naturally for locale {req.locale}.
- Keep backdropPrompt, posterPrompt and teaserPrompt in ENGLISH because Google visual/video generation models are directed internally in English.
- Proper nouns may remain original unless localization improves readability.

Requirements:
- Make the title memorable and commercially plausible.
- Characters must have distinct motivations and explicit knowledge state for continuity.
- If series: produce 4-6 episode outlines. If movie: produce 3 chapter-like segments as episodes for the interactive player.
- canonFacts must be atomic facts that can be stored and queried later.
- whyCreated must explain audience-fit without pretending to know signals not supplied above.
- backdropPrompt and posterPrompt must describe original cinematic art with no real actor likenesses, text, logos or copyrighted visual properties.
- teaserPrompt must be suitable for a short Veo cinematic clip and MUST remain in English.
""".strip()
        response = self.client().models.generate_content(
            model=settings.text_model,
            contents=schema_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=StudioBlueprint,
                temperature=0.9,
            ),
        )
        blueprint = response.parsed if isinstance(response.parsed, StudioBlueprint) else StudioBlueprint.model_validate_json(response.text)
        return blueprint, room_memo

    def generate_image_data_url(self, prompt: str, aspect_ratio: str) -> str:
        if not settings.enable_images:
            return ""
        try:
            response = self.client().models.generate_content(
                model=settings.image_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
                ),
            )
            for part in response.parts or []:
                if part.inline_data and part.inline_data.data:
                    mime = part.inline_data.mime_type or "image/png"
                    raw = part.inline_data.data
                    if isinstance(raw, bytes):
                        encoded = base64.b64encode(raw).decode("ascii")
                    else:
                        encoded = str(raw)
                    return f"data:{mime};base64,{encoded}"
        except Exception as exc:
            log.warning("Gemini image generation failed: %s", exc)
        return ""

    def to_title(self, req: GenerateTitleRequest, bp: StudioBlueprint) -> dict:
        generated_id = f"title-{uuid.uuid4().hex[:12]}"
        universe_id = req.universeId if req.universeId and req.universeId != "new" else f"univ-{uuid.uuid4().hex[:10]}"
        backdrop = self.generate_image_data_url(bp.backdropPrompt, "16:9")
        poster = self.generate_image_data_url(bp.posterPrompt, "3:4")
        chars = []
        for c in bp.characters:
            chars.append({
                "id": f"char-{uuid.uuid4().hex[:10]}", "universeId": universe_id, "name": c.name,
                "role": c.role, "visualDescriptor": c.visualDescriptor, "motivation": c.motivation,
                "relationships": c.relationships, "knowledgeState": c.knowledgeState, "avatarUrl": "", "status": c.status,
            })
        episodes = []
        for index, ep in enumerate(bp.episodes, start=1):
            episodes.append({
                "id": f"ep-{uuid.uuid4().hex[:10]}", "titleId": generated_id, "seasonNumber": 1,
                "episodeNumber": index, "title": ep.title, "synopsis": ep.synopsis,
                "durationMinutes": ep.durationMinutes, "thumbnailUrl": backdrop, "status": "Ready" if index == 1 else "Writing",
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
            "badges": ["Gemini Generated", "Canon Memory Ready", "Created For You"],
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
                "teaserPrompt": bp.teaserPrompt,
                "locale": req.locale,
                "generatedBy": settings.text_model,
            },
        }

studio = GeminiStudio()
