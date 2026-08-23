from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from google.genai import types

from .compositor_service import composer
from .config import settings
from .gemini_service import studio
from .quality_service import quality
from .reference_service import references
from .schemas import EpisodeRenderPlan, EpisodeRenderRequest
from .storyboard_service import storyboard_frames
from .video_service import videos

ProgressCallback = Callable[[str, int, int, str], None]


def _noop_progress(stage: str, completed: int, total: int, message: str) -> None:
    return None


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


def _story_structure(shot_count: int) -> str:
    if shot_count <= 3:
        return """
- SHOT 1 — ORIENTATION / NORMAL WORLD: establish where and when we are and introduce the protagonist doing an ordinary concrete task. Never begin mid-crisis.
- SHOT 2 — INCITING DISTURBANCE: the normal task is interrupted by the first specific visible event.
- SHOT 3 — REACTION + HOOK: the protagonist reacts, learns one concrete fact, and the cut ends on a readable title-break composition.
""".strip()
    if shot_count <= 12:
        return f"""
- SHOT 1 — ORIENTATION: establish place, time and protagonist before any mystery.
- SHOT 2 — NORMAL OBJECTIVE: show what the protagonist is trying to accomplish in ordinary life.
- SHOT 3 — INCITING INCIDENT: a specific visible event breaks the normal pattern.
- SHOTS 4..{max(4, shot_count - 2)} — REACTION / ESCALATION: every beat is a consequence of the previous beat.
- SHOT {shot_count - 1} — REVEAL: concrete information changes the protagonist's understanding.
- SHOT {shot_count} — TITLE-BREAK HOOK: a direct consequence of the reveal, ending on a deliberate cold-open composition.
""".strip()

    cold_end = max(6, round(shot_count * 0.10))
    act1_end = max(cold_end + 2, round(shot_count * 0.30))
    midpoint = max(act1_end + 2, round(shot_count * 0.55))
    act2_end = max(midpoint + 2, round(shot_count * 0.80))
    return f"""
FULL EPISODE STRUCTURE ({shot_count} shots):
- SHOTS 1..{cold_end}: COLD OPEN. Orient viewer first, establish protagonist normality, then inciting disturbance and a clean title-break hook.
- SHOTS {cold_end + 1}..{act1_end}: ACT I. Consequences, clear episode objective, relationships and grounded obstacles.
- SHOTS {act1_end + 1}..{midpoint}: ACT II-A. Escalation through causally connected actions; no filler montage.
- SHOTS {midpoint + 1}..{act2_end}: ACT II-B. Midpoint information changes strategy; complications narrow options.
- SHOTS {act2_end + 1}..{max(act2_end + 1, shot_count - 3)}: CLIMAX BUILD. Actions converge physically and emotionally.
- SHOTS {max(1, shot_count - 2)}..{shot_count}: CLIMAX / AFTERMATH / NEXT-EPISODE HOOK. Resolve the episode's immediate objective while preserving the series engine.
""".strip()


