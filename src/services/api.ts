import { ProductionSegment, TasteProfile, Title } from '../types/content';

export interface GenerateTitleRequest {
  prompt: string;
  autonomous: boolean;
  genre: string;
  mood: string;
  format: 'series' | 'movie';
  intensity: number;
  universeId?: string;
  locale: string;
  autoProducePilot?: boolean;
  pilotSeconds?: number;
  profile: TasteProfile;
}

export interface EpisodeRenderSegment extends ProductionSegment {}

export interface EpisodeRenderResult {
  status: string;
  episodeTitle: string;
  locale: string;
  summary: string;
  totalDurationSeconds: number;
  segments: EpisodeRenderSegment[];
  model: string;
  ttsModel?: string;
}

function formatApiError(status: number, raw: string): string {
  if (!raw) return `CINEMIND API error ${status}`;
  try {
    const parsed = JSON.parse(raw);
    const detail = parsed?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      const phase = detail.phase ? `[${detail.phase}] ` : '';
      const type = detail.errorType ? `${detail.errorType}: ` : '';
      return `${phase}${type}${detail.error || raw}`;
    }
  } catch {
    // Keep the raw response below when the server/proxy returned non-JSON text.
  }
  return raw.length > 1200 ? `${raw.slice(0, 1200)}…` : raw;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch (err) {
    throw new Error(`Backend connection failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(formatApiError(response.status, raw));
  }
  return response.json() as Promise<T>;
}

export const studioApi = {
  health: () => api<{ok:boolean; gemini:boolean; clickhouse_mcp:boolean}>('/api/health'),
  generateTitle: (payload: GenerateTitleRequest) => api<Title>('/api/studio/generate', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeCanon: (payload: { title: Title; requestedChange: string }) => api<{contradictions: any[]; summary: string}>('/api/canon/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  resolveCanon: (payload: { title: Title; strategy: string; requestedChange?: string }) => api<{message:string; canonVersion:string}>('/api/canon/resolve', { method: 'POST', body: JSON.stringify(payload) }),
  generateVideo: (payload: { title: Title; episodeId?: string; locale: string }) => api<{status:string; playbackUrl:string; videoUri:string; model:string; durationSeconds:number}>('/api/media/video', { method: 'POST', body: JSON.stringify(payload) }),
  renderEpisode: (payload: { title: Title; episodeId?: string; locale: string; targetSeconds: number; includeNarration: boolean }) => api<EpisodeRenderResult>('/api/episode/render', { method: 'POST', body: JSON.stringify(payload) }),
};
