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
  watchedPercentage?: number; // 0 - 100
  releaseDate?: string;
  directorNotes?: string;
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
  status: 'Alive' | 'Missing' | 'Transformed' | 'Deceased';
}

export interface CanonFact {
  id: string;
  universeId: string;
  fact: string;
  category: 'World Rule' | 'Historical Event' | 'Technology' | 'Character Truth';
  confidenceScore: number; // 0.0 - 1.0
  firstEstablishedIn: string; // Episode or Movie title
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
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  canonHealthPercent: number; // e.g. 99.4%
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

export interface Title {
  id: string;
  universeId: string;
  universeName: string;
  title: string;
  tagline: string;
  synopsis: string;
  type: ContentType;
  releaseYear: number;
  rating: string; // 'TV-MA' | 'PG-13' | 'TV-14'
  duration?: string; // '2h 14m' for movies or '3 Seasons'
  matchScore: number; // e.g. 98
  genres: string[];
  tones: string[];
  badges: string[]; // e.g. ['4K HDR', 'Dolby Atmos', 'Created For You', 'New Episode Today']
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
  stats: {
    titlesGenerated: number;
    episodesWatched: number;
    canonInterventions: number;
  };
}

export interface CanonContradiction {
  sceneLocation: string;
  conflictingFact: string;
  severity: 'High Conflict' | 'Medium Divergence' | 'Mild Inconsistency';
  suggestedFix: string;
}