def build_plan(req: EpisodeRenderRequest) -> EpisodeRenderPlan:
    episode = _episode_from_request(req)
    seconds_per_shot = settings.veo_duration_seconds
    shot_count = max(3, min(math.ceil(req.targetSeconds / seconds_per_shot), math.ceil(settings.long_form_max_seconds / seconds_per_shot)))
    meta = req.title.get("_cinemind", {}) or {}
    canon_facts = meta.get("canonFacts", []) or []
    cast = req.title.get("cast", []) or []
    cast_summary = "\n".join(
        (
            f"- {c.get('name')}: VISUAL={c.get('visualDescriptor', '')}; VOICE={c.get('voiceDescriptor', '')}; "
            f"role={c.get('role', '')}; motivation={c.get('motivation', '')}; knowledge={c.get('knowledgeState', '')}"
        )
        for c in cast[:6]
    )

    structure = _story_structure(shot_count)
    prompt = f"""
You are the lead television director, episode writer, storyboard artist and continuity supervisor for CINEMIND.
Create one coherent LIVE-ACTION scripted episode plan of exactly {shot_count} Veo shots. This is not a trailer, montage, recap, mood reel, or collection of disconnected images.

SERIES: {req.title.get('title')}
UNIVERSE: {req.title.get('universeName')}
SERIES SYNOPSIS: {req.title.get('synopsis')}
EPISODE: {episode.get('title')}
EPISODE SYNOPSIS: {episode.get('synopsis')}
DIRECTOR NOTES: {episode.get('directorNotes', '')}
VIEWER LOCALE: {req.locale}
TARGET MASTER LENGTH: approximately {req.targetSeconds} seconds

CAST BIBLE — IMMUTABLE:
{cast_summary or '- Maintain the same original fictional adult characters from shot to shot.'}

CANON:
{chr(10).join('- ' + str(x) for x in canon_facts[:10]) or '- Preserve the established series premise.'}

STORY GRAMMAR:
{structure}

MANDATORY QUALITY RULES:
- A new viewer must understand place, protagonist and normal immediate objective before the first unexplained disruption.
- Do not start in the middle of a chase, argument, scream, reaction, unexplained close-up, mystery object, or crisis.
- Every shot must have a causal reason to exist and inherit state from the preceding shot.
- Keep locations manageable; within one scene preserve geography and screen direction.
- Use ordinary human behavior and grounded production design. Avoid generic cyberpunk neon, abstract symbols, dream imagery, glossy AI faces, unexplained sci-fi interfaces, trailer poses and random spectacle unless the story explicitly earns them.
- visualPromptEnglish uses: cinematography + subject + action + context + style/ambience.
- startFramePromptEnglish describes the EXACT visible first frame of the shot: people, pose, hands, props, eyelines, camera, set, light.
- endFramePromptEnglish describes the EXACT visible final frame after the action. For adjacent shots, the prior end frame and next start frame must be compatible enough to be represented by ONE shared image.
- Naturalistic live-action realism: real skin texture, practical lighting, plausible materials, restrained lensing and camera movement.
- narration/dialogue/subtitle must be natural for locale {req.locale}; never switch to English unless the locale is English.
- At most one short spoken line per 8-second shot. dialogueSpeaker must exactly match a cast name.
- Every continuityAnchor repeats immutable identity and current physical state: face, hair, age, wardrobe, props, body position, set geography, lighting, time.
- Final beat must be intentional, not an arbitrary cutoff.
""".strip()

    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EpisodeRenderPlan,
            temperature=0.08,
        ),
    )
    plan = response.parsed if isinstance(response.parsed, EpisodeRenderPlan) else EpisodeRenderPlan.model_validate_json(response.text)
    plan.shots = plan.shots[:shot_count]
    if len(plan.shots) != shot_count:
        raise RuntimeError(f"Director plan returned {len(plan.shots)} shots; expected exactly {shot_count}")
    return plan


