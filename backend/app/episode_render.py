from __future__ import annotations

import math

from google.genai import types

from .compositor_service import composer
from .config import settings
from .gemini_service import studio
from .reference_service import references
from .schemas import EpisodeRenderPlan, EpisodeRenderRequest
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


def _opening_structure(shot_count: int) -> str:
    if shot_count <= 3:
        return """
- SHOT 1 — ORIENTATION / NORMAL WORLD: establish WHERE and WHEN we are with a readable wide/medium composition, then introduce the protagonist doing an ordinary concrete task. The viewer knows nothing yet. Do NOT begin mid-crisis.
- SHOT 2 — INCITING DISTURBANCE: the ordinary task is interrupted by the first unusual event. The event must be visible and causally understandable.
- SHOT 3 — REACTION + HOOK: the protagonist investigates/reacts and discovers one concrete fact that changes the meaning of what just happened. End on a composed visual hold suitable for a series-title break.
""".strip()
    if shot_count == 4:
        return """
- SHOT 1 — ORIENTATION: establish location, time, protagonist and ordinary activity before any mystery.
- SHOT 2 — CHARACTER / OBJECTIVE: show the protagonist pursuing a normal immediate goal and reveal personality through behavior or one natural line.
- SHOT 3 — INCITING INCIDENT: something specific and visible breaks the normal pattern.
- SHOT 4 — CONSEQUENCE / HOOK: the protagonist reacts, finds a concrete clue or consequence, and the scene ends on a clean title-break image.
""".strip()
    return f"""
- SHOT 1 — ORIENTATION: establish place/time and protagonist in ordinary life. Never start mid-conflict.
- SHOT 2 — NORMAL OBJECTIVE: continue the same scene and make us understand what the protagonist is trying to do before the premise intrudes.
- SHOT 3 — INCITING INCIDENT: introduce the first visible disruption.
- SHOTS 4..{max(4, shot_count - 2)} — REACTION / ESCALATION: every action is caused by the previous beat; preserve geography and character state.
- SHOT {shot_count - 1} — REVEAL: one concrete piece of information changes the protagonist's understanding.
- SHOT {shot_count} — TITLE-BREAK HOOK: immediate emotional/physical consequence of the reveal; finish on a strong readable composition that feels like the end of a cold open, not the middle of a random scene.
""".strip()


def build_plan(req: EpisodeRenderRequest) -> EpisodeRenderPlan:
    episode = _episode_from_request(req)
    seconds_per_shot = settings.veo_duration_seconds
    shot_count = max(3, min(12, math.ceil(req.targetSeconds / seconds_per_shot)))
    meta = req.title.get("_cinemind", {}) or {}
    canon_facts = meta.get("canonFacts", []) or []
    cast = req.title.get("cast", []) or []
    cast_summary = "\n".join(
        (
            f"- {c.get('name')}: VISUAL={c.get('visualDescriptor', '')}; "
            f"VOICE={c.get('voiceDescriptor', '')}; role={c.get('role', '')}; "
            f"motivation={c.get('motivation', '')}; knowledge={c.get('knowledgeState', '')}"
        )
        for c in cast[:6]
    )

    opening_structure = _opening_structure(shot_count)

    prompt = f"""
You are the lead television director, pilot writer and continuity supervisor for CINEMIND.
You are directing the OPENING COLD OPEN of Episode 1. The viewer has NEVER seen this world or these characters before.
Do NOT create a trailer, montage, dream sequence, recap, abstract mood reel, or a scene that feels like it began before the viewer arrived.
Build one coherent premium-series opening made of exactly {shot_count} consecutive shots.

SERIES: {req.title.get('title')}
UNIVERSE: {req.title.get('universeName')}
SERIES SYNOPSIS: {req.title.get('synopsis')}
EPISODE: {episode.get('title')}
EPISODE SYNOPSIS: {episode.get('synopsis')}
DIRECTOR NOTES: {episode.get('directorNotes', '')}
VIEWER LOCALE: {req.locale}

CAST BIBLE — IMMUTABLE ACROSS SHOTS:
{cast_summary or '- Maintain the same original fictional adult characters from shot to shot.'}

CANON:
{chr(10).join('- ' + str(x) for x in canon_facts[:10]) or '- Preserve the established series premise.'}

OPENING GRAMMAR — FOLLOW THIS ORDER:
{opening_structure}

QUALITY CONTRACT:
- Shot 1 MUST orient the viewer. Start with readable geography and an ordinary action; do not open on an unexplained reaction, random object close-up, screaming, chase, mysterious symbol, or crisis already in progress.
- The audience must understand protagonist + place + immediate goal BEFORE the inciting incident.
- Keep the first half in ONE primary sceneId/location unless a motivated transition is essential.
- Use at most two speaking characters in this short opening.
- Prefer SHOWING over narration. Use narration only if the premise genuinely requires a narrator; otherwise leave narration empty.
- Use at most ONE short spoken line in a shot. Dialogue must sound like something a person would naturally say in that exact moment, not exposition.
- dialogueSpeaker MUST be the exact name of a character from the cast bible when dialogue exists.
- narration/dialogue/subtitle must be natural for locale {req.locale}. Never switch to English unless the viewer locale is English.
- visualPromptEnglish stays English and must use the Google Veo directing formula: cinematography + subject + action + context + style/ambience.
- Every continuityAnchor repeats immutable identity/state: face, hair, age, wardrobe, signature prop, current body position, what each hand is doing, set geography, lighting and time of day.
- Each shot begins from the exact state left by the previous shot. No teleporting, costume changes, unexplained new props, unexplained new people or time jumps.
- No generic mysterious whispers, random breathing, abstract glitches, unexplained creatures, unrelated symbols or AI-video filler.
- Camera language must feel intentional and restrained: establish with wide/medium, then move closer only when story information earns it.
- Final shot must feel like the END OF A COLD OPEN / TITLE BREAK, not an arbitrary cutoff.
""".strip()

    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EpisodeRenderPlan,
            temperature=0.12,
        ),
    )
    plan = response.parsed if isinstance(response.parsed, EpisodeRenderPlan) else EpisodeRenderPlan.model_validate_json(response.text)
    plan.shots = plan.shots[:shot_count]
    if len(plan.shots) != shot_count:
        raise RuntimeError(f"Director plan returned {len(plan.shots)} shots; expected exactly {shot_count}")
    return plan


