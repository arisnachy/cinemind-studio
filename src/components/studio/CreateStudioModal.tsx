import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Film, Tv, Database, ShieldCheck, Image, Volume2, Clapperboard, CheckCircle2, AlertTriangle, Timer, Gauge } from 'lucide-react';
import { ProductionProgress, TasteProfile, Title, Universe } from '../../types/content';
import { studioApi } from '../../services/api';
import { getPreferredLocale } from '../../utils/locale';

interface CreateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleCreated: (newTitle: Title) => void;
  currentProfile: TasteProfile;
  universes: Universe[];
}

const DURATION_PRESETS = [24, 48, 96, 300, 600, 1200] as const;
const MIN_DURATION_SECONDS = 24;
const MAX_DURATION_SECONDS = 1800;
const SHOT_SECONDS = 8;

const STAGE_LABELS: Record<string, string> = {
  queued: 'Production queued',
  planning: 'Writing episode & shot grammar',
  reality_pack: 'Locking photoreal cast & location',
  storyboard: 'Building shared start/end keyframes',
  rendering: 'Rendering Veo shots in parallel',
  composing: 'Composing one continuous master',
  quality: 'Supervising director quality review',
  repair: 'Re-rendering only failed shots',
  ready: 'Viewer-ready master complete',
  failed: 'Production failed quality gate',
};