def render_episode(req: EpisodeRenderRequest, progress: ProgressCallback | None = None) -> dict:
    progress = progress or _noop_progress
    progress("planning", 0, 1, "Writing complete episode and shot grammar")
    plan = build_plan(req)
    progress("planning", 1, 1, f"Locked {len(plan.shots)}-shot narrative plan")

    progress("reality_pack", 0, 1, "Creating photoreal cast and location anchors")
    reference_uris = references.build_for_title(req.title)
    progress("reality_pack", 1, 1, f"Locked {len(reference_uris)} Reality Pack references")

    progress("storyboard", 0, len(plan.shots) + 1, "Generating shared start/end keyframes")
    boundary_frames = storyboard_frames.build_shared_boundaries(plan, reference_uris)
    progress("storyboard", len(boundary_frames), len(boundary_frames), "Storyboard boundaries locked")

    cast = req.title.get("cast", []) or []
    voice_by_name = {
        str(c.get("name", "")).strip(): str(c.get("voiceDescriptor", "")).strip()
        for c in cast
        if c.get("name")
    }

    def render_one(index: int, repair_note: str = "") -> dict:
        shot = plan.shots[index]
        dialogue = shot.dialogue.strip()
        narration_text = shot.narration.strip() if req.includeNarration and not dialogue else ""
        speaker = shot.dialogueSpeaker.strip() if dialogue else ""
        voice_descriptor = voice_by_name.get(speaker, "") if speaker else ""
        if dialogue and speaker and speaker not in voice_by_name:
            raise RuntimeError(f"Shot {index + 1} dialogue speaker {speaker!r} is not in the locked cast bible")

        repair = f"\nSUPERVISING-DIRECTOR REPAIR NOTE: {repair_note}" if repair_note else ""
        shot_prompt = f"""
SHOT {index + 1}/{len(plan.shots)} — SCENE {shot.sceneId}
STORY BEAT: {shot.storyBeat}
PURPOSE: {shot.scenePurpose}
LOCATION: {shot.location}
CHARACTERS PRESENT: {', '.join(shot.characters) if shot.characters else 'none'}
SHOT TYPE: {shot.shotType}
CONTINUITY STATE: {shot.continuityAnchor}
VISUAL DIRECTION: {shot.visualPromptEnglish}

Move naturally from the supplied START frame to the supplied END frame while performing exactly this story beat.
Naturalistic premium television performance. Subtle microexpressions, believable eyelines and body mechanics. No trailer pose or unrelated insert.
{repair}
""".strip()

        result = videos.generate_prompt(
            shot_prompt,
            locale=req.locale,
            narration=narration_text,
            dialogue=dialogue,
            dialogue_speaker=speaker,
            voice_descriptor=voice_descriptor,
            reference_uris=[],
            first_frame_uri=boundary_frames[index],
            last_frame_uri=boundary_frames[index + 1],
            # Current documented audio-capable route is configurable separately.
            # Keyframes carry identity so the audio model does not need reference-image support.
            require_native_audio=True,
        )
        return {
            "shotNumber": index + 1,
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
            "voiceRole": speaker if dialogue else ("native Veo narrator" if narration_text else ""),
            "voiceDescriptor": voice_descriptor,
            "audioMode": "veo-native",
            "continuityAnchor": shot.continuityAnchor,
            "firstFrameUri": boundary_frames[index],
            "lastFrameUri": boundary_frames[index + 1],
            "firstFrameApplied": result.get("firstFrameApplied", False),
            "lastFrameApplied": result.get("lastFrameApplied", False),
            "model": result.get("model", ""),
        }

    # All clips already have exact shared boundaries, so they no longer depend on
    # the output of the previous Veo call. This is the main latency improvement:
    # generate up to VEO_MAX_CONCURRENCY shots at once instead of serially.
    rendered: list[dict | None] = [None] * len(plan.shots)
    progress("rendering", 0, len(plan.shots), f"Rendering with concurrency={settings.veo_max_concurrency}")
    with ThreadPoolExecutor(max_workers=min(settings.veo_max_concurrency, len(plan.shots))) as pool:
        future_map = {pool.submit(render_one, index): index for index in range(len(plan.shots))}
        completed = 0
        for future in as_completed(future_map):
            index = future_map[future]
            rendered[index] = future.result()
            completed += 1
            progress("rendering", completed, len(plan.shots), f"Rendered shot {index + 1}/{len(plan.shots)}")

    segments = [segment for segment in rendered if segment is not None]
    if len(segments) != len(plan.shots):
        raise RuntimeError("Parallel renderer returned an incomplete shot set")

    progress("composing", 0, 1, "Composing continuous master")
    master = composer.compose(segments, req.locale)
    progress("composing", 1, 1, "Continuous master composed")

    quality_report = None
    if settings.enable_quality_gate:
        progress("quality", 0, 1, "Supervising director is reviewing the master")
        quality_report = quality.evaluate(master["videoUri"], plan, req.locale)

        # One targeted repair pass. Re-render only a few specifically identified
        # defective shots, preserving the exact same shared keyframe boundaries.
        if not quality_report.passed and quality_report.badShotNumbers:
            repair_numbers = sorted({n for n in quality_report.badShotNumbers if 1 <= n <= len(plan.shots)})[:3]
            if repair_numbers:
                instructions = " ".join(quality_report.repairInstructions) or quality_report.summary
                progress("repair", 0, len(repair_numbers), f"Repairing shots {repair_numbers}")
                with ThreadPoolExecutor(max_workers=min(settings.veo_max_concurrency, len(repair_numbers))) as pool:
                    future_map = {
                        pool.submit(render_one, number - 1, instructions): number
                        for number in repair_numbers
                    }
                    repaired = 0
                    for future in as_completed(future_map):
                        number = future_map[future]
                        segments[number - 1] = future.result()
                        repaired += 1
                        progress("repair", repaired, len(repair_numbers), f"Repaired shot {number}")
                master = composer.compose(segments, req.locale)
                quality_report = quality.evaluate(master["videoUri"], plan, req.locale)

        progress("quality", 1, 1, "Quality review complete")
        if not quality_report.passed:
            raise RuntimeError(
                "QUALITY_GATE_FAILED: "
                f"narrative={quality_report.narrativeCoherence}, continuity={quality_report.visualContinuity}, "
                f"realism={quality_report.realism}, opening={quality_report.openingClarity}, "
                f"language={quality_report.languageConsistency}. {quality_report.summary}"
            )

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
        "segments": segments,
        "finalPlaybackUrl": master["playbackUrl"],
        "finalVideoUri": master["videoUri"],
        "composition": master["composition"],
        "model": settings.veo_audio_model,
        "audioMode": "veo-native-synchronized",
        "qualityGate": quality_report.model_dump() if quality_report else {"passed": True, "disabled": True},
        "continuityLock": {
            "enabled": bool(reference_uris),
            "referenceImages": len(reference_uris),
            "sharedStoryboardBoundaries": len(boundary_frames),
            "firstAndLastFrame": True,
            "parallelShotRendering": True,
            "parallelism": settings.veo_max_concurrency,
            "singleMasterPlayback": True,
            "nativeVeoAudio": True,
        },
    }
