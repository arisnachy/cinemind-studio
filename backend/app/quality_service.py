from __future__ import annotations

import logging

from google.genai import types

from .config import settings
from .gemini_service import studio
from .schemas import EpisodeRenderPlan, QualityGateReport

log = logging.getLogger(__name__)


class CinematicQualityService:
    def evaluate(self, video_uri: str, plan: EpisodeRenderPlan, locale: str) -> QualityGateReport:
        if not settings.enable_quality_gate:
            return QualityGateReport(
                passed=True,
                narrativeCoherence=100,
                visualContinuity=100,
                realism=100,
                openingClarity=100,
                languageConsistency=100,
                summary="Quality gate disabled by configuration.",
            )

        shot_map = "\n".join(
            f"Shot {i}: scene={shot.sceneId}; beat={shot.storyBeat}; purpose={shot.scenePurpose}; characters={','.join(shot.characters)}"
            for i, shot in enumerate(plan.shots, start=1)
        )
        prompt = f"""
You are CINEMIND's final supervising director and continuity editor. Watch the complete generated master, including audio.
Judge it as the OPENING of a premium live-action scripted television production, not as an AI demo.

EXPECTED SHOT MAP:
{shot_map}

EXPECTED VIEWER LANGUAGE: {locale}

Score 0-100:
- narrativeCoherence: each visible action follows causally from the previous shot; no random/missing beat.
- visualContinuity: same character identity, wardrobe, props, geography, eyelines and plausible time continuity.
- realism: human faces/skin/motion and environment look like credible live-action photography rather than CGI/game/concept art.
- openingClarity: a new viewer quickly understands where they are, who the protagonist is and what normal action/objective precedes the inciting incident.
- languageConsistency: spoken content, if present, stays in the requested locale and belongs naturally to the visible speaker.

Set passed=true ONLY if narrativeCoherence >=75, visualContinuity >=78, realism >=75, openingClarity >=80, and languageConsistency >=90.
Identify only genuinely defective shot numbers in badShotNumbers. If a problem spans a transition, list the later shot. Keep repairInstructions concrete and shot-specific.
Do not reward visual spectacle that damages story clarity or realism.
""".strip()

        response = studio.client().models.generate_content(
            model=settings.quality_model,
            contents=[
                types.Part.from_uri(file_uri=video_uri, mime_type="video/mp4"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=QualityGateReport,
                temperature=0.0,
            ),
        )
        report = response.parsed if isinstance(response.parsed, QualityGateReport) else QualityGateReport.model_validate_json(response.text)
        log.info(
            "Quality gate passed=%s narrative=%s continuity=%s realism=%s opening=%s language=%s bad=%s",
            report.passed,
            report.narrativeCoherence,
            report.visualContinuity,
            report.realism,
            report.openingClarity,
            report.languageConsistency,
            report.badShotNumbers,
        )
        return report


quality = CinematicQualityService()
