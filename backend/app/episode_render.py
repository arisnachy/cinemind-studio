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
Do NOT make a trailer, montage, dream sequence or collection of disconnected cool images.
Build one coherent dramatic mini-episode made of exactly {shot_count} consecutive shots.

SERIES: {req.title.get('title')}
UNIVERSE: {req.title.get('universeName')}
SERIES SYNOPSIS: {req.title.get('synopsis')}
EPISODE: {episode.get('title')}
EPISODE SYNOPSIS: {episode.get('synopsis')}
DIRECTOR NOTES: {episode.get('directorNotes', '')}
VIEWER LOCALE: {req.locale}

CAST BIBLE:
{cast_summary or '- Maintain the same original fictional adult characters from shot to shot.'}

CANON:
{chr(10).join('- ' + str(x) for x in canon_facts[:10]) or '- Preserve the established series premise.'}

MANDATORY CAUSAL ARC:
- Shot 1 COLD OPEN: protagonist in a specific place pursuing a concrete immediate objective.
- Shot 2 INCITING INCIDENT: a visible event disrupts that objective.
- Middle shots REACTION/ESCALATION: each action must be a consequence of the preceding shot.
- Penultimate shot REVEAL: concrete information changes the protagonist's understanding.
- Final shot CLIFFHANGER: a visible consequence directly tied to shot 1 and the reveal.

CONTINUITY CONTRACT:
- Keep ONE primary sceneId/location for at least the first half of the cut. A new sceneId is allowed only for an explicitly motivated location/time transition.
- Use at most two speaking characters in this short cut.
- visualPromptEnglish must be English and describe cinematography + subject + action + context + style.
- narration/dialogue/subtitle must be natural {req.locale}.
- Every continuityAnchor must repeat immutable identity details: face/hair/age/wardrobe/signature prop + set/lighting/time-of-day.
- Dialogue must be short, specific, motivated and speakable within the shot.
- No generic mysterious whispers, random breathing, abstract glitches, unexplained creatures, unrelated symbols or cinematic filler.
- No new character, prop or location may appear unless the prior beat establishes why it enters.
- The final shot must make sense even to a viewer who saw only the preceding shots.
""".strip()

    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EpisodeRenderPlan,
            temperature=0.25,
        ),
    )
    plan = response.parsed if isinstance(response.parsed, EpisodeRenderPlan) else EpisodeRenderPlan.model_validate_json(response.text)
    plan.shots = plan.shots[:shot_count]
    return plan


def render_episode(req: EpisodeRenderRequest) -> dict:
    plan = build_plan(req)
    reference_uris = references.build_for_title(req.title)
    rendered = []
    previous_scene_id = ""
    previous_video_uri = ""

    for index, shot in enumerate(plan.shots, start=1):
        same_scene_continuation = bool(previous_video_uri and previous_scene_id and shot.sceneId == previous_scene_id)
        shot_prompt = f"""
SCENE {shot.sceneId} — STORY BEAT: {shot.storyBeat}
PURPOSE: {shot.scenePurpose}
LOCATION: {shot.location}
CHARACTERS PRESENT: {', '.join(shot.characters) if shot.characters else 'none'}
SHOT TYPE: {shot.shotType}
CONTINUITY LOCK: {shot.continuityAnchor}
ACTION AND CINEMATOGRAPHY: {shot.visualPromptEnglish}

Stage exactly this story beat. It must visibly follow the prior dramatic action; do not create a montage or generic establishing clip.
""".strip()

        result = videos.generate_prompt(
            shot_prompt,
            locale=req.locale,
            narration="",
            dialogue="",
            reference_uris=reference_uris if not same_scene_continuation else [],
            extend_from_uri=previous_video_uri if same_scene_continuation else "",
        )

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
            "continuedFromPreviousShot": result.get("continuedFromPreviousShot", False),
        })
        previous_scene_id = shot.sceneId
        previous_video_uri = result["videoUri"]

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
            "sameSceneVideoExtension": True,
        },
    }
