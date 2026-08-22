from __future__ import annotations
import math
from google.genai import types
from .config import settings
from .gemini_service import studio
from .schemas import EpisodeRenderPlan, EpisodeRenderRequest
from .tts_service import narration
from .video_service import videos


def _episode_from_request(req: EpisodeRenderRequest) -> dict:
    episodes = req.title.get("episodes", []) or []
    if req.episodeId:
        for ep in episodes:
            if ep.get("id") == req.episodeId:
                return ep
    return episodes[0] if episodes else {
        "id": "feature",
        "title": req.title.get("title", "CINEMIND Feature"),
        "synopsis": req.title.get("synopsis", ""),
        "directorNotes": "",
    }


def build_plan(req: EpisodeRenderRequest) -> EpisodeRenderPlan:
    episode = _episode_from_request(req)
    seconds_per_shot = settings.veo_duration_seconds
    shot_count = max(1, min(12, math.ceil(req.targetSeconds / seconds_per_shot)))
    meta = req.title.get("_cinemind", {}) or {}
    canon_facts = meta.get("canonFacts", []) or []
    cast = req.title.get("cast", []) or []
    cast_summary = "\n".join(
        f"- {c.get('name')}: {c.get('visualDescriptor', '')}; role={c.get('role', '')}; motivation={c.get('motivation', '')}"
        for c in cast[:6]
    )

    prompt = f"""
You are CINEMIND's episode director and shot planner.
Create a coherent mini-episode cut made of exactly {shot_count} consecutive shots.
Each shot will be generated separately by Veo 3.1 and lasts {seconds_per_shot} seconds.

TITLE: {req.title.get('title')}
UNIVERSE: {req.title.get('universeName')}
EPISODE: {episode.get('title')}
EPISODE SYNOPSIS: {episode.get('synopsis')}
DIRECTOR NOTES: {episode.get('directorNotes', '')}
VIEWER LOCALE: {req.locale}
TARGET CUT LENGTH: approximately {shot_count * seconds_per_shot} seconds

CAST CONTINUITY:
{cast_summary or '- Keep original fictional characters visually consistent across shots.'}

CANON FACTS:
{chr(10).join('- ' + str(x) for x in canon_facts[:10]) or '- Preserve the title synopsis and episode premise.'}

RULES:
- visualPromptEnglish MUST be written in English because it directs Veo.
- narration, dialogue and subtitle MUST be written naturally in locale {req.locale}.
- The shots must form ONE continuous dramatic sequence with a beginning, escalation and payoff/cliffhanger.
- Every visual prompt must repeat enough concrete continuity anchors (characters, wardrobe, setting, lighting, camera language) for separately generated shots to resemble the same production.
- Avoid real actors, real brands, copyrighted characters, logos and franchise imitation.
- Keep spoken text short enough to fit naturally inside an {seconds_per_shot}-second shot.
- Use narration only when it improves comprehension; do not narrate every second.
- subtitle should reflect the key spoken line or narrative beat for accessibility.
""".strip()

    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EpisodeRenderPlan,
            temperature=0.65,
        ),
    )
    plan = response.parsed if isinstance(response.parsed, EpisodeRenderPlan) else EpisodeRenderPlan.model_validate_json(response.text)
    if len(plan.shots) != shot_count:
        plan.shots = plan.shots[:shot_count]
    return plan


def render_episode(req: EpisodeRenderRequest) -> dict:
    plan = build_plan(req)
    rendered = []
    for index, shot in enumerate(plan.shots, start=1):
        # Veo creates the moving image + environmental/native sound. Gemini-TTS
        # creates a separate, reliable language-specific voice track.
        result = videos.generate_prompt(
            shot.visualPromptEnglish,
            locale=req.locale,
            narration="",
            dialogue=shot.dialogue,
        )
        voice_text = " ".join(x for x in [shot.narration if req.includeNarration else "", shot.dialogue] if x).strip()
        voice = narration.synthesize_to_gcs(voice_text, req.locale) if voice_text else None
        rendered.append({
            "shotNumber": index,
            "playbackUrl": result["playbackUrl"],
            "videoUri": result["videoUri"],
            "durationSeconds": result["durationSeconds"],
            "subtitle": shot.subtitle,
            "narration": shot.narration,
            "dialogue": shot.dialogue,
            "narrationUrl": voice.get("playbackUrl") if voice else "",
            "narrationModel": voice.get("model") if voice else "",
            "narrationVoice": voice.get("voice") if voice else "",
            "continuityAnchor": shot.continuityAnchor,
        })
    return {
        "status": "DONE",
        "episodeTitle": plan.episodeTitle,
        "locale": req.locale,
        "summary": plan.summary,
        "totalDurationSeconds": sum(x["durationSeconds"] for x in rendered),
        "segments": rendered,
        "model": settings.veo_model,
        "ttsModel": settings.tts_model if settings.enable_tts else "",
    }
