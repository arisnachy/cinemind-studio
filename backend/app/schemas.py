from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field


class TasteStats(BaseModel):
    titlesGenerated: int = 0
    episodesWatched: int = 0
    canonInterventions: int = 0


class TasteProfile(BaseModel):
    id: str
    name: str
    avatar: str = ""
    bio: str = ""
    topGenres: list[str] = []
    narrativePacing: str = "Deep Psychological & Atmospheric"
    currentObsession: str = "original cinematic stories"
    universesFollowed: list[str] = []
    stats: TasteStats = TasteStats()


class GenerateTitleRequest(BaseModel):
    prompt: str = ""
    autonomous: bool = False
    genre: str = "Science Fiction"
    mood: str = "Atmospheric & Suspenseful"
    format: Literal["series", "movie"] = "series"
    intensity: int = Field(default=85, ge=50, le=100)
    universeId: str | None = None
    locale: str = "en-US"
    autoProducePilot: bool = True
    pilotSeconds: int = Field(default=48, ge=24, le=1800)
    profile: TasteProfile


class CharacterBlueprint(BaseModel):
    name: str
    role: str
    visualDescriptor: str
    voiceDescriptor: str = "natural adult voice, restrained premium-drama delivery"
    motivation: str
    relationships: list[str] = []
    knowledgeState: str
    status: Literal["Alive", "Missing", "Transformed", "Deceased"] = "Alive"


class EpisodeBlueprint(BaseModel):
    title: str
    synopsis: str
    durationMinutes: int = Field(default=42, ge=4, le=180)
    directorNotes: str = ""


class WhyFactorBlueprint(BaseModel):
    factor: str
    affinityScore: Literal["High", "Very High", "Rising", "Core Habit"]
    description: str
    sourceSignal: str


class StudioBlueprint(BaseModel):
    universeName: str
    universePremise: str
    title: str
    tagline: str
    synopsis: str
    rating: str = "TV-14"
    genres: list[str]
    tones: list[str]
    canonStatus: Literal["Canonical", "Alternate Timeline", "Evolving"] = "Canonical"
    characters: list[CharacterBlueprint] = Field(min_length=2, max_length=6)
    episodes: list[EpisodeBlueprint] = Field(min_length=1, max_length=8)
    whyCreated: list[WhyFactorBlueprint] = Field(min_length=2, max_length=5)
    canonFacts: list[str] = Field(min_length=3, max_length=10)
    backdropPrompt: str
    posterPrompt: str
    teaserPrompt: str


class CanonAnalyzeRequest(BaseModel):
    title: dict
    requestedChange: str = "Analyze this story for continuity conflicts."


class CanonResolveRequest(BaseModel):
    title: dict
    strategy: Literal["preserve", "rewrite", "fork"]
    requestedChange: str = ""


class VideoRequest(BaseModel):
    title: dict
    episodeId: str | None = None
    locale: str = "en-US"


class EpisodeShotBlueprint(BaseModel):
    shotNumber: int
    sceneId: str
    storyBeat: str
    scenePurpose: str
    location: str
    characters: list[str] = []
    shotType: str
    visualPromptEnglish: str
    # These are deliberately explicit. CINEMIND renders the boundary frames first,
    # then every Veo shot uses a start+end frame. That lets shots render in parallel
    # while sharing exact boundaries with adjacent shots.
    startFramePromptEnglish: str
    endFramePromptEnglish: str
    narration: str = ""
    dialogue: str = ""
    dialogueSpeaker: str = ""
    subtitle: str = ""
    continuityAnchor: str


class EpisodeRenderPlan(BaseModel):
    episodeTitle: str
    locale: str
    logline: str
    coldOpen: str
    escalation: str
    climax: str
    cliffhanger: str
    summary: str
    shots: list[EpisodeShotBlueprint]


class EpisodeRenderRequest(BaseModel):
    title: dict
    episodeId: str | None = None
    locale: str = "en-US"
    targetSeconds: int = Field(default=48, ge=24, le=1800)
    includeNarration: bool = True


class ProductionJobRequest(EpisodeRenderRequest):
    qualityMode: Literal["fast", "balanced", "strict"] = "balanced"


class QualityGateReport(BaseModel):
    passed: bool
    narrativeCoherence: int = Field(ge=0, le=100)
    visualContinuity: int = Field(ge=0, le=100)
    realism: int = Field(ge=0, le=100)
    openingClarity: int = Field(ge=0, le=100)
    languageConsistency: int = Field(ge=0, le=100)
    badShotNumbers: list[int] = []
    summary: str = ""
    repairInstructions: list[str] = []
