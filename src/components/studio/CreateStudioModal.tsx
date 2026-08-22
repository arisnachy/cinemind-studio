import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Film, Tv, Database, Compass, ShieldCheck, Image, Mic2, Clapperboard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TasteProfile, Title, Universe } from '../../types/content';
import { studioApi } from '../../services/api';
import { getPreferredLocale } from '../../utils/locale';

interface CreateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleCreated: (newTitle: Title) => void;
  currentProfile: TasteProfile;
  universes: Universe[];
}

const PIPELINE = [
  { label: 'Story architecture & canon', icon: Compass },
  { label: 'Characters & season bible', icon: Sparkles },
  { label: 'Episode screenplay & dramatic beats', icon: Film },
  { label: 'Character/location reference lock', icon: Image },
  { label: 'Continuity validation', icon: ShieldCheck },
  { label: 'Veo cinematic shot production', icon: Clapperboard },
  { label: 'Gemini-TTS dialogue & narration', icon: Mic2 },
  { label: 'Packaging playable episode', icon: CheckCircle2 },
];

export const CreateStudioModal: React.FC<CreateStudioModalProps> = ({ isOpen, onClose, onTitleCreated, currentProfile, universes }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState('new');
  const [selectedGenre, setSelectedGenre] = useState('Psychological Thriller');
  const [selectedMood, setSelectedMood] = useState('Atmospheric & Suspenseful');
  const [format, setFormat] = useState<'series' | 'movie'>('series');
  const [intensity, setIntensity] = useState(85);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsGenerating(false);
      setStage(0);
      setError(null);
    }
  }, [isOpen]);

  const selectedUniverseLabel = useMemo(() => universes.find((u) => u.id === selectedUniverse)?.name, [universes, selectedUniverse]);
  if (!isOpen) return null;

  const StageIcon = PIPELINE[stage]?.icon ?? Clapperboard;
  const stageLabel = PIPELINE[stage]?.label ?? 'Producing cinematic episode';

  const start = async (autonomous = false) => {
    setIsGenerating(true);
    setStage(0);
    setError(null);
    // This is an activity indicator, not fake server telemetry: the backend call
    // returns only after the complete one-click production has finished.
    const ticker = window.setInterval(() => setStage((s) => (s + 1) % PIPELINE.length), 9000);
    try {
      const newTitle = await studioApi.generateTitle({
        prompt: autonomous ? '' : prompt,
        autonomous,
        genre: selectedGenre,
        mood: selectedMood,
        format,
        intensity,
        universeId: selectedUniverse,
        locale: getPreferredLocale(),
        autoProducePilot: true,
        pilotSeconds: 48,
        profile: currentProfile,
      });
      window.clearInterval(ticker);
      if (newTitle.productionStatus === 'FAILED') throw new Error(newTitle.productionError || 'The cinematic production failed before it was ready to play.');
      if (newTitle.productionStatus !== 'READY' || !newTitle.productionSegments?.length) throw new Error('CINEMIND created the story but did not return a complete playable production.');
      onTitleCreated(newTitle);
      setIsGenerating(false);
      onClose();
    } catch (err) {
      window.clearInterval(ticker);
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Production failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={() => !isGenerating && onClose()} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-[#0e0e17] border border-purple-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div><h2 className="text-2xl font-black text-white">CINEMIND DIRECTOR STUDIO</h2><p className="text-xs text-purple-300 mt-1">One request → written universe → continuity lock → playable production.</p></div>
          {!isGenerating && <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white"><X className="w-5 h-5" /></button>}
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 flex gap-3 text-sm text-red-100"><AlertTriangle className="w-5 h-5 shrink-0 text-red-400"/><div><strong>Production did not pass READY gate.</strong><p className="text-xs mt-1 break-words">{error}</p></div></div>}

        {!isGenerating ? <>
          <div className="rounded-xl bg-gradient-to-r from-purple-950/60 via-pink-950/30 to-black border border-purple-500/30 p-4 flex flex-col sm:flex-row gap-4 justify-between">
            <div><span className="text-[10px] uppercase tracking-wider text-purple-300">Autonomous Showrunner</span><h4 className="font-bold mt-1">Create a complete original production from my taste</h4><p className="text-xs text-gray-400 mt-1">Includes a ready-to-play 48-second pilot cut with continuity references.</p></div>
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

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[11px] text-gray-300 flex gap-2"><Database className="w-4 h-4 text-purple-300 shrink-0"/><span>Language: <b>{getPreferredLocale()}</b>. One-click production waits for the story, visual references, Veo shots and voice tracks before publishing.</span></div>
          <div className="flex justify-end"><button onClick={()=>start(false)} disabled={!prompt.trim()} className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold disabled:opacity-40"><span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/>Generate & Produce</span></button></div>
        </> : <div className="py-10 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center animate-pulse"><Clapperboard className="w-8 h-8"/></div>
          <div><h3 className="text-2xl font-black">PRODUCING, NOT MOCKING</h3><p className="text-xs text-purple-300 mt-1">CINEMIND will return only when the pilot is ready to play. Veo rendering may take several minutes.</p></div>
          <div className="max-w-md mx-auto rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3 text-left"><StageIcon className="w-5 h-5 text-purple-300 animate-pulse"/><div><p className="text-xs uppercase text-gray-500">Production activity</p><p className="text-sm font-semibold">{stageLabel}</p></div></div>
          <p className="text-[10px] text-gray-500">The activity label rotates while the single backend production job runs; it does not claim exact per-stage telemetry.</p>
        </div>}
      </div>
    </div>
  );
};
