export type ContentType = 'series' | 'movie' | 'short';

export type EpisodeStatus = 'Ready' | 'Writing' | 'Storyboard ready' | 'Scene generation' | 'Planned';

export interface Episode {
  id: string;
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  synopsis: string;
  durationMinutes: number;
  thumbnailUrl: string;
  status: EpisodeStatus;
  watchedPercentage?: number;
  releaseDate?: string;
  directorNotes?: string;
  renderedSeconds?: number;
  renderedSegments?: number;
}

export interface Character {
  id: string;
  universeId: string;
  name: string;
  role: string;
  visualDescriptor: string;
  motivation: string;
  relationships: string[];
  knowledgeState: string;
  avatarUrl: string;
  referenceImageUri?: string;
  status: 'Alive' | 'Missing' | 'Transformed' | 'Deceased';
}

export interface CanonFact {
  id: string;
  universeId: string;
  fact: string;
  category: 'World Rule' | 'Historical Event' | 'Technology' | 'Character Truth';
  confidenceScore: number;
  firstEstablishedIn: string;
  canonVersion: string;
}

export interface TimelineEvent {
  id: string;
  universeId: string;
  yearOrEra: string;
  title: string;
  description: string;
  affectedCharacters: string[];
  canonical: boolean;
}

export interface Universe {
  id: string;
  name: string;
  tagline: string;
  premise: string;
  heroBackdropUrl: string;
  posterUrl: string;
  themeColors: { primary: string; secondary: string; accent: string };
  canonHealthPercent: number;
  canonVersion: string;
  worldRules: string[];
  activeArc: string;
  characters: Character[];
  timeline: TimelineEvent[];
  canonFacts: CanonFact[];
  locations: { name: string; description: string; type: string }[];
  lastEvolvedDate: string;
}

export interface WhyCreatedFactor {
  factor: string;
  affinityScore: 'High' | 'Very High' | 'Rising' | 'Core Habit';
  description: string;
  sourceSignal: string;
}

export interface ProductionSegment {
  shotNumber: number;
  sceneId?: string;
  storyBeat?: string;
  scenePurpose?: string;
  location?: string;
  characters?: string[];
  shotType?: string;
  playbackUrl: string;
  videoUri: string;
  durationSeconds: number;
  subtitle: string;
  narration: string;
  dialogue: string;
  dialogueSpeaker?: string;
  narrationUrl?: string;
  narrationUri?: string;
  narrationModel?: string;
  narrationVoice?: string;
  continuityAnchor: string;
  referenceCount?: number;
  firstFrameApplied?: boolean;
  lastFrameUri?: string;
}

export interface Title {
  id: string;
  universeId: string;
  universeName: string;
  title: string;
  tagline: string;
  synopsis: string;
  type: ContentType;
  releaseYear: number;
  rating: string;
  duration?: string;
  matchScore: number;
  genres: string[];
  tones: string[];
  badges: string[];
  backdropUrl: string;
  posterUrl: string;
  logoText?: string;
  featured?: boolean;
  continueWatching?: {
    lastWatchedEpisodeId: string;
    seasonNumber: number;
    episodeNumber: number;
    progressPercentage: number;
    remainingMinutes: number;
  };
  totalSeasons?: number;
  episodes: Episode[];
  cast: Character[];
  whyCreated: WhyCreatedFactor[];
  canonStatus: 'Canonical' | 'Alternate Timeline' | 'Evolving';
  hasGeneratedVideo?: boolean;
  videoPreviewUrl?: string;
  productionStatus?: 'WRITING' | 'RENDERING' | 'READY' | 'FAILED';
  productionSegments?: ProductionSegment[];
  productionPlaybackUrl?: string;
  productionVideoUri?: string;
  productionComposition?: string;
  productionSummary?: string;
  productionLogline?: string;
  productionContinuityLock?: {
    enabled?: boolean;
    referenceImages?: number;
    sameSceneFirstFrameHandoff?: boolean;
    singleMasterPlayback?: boolean;
  };
  productionError?: string;
}

export interface TasteProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  topGenres: string[];
  narrativePacing: 'Fast & High-Stakes' | 'Deep Psychological & Atmospheric' | 'Complex Nonlinear' | 'Character-Driven Ensemble';
  currentObsession: string;
  universesFollowed: string[];
  stats: { titlesGenerated: number; episodesWatched: number; canonInterventions: number };
}

export interface CanonContradiction {
  sceneLocation: string;
  conflictingFact: string;
  severity: 'High Conflict' | 'Medium Divergence' | 'Mild Inconsistency';
  suggestedFix: string;
}