def render_episode(req: EpisodeRenderRequest) -> dict:
    plan = build_plan(req)
    reference_uris = references.build_for_title(req.title)
    rendered: list[dict] = []
    previous_scene_id = ""
    previous_last_frame_uri = ""

    cast = req.title.get("cast", []) or []
    voice_by_name = {
        str(c.get("name", "")).strip(): str(c.get("voiceDescriptor", "")).strip()
        for c in cast
        if c.get("name")
    }

    for index, shot in enumerate(plan.shots, start=1):
        same_scene_handoff = bool(previous_last_frame_uri and previous_scene_id and shot.sceneId == previous_scene_id)
        shot_prompt = f"""
SHOT {index}/{len(plan.shots)} — SCENE {shot.sceneId}
STORY BEAT: {shot.storyBeat}
PURPOSE: {shot.scenePurpose}
LOCATION: {shot.location}
CHARACTERS PRESENT: {', '.join(shot.characters) if shot.characters else 'none'}
SHOT TYPE: {shot.shotType}
CONTINUITY STATE AT START: {shot.continuityAnchor}
VISUAL DIRECTION: {shot.visualPromptEnglish}

Stage exactly this beat as part of the opening cold open. It must visibly follow the prior dramatic action and must not feel like a standalone AI clip.
If a first frame is supplied, continue its exact body positions, eyelines, props, screen direction and action immediately.
Naturalistic premium television performance. Restrained acting. No trailer poses, no slow-motion hero shots unless specifically motivated by the story.
""".strip()

        dialogue = shot.dialogue.strip()
        narration_text = shot.narration.strip() if req.includeNarration and not dialogue else ""
        speaker = shot.dialogueSpeaker.strip() if dialogue else ""
        voice_descriptor = voice_by_name.get(speaker, "") if speaker else ""
        if dialogue and speaker and speaker not in voice_by_name:
            raise RuntimeError(f"Shot {index} dialogue speaker {speaker!r} is not in the locked cast bible")

        result = videos.generate_prompt(
            shot_prompt,
            locale=req.locale,
            narration=narration_text,
            dialogue=dialogue,
            dialogue_speaker=speaker,
            voice_descriptor=voice_descriptor,
            reference_uris=reference_uris if not same_scene_handoff else [],
            first_frame_uri=previous_last_frame_uri if same_scene_handoff else "",
        )

        last_frame_uri = composer.extract_last_frame(result["videoUri"])

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
            "subtitle": shot.subtitle or dialogue or narration_text,
            "narration": narration_text,
            "dialogue": dialogue,
            "dialogueSpeaker": speaker,
            "narrationUrl": "",
            "narrationUri": "",
            "narrationModel": "",
            "narrationVoice": "",
            "voiceRole": speaker if dialogue else ("native Veo narrator" if narration_text else ""),
            "voiceDescriptor": voice_descriptor,
            "audioMode": "veo-native",
            "continuityAnchor": shot.continuityAnchor,
            "referenceCount": result.get("referenceCount", 0),
            "firstFrameApplied": result.get("firstFrameApplied", False),
            "lastFrameUri": last_frame_uri,
        })
        previous_scene_id = shot.sceneId
        previous_last_frame_uri = last_frame_uri

    # The compositor now only normalizes and concatenates Veo's own synchronized
    # picture+audio. It does not overlay an external TTS performance.
    master = composer.compose(rendered, req.locale)

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
        "totalDurationSeconds": master["durationSeconds"],
        "segments": rendered,
        "finalPlaybackUrl": master["playbackUrl"],
        "finalVideoUri": master["videoUri"],
        "composition": master["composition"],
        "model": settings.veo_model,
        "audioMode": "veo-native-synchronized",
        "ttsModel": "",
        "continuityLock": {
            "enabled": bool(reference_uris),
            "referenceImages": len(reference_uris),
            "sameSceneFirstFrameHandoff": True,
            "singleMasterPlayback": True,
            "nativeVeoAudio": True,
        },
    }
