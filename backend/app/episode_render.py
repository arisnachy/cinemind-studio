from __future__ import annotations
import math
from google.genai import types
from .config import settings
from .gemini_service import studio
from .reference_service import references
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
    shot_count = max(3, min(12, math.ceil(req.targetSeconds / seconds_per_shot)))
    meta = req.title.get("_cinemind", {}) or {}
    canon_facts = meta.get("canonFacts", []) or []
    cast = req.title.get("cast", []) or []
    cast_summary = "\n".join(
        f"- {c.get('name')}: {c.get('visualDescriptor', '')}; role={c.get('role', '')}; motivation={c.get('motivation', '')}; knowledge={c.get('knowledgeState', '')}"
        for c in cast[:6]
    )

    prompt = f"""
You are the lead television director, script editor and continuity supervisor for CINEMIND.
Your job is NOT to make a trailer or montage. Build one coherent dramatic mini-episode that plays like the opening sequence of a premium scripted series.
Create exactly {shot_count} consecutive shots, each approximately {seconds_per_shot} seconds.

SERIES: {req.title.get('title')}
UNIVERSE: {req.title.get('universeName')}
SERIES SYNOPSIS: {req.title.get('synopsis')}
EPISODE: {episode.get('title')}
EPISODE SYNOPSIS: {episode.get('synopsis')}
DIRECTOR NOTES: {episode.get('directorNotes', '')}
VIEWER LOCALE: {req.locale}
TOTAL CUT: approximately {shot_count * seconds_per_shot} seconds

CAST BIBLE:
{cast_summary or '- Maintain the same original fictional adult characters from shot to shot.'}

CANON:
{chr(10).join('- ' + str(x) for x in canon_facts[:10]) or '- Preserve the established series premise.'}

MANDATORY STORY STRUCTURE:
1. COLD OPEN: establish protagonist, place and ordinary objective in a readable way.
2. INCITING INCIDENT: one concrete event disrupts that objective.
3. ESCALATION: protagonist reacts; cause and effect must connect directly to the previous shot.
4. REVEAL: reveal one meaningful piece of information tied to the series premise.
5. CLIFFHANGER/PAYOFF: end on one clear unresolved dramatic question.

DIRECTING RULES:
- This is a scene, not disconnected visual poetry. Every shot must logically follow the previous shot.
- Use the SAME primary location for most shots unless the story explicitly motivates a move.
- Use at most 2 speaking characters in this short cut.
- visualPromptEnglish MUST be English and must describe camera, subject, action, setting, lighting and continuity.
- narration, dialogue and subtitle MUST be natural {req.locale}; never translate names.
- Dialogue must be short, specific and dramatically useful. No generic exposition.
- Repeat stable wardrobe, hair, age, props and location details in continuityAnchor.
- shotType should progress professionally: establishing/medium/close-up/insert/reaction/etc., not random angles.
- No real actors, brands, copyrighted characters or franchise imitation.
- Do not invent unrelated symbols, creatures or locations simply because they look cinematic.
- The final shot MUST directly answer or escalate something introduced in shot 1.
""".strip()

    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EpisodeRenderPlan,
            temperature=0.35,
        ),
    )
    plan = response.parsed if isinstance(response.parsed, EpisodeRenderPlan) else EpisodeRenderPlan.model_validate_json(response.text)
    if len(plan.shots) != shot_count:
        plan.shots = plan.shots[:shot_count]
    return plan


def render_episode(req: EpisodeRenderRequest) -> dict:
    plan = build_plan(req)
    reference_uris = references.build_for_title(req.title)
    rendered = []

    for index, shot in enumerate(plan.shots, start=1):
        shot_prompt = f"""
SCENE {shot.sceneId} — STORY BEAT: {shot.storyBeat}
PURPOSE: {shot.scenePurpose}
LOCATION: {shot.location}
CHARACTERS PRESENT: {', '.join(shot.characters) if shot.characters else 'none'}
SHOT TYPE: {shot.shotType}
CONTINUITY LOCK: {shot.continuityAnchor}
ACTION AND CINEMATOGRAPHY: {shot.visualPromptEnglish}

This shot begins exactly where the prior dramatic beat leaves off. Preserve the same production design and character identity shown by the supplied asset references.
""".strip()

        result = videos.generate_prompt(
            shot_prompt,
            locale=req.locale,
            narration="",
            dialogue="",
            reference_uris=reference_uris,
        )

        # Reliable spoken track is generated separately. We prefer exact scripted
        # speech to uncontrolled model vocalizations in the picture generation.
        voice_parts = []
        if req.includeNarration and shot.narration:
            voice_parts.append(shot.narration)
        if shot.dialogue:
            speaker = f"{shot.dialogueSpeaker}: " if shot.dialogueSpeaker else ""
            voice_parts.append(f"{speaker}{shot.dialogue}")
        voice_text = " ".join(voice_parts).strip()
        voice = narration.synthesize_to_gcs(voice_text, req.locale) if voice_text else None

        rendered.append({
            "shotNumber": index,
            "sceneId": shot.sceneId,
            "storyBeat": shot.storyBeat,
            "scenePurpose": shot.scenePurpose,
            "location": shot.location,
            "characters": shot.characters,
            "shotType": shot.shotType,
            "playbackUrl": result["playbackUrl"],
            "videoUri": result["videoUri"],
            "durationSeconds": result["durationSeconds"],
            "subtitle": shot.subtitle,
            "narration": shot.narration,
            "dialogue": shot.dialogue,
            "dialogueSpeaker": shot.dialogueSpeaker,
            "narrationUrl": voice.get("playbackUrl") if voice else "",
            "narrationModel": voice.get("model") if voice else "",
            "narrationVoice": voice.get("voice") if voice else "",
            "continuityAnchor": shot.continuityAnchor,
            "referenceCount": result.get("referenceCount", 0),
        })

    return {
        "status": "READY",
        "episodeTitle": plan.episodeTitle,
        "locale": req.locale,
        "logline": plan.logline,
        "coldOpen": plan.coldOpen,
        "escalation": plan.escalation,
        "climax": plan.climax,
        "cliffhanger": plan.cliffhanger,
        "summary": plan.summary,
        "totalDurationSeconds": sum(x["durationSeconds"] for x in rendered),
        "segments": rendered,
        "model": settings.veo_model,
        "ttsModel": settings.tts_model if settings.enable_tts else "",
        "continuityLock": {
            "enabled": bool(reference_uris),
            "referenceImages": len(reference_uris),
        },
    }
