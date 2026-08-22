from __future__ import annotations
import json
import logging
from pydantic import BaseModel, Field
from google.genai import types
from .config import settings
from .gemini_service import studio
from .adk_runtime import run_creative_room

log = logging.getLogger(__name__)

class Contradiction(BaseModel):
    sceneLocation: str
    conflictingFact: str
    severity: str
    suggestedFix: str

class CanonAnalysis(BaseModel):
    summary: str
    contradictions: list[Contradiction] = Field(default_factory=list, max_length=8)

async def analyze(title: dict, requested_change: str) -> CanonAnalysis:
    prompt = f"""Perform a strict canon impact analysis for the following original CINEMIND title.
Requested change: {requested_change}
Title JSON: {json.dumps(title, ensure_ascii=False)[:18000]}
Use ClickHouse memory tools if available. Identify only concrete contradictions; do not invent prior canon. Return a concise continuity memo."""
    memory_memo = ""
    try:
        memory_memo = await run_creative_room(prompt, "canon-reviewer")
    except Exception as exc:
        log.warning("ADK continuity pass failed: %s", exc)
    response = studio.client().models.generate_content(
        model=settings.text_model,
        contents=f"{prompt}\n\nADK continuity/memory memo:\n{memory_memo}",
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=CanonAnalysis, temperature=0.2),
    )
    return response.parsed if isinstance(response.parsed, CanonAnalysis) else CanonAnalysis.model_validate_json(response.text)
