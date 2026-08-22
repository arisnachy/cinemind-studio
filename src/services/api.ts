import { TasteProfile, Title } from '../types/content';

export interface GenerateTitleRequest {
  prompt: string;
  autonomous: boolean;
  genre: string;
  mood: string;
  format: 'series' | 'movie';
  intensity: number;
  universeId?: string;
  profile: TasteProfile;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `CINEMIND API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const studioApi = {
  health: () => api<{ok:boolean; gemini:boolean; clickhouse_mcp:boolean}>('/api/health'),
  generateTitle: (payload: GenerateTitleRequest) => api<Title>('/api/studio/generate', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeCanon: (payload: { title: Title; requestedChange: string }) => api<{contradictions: any[]; summary: string}>('/api/canon/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  resolveCanon: (payload: { title: Title; strategy: string; requestedChange?: string }) => api<{message:string; canonVersion:string}>('/api/canon/resolve', { method: 'POST', body: JSON.stringify(payload) }),
  generateVideo: (payload: { title: Title; episodeId?: string }) => api<{status:string; playbackUrl:string; videoUri:string; model:string}>('/api/media/video', { method: 'POST', body: JSON.stringify(payload) }),
};