const STAGE_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
  planning: Film,
  reality_pack: Image,
  storyboard: Clapperboard,
  rendering: Volume2,
  composing: CheckCircle2,
  quality: ShieldCheck,
  repair: Gauge,
  ready: CheckCircle2,
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function durationText(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export const CreateStudioModal: React.FC<CreateStudioModalProps> = ({ isOpen, onClose, onTitleCreated, currentProfile, universes }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState('new');
  const [selectedGenre, setSelectedGenre] = useState('Psychological Thriller');
  const [selectedMood, setSelectedMood] = useState('Atmospheric & Suspenseful');
  const [format, setFormat] = useState<'series' | 'movie'>('series');
  const [intensity, setIntensity] = useState(85);
  const [durationSeconds, setDurationSeconds] = useState(48);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProductionProgress>({ stage: 'planning', completed: 0, total: 1, percent: 0, message: 'Writing story architecture' });

  useEffect(() => {
    if (!isOpen) {
      setIsGenerating(false);
      setError(null);
      setProgress({ stage: 'planning', completed: 0, total: 1, percent: 0, message: 'Writing story architecture' });
    }
  }, [isOpen]);

  const selectedUniverseLabel = useMemo(() => universes.find((u) => u.id === selectedUniverse)?.name, [universes, selectedUniverse]);
  const shotCount = Math.ceil(durationSeconds / SHOT_SECONDS);
  const effectiveDuration = shotCount * SHOT_SECONDS;
  if (!isOpen) return null;

  const StageIcon = STAGE_ICONS[progress.stage] ?? Clapperboard;
  const stageLabel = STAGE_LABELS[progress.stage] ?? progress.message ?? 'Producing';

  const start = async (autonomous = false) => {
    setIsGenerating(true);
    setError(null);
    setProgress({ stage: 'planning', completed: 0, total: 1, percent: 1, message: 'Writing story architecture' });
    try {
      const queuedTitle = await studioApi.generateTitle({
        prompt: autonomous ? '' : prompt,
        autonomous,
        genre: selectedGenre,
        mood: selectedMood,
        format,
        intensity,
        universeId: selectedUniverse,
        locale: getPreferredLocale(),
        autoProducePilot: true,
        pilotSeconds: durationSeconds,
        profile: currentProfile,
      });

      if (queuedTitle.productionStatus === 'FAILED') throw new Error(queuedTitle.productionError || 'Production failed before it could start.');
      const jobId = queuedTitle.productionJobId;
      if (!jobId) throw new Error('CINEMIND did not return a production job id.');

      // Real progress polling. The backend performs all expensive generation after
      // returning the job id, so the UI no longer waits on one giant HTTP request.
      for (;;) {
        await sleep(1500);
        const job = await studioApi.getProductionJob(jobId);
        setProgress({
          stage: job.stage,
          completed: job.completed,
          total: job.total,
          percent: job.percent,
          message: job.message,
        });
        if (job.status === 'FAILED') throw new Error(job.error || 'Production failed its render/quality gate.');
        if (job.status === 'READY') {
          if (!job.result?.productionPlaybackUrl || !job.result.productionSegments?.length) {
            throw new Error('Production finished without a continuous viewer-ready master.');
          }
          onTitleCreated(job.result);
          setIsGenerating(false);
          onClose();
          return;
        }
      }
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Production failed.');
    }
  };

  const durationLabel = durationSeconds < 48 ? 'Teaser validation' : durationSeconds < 180 ? 'Pilot-style opening' : durationSeconds < 600 ? 'Extended sequence' : 'Long-form episode';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={() => !isGenerating && onClose()} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-[#0e0e17] border border-purple-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div><h2 className="text-2xl font-black text-white">CINEMIND DIRECTOR STUDIO</h2><p className="text-xs text-purple-300 mt-1">Story → Reality Pack → shared keyframes → parallel Veo → quality gate → one master → Play.</p></div>
          {!isGenerating && <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white"><X className="w-5 h-5" /></button>}
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 flex gap-3 text-sm text-red-100"><AlertTriangle className="w-5 h-5 shrink-0 text-red-400"/><div><strong>Production did not pass READY gate.</strong><p className="text-xs mt-1 break-words">{error}</p></div></div>}

        {!isGenerating ? <>
          <div className="rounded-xl bg-gradient-to-r from-purple-950/60 via-pink-950/30 to-black border border-purple-500/30 p-4 flex flex-col sm:flex-row gap-4 justify-between">
            <div><span className="text-[10px] uppercase tracking-wider text-purple-300">Autonomous Showrunner</span><h4 className="font-bold mt-1">Create a complete original production from my taste</h4><p className="text-xs text-gray-400 mt-1">CINEMIND establishes normality before the incident and will reject masters that fail coherence, realism or continuity.</p></div>
            <button onClick={() => start(true)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-sm">Auto Produce</button>
          </div>

          <div className="space-y-2"><label className="text-xs uppercase tracking-wider text-gray-300 font-semibold">Story premise</label><textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={4} placeholder="A physician discovers that some patients remember events that have not happened yet..." className="w-full rounded-xl bg-white/5 border border-white/10 p-3.5 text-sm text-white focus:outline-none focus:border-purple-500"/></div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400">Genre</label><select value={selectedGenre} onChange={(e)=>setSelectedGenre(e.target.value)} className="mt-1 w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs">{['Psychological Thriller','Medical Mystery','Hard Sci-Fi','Cyberpunk','Sci-Fi Horror','Drama','Mystery'].map(g=><option key={g}>{g}</option>)}</select></div>
            <div><label className="text-xs text-gray-400">Tone</label><select value={selectedMood} onChange={(e)=>setSelectedMood(e.target.value)} className="mt-1 w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs">{['Atmospheric & Suspenseful','Character-Driven & Emotional','Fast-Paced & High Stakes','Dark & Cerebral','Epic & Philosophical'].map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label className="text-xs text-gray-400">Narrative memory</label><select value={selectedUniverse} onChange={(e)=>setSelectedUniverse(e.target.value)} className="mt-1 w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs"><option value="new">Create new universe</option>{universes.map(u=><option key={u.id} value={u.id}>Continue {u.name}</option>)}</select>{selectedUniverseLabel && <p className="text-[10px] text-purple-300 mt-1">Canon will be queried before writing.</p>}</div>
            <div><label className="text-xs text-gray-400">Format</label><div className="grid grid-cols-2 gap-2 mt-1"><button onClick={()=>setFormat('series')} className={`py-2 rounded-xl text-xs flex justify-center gap-1 ${format==='series'?'bg-purple-600':'bg-white/5'}`}><Tv className="w-4 h-4"/>Series</button><button onClick={()=>setFormat('movie')} className={`py-2 rounded-xl text-xs flex justify-center gap-1 ${format==='movie'?'bg-purple-600':'bg-white/5'}`}><Film className="w-4 h-4"/>Film</button></div></div>
            <div className="sm:col-span-2"><div className="flex justify-between text-xs text-gray-400"><span>Narrative complexity</span><span>{intensity}%</span></div><input type="range" min="50" max="100" value={intensity} onChange={(e)=>setIntensity(Number(e.target.value))} className="w-full accent-purple-500"/></div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-purple-300"/><div><p className="text-xs font-semibold text-white">Video duration</p><p className="text-[10px] text-gray-500">Choose the final master length. Long form is internally split into ~8-second Veo shots.</p></div></div>
              <div className="text-right"><p className="text-lg font-black text-white">{durationText(durationSeconds)}</p><p className="text-[10px] text-purple-300">{durationLabel} · ≈ {shotCount} shots</p></div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DURATION_PRESETS.map((seconds) => <button key={seconds} type="button" onClick={()=>setDurationSeconds(seconds)} className={`rounded-lg py-2 text-xs font-semibold ${durationSeconds===seconds?'bg-purple-600 text-white':'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{durationText(seconds)}</button>)}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <input type="range" min={MIN_DURATION_SECONDS} max={MAX_DURATION_SECONDS} step={8} value={durationSeconds} onChange={(e)=>setDurationSeconds(Number(e.target.value))} className="w-full accent-purple-500"/>
              <input type="number" min={MIN_DURATION_SECONDS} max={MAX_DURATION_SECONDS} step={8} value={durationSeconds} onChange={(e)=>setDurationSeconds(Math.max(MIN_DURATION_SECONDS, Math.min(MAX_DURATION_SECONDS, Number(e.target.value) || MIN_DURATION_SECONDS)))} className="w-24 rounded-lg bg-[#151522] border border-white/10 px-2 py-1.5 text-xs text-white" aria-label="Duration seconds"/>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500"><span>{MIN_DURATION_SECONDS}s</span><span>Composed master ≈ {durationText(effectiveDuration)}</span><span>30m max</span></div>
            {durationSeconds >= 600 && <p className="text-[10px] text-amber-300">Long-form mode may require roughly {shotCount} Veo generations. CINEMIND queues and parallelizes them instead of keeping one browser request open.</p>}
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[11px] text-gray-300 flex gap-2"><Database className="w-4 h-4 text-purple-300 shrink-0"/><span>Language: <b>{getPreferredLocale()}</b>. Reality Pack and shared keyframes lock the cast/environment before expensive video rendering begins.</span></div>
          <div className="flex justify-end"><button onClick={()=>start(false)} disabled={!prompt.trim()} className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold disabled:opacity-40"><span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/>Generate & Produce · {durationText(durationSeconds)}</span></button></div>
        </> : <div className="py-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center animate-pulse"><StageIcon className="w-8 h-8"/></div>
          <div><h3 className="text-2xl font-black">PRODUCING {durationText(durationSeconds)} MASTER</h3><p className="text-xs text-purple-300 mt-1">Real backend progress — no simulated stage rotation.</p></div>
          <div className="max-w-lg mx-auto rounded-xl bg-white/5 border border-white/10 p-4 text-left space-y-3">
            <div className="flex items-center gap-3"><StageIcon className="w-5 h-5 text-purple-300 animate-pulse"/><div className="min-w-0 flex-1"><p className="text-xs uppercase text-gray-500">{stageLabel}</p><p className="text-sm font-semibold truncate">{progress.message}</p></div><span className="text-lg font-black">{progress.percent}%</span></div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500" style={{width: `${Math.max(2, progress.percent)}%`}}/></div>
            {progress.total > 1 && <p className="text-[10px] text-gray-400 text-right">{progress.completed} / {progress.total}</p>}
          </div>
          <p className="text-[10px] text-gray-500">READY is granted only after the continuous master passes narrative, continuity, realism, opening and language checks.</p>
        </div>}
      </div>
    </div>
  );
};
