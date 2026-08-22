import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Wand2, CheckCircle2, Film, Tv, ShieldCheck, Database, Compass, AlertTriangle } from 'lucide-react';
import { Title, Universe, TasteProfile } from '../../types/content';
import { studioApi } from '../../services/api';
import { getPreferredLocale } from '../../utils/locale';

interface CreateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleCreated: (newTitle: Title) => void;
  currentProfile: TasteProfile;
  universes: Universe[];
}

const PRODUCTION_STAGES = [
  { id: 'taste', label: 'Querying ClickHouse narrative & taste memory through MCP...', icon: Database },
  { id: 'universe', label: 'Gemini Showrunner is synthesizing world rules & lore...', icon: Compass },
  { id: 'casting', label: 'Character Architect is creating original identities...', icon: Sparkles },
  { id: 'writing', label: 'Episode Writer is drafting narrative arcs...', icon: Film },
  { id: 'continuity', label: 'Continuity Guardian is checking canon constraints...', icon: ShieldCheck },
  { id: 'art', label: 'Gemini image model is generating original key art...', icon: Wand2 },
  { id: 'publish', label: 'Persisting canon facts and publishing to your catalog...', icon: CheckCircle2 },
];

export const CreateStudioModal: React.FC<CreateStudioModalProps> = ({
  isOpen,
  onClose,
  onTitleCreated,
  currentProfile,
  universes,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('new');
  const [selectedGenre, setSelectedGenre] = useState('Cyberpunk');
  const [selectedMood, setSelectedMood] = useState('Atmospheric & Suspenseful');
  const [format, setFormat] = useState<'series' | 'movie'>('series');
  const [intensity, setIntensity] = useState(85);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsGenerating(false);
      setCurrentStageIdx(0);
      setError(null);
    }
  }, [isOpen]);

  const selectedUniverseLabel = useMemo(
    () => universes.find((u) => u.id === selectedUniverse)?.name,
    [universes, selectedUniverse],
  );

  if (!isOpen) return null;

  const handleStartGeneration = async (autonomous = false) => {
    setIsGenerating(true);
    setCurrentStageIdx(0);
    setError(null);

    const ticker = window.setInterval(() => {
      setCurrentStageIdx((current) => Math.min(current + 1, PRODUCTION_STAGES.length - 2));
    }, 1400);

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
        profile: currentProfile,
      });
      window.clearInterval(ticker);
      setCurrentStageIdx(PRODUCTION_STAGES.length - 1);
      await new Promise((resolve) => setTimeout(resolve, 450));
      onTitleCreated(newTitle);
      setIsGenerating(false);
      onClose();
    } catch (err) {
      window.clearInterval(ticker);
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Gemini generation failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={() => !isGenerating && onClose()} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-[#0e0e17] border border-purple-500/30 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-tight">Director Studio</h2>
              <p className="text-xs text-purple-300">Live Google ADK + Gemini production room with ClickHouse memory.</p>
            </div>
          </div>
          {!isGenerating && <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><X className="w-5 h-5" /></button>}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 flex gap-3 text-sm text-red-100">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div><strong>Studio generation failed.</strong><div className="text-xs text-red-200/80 mt-1 break-words">{error}</div></div>
          </div>
        )}

        {!isGenerating ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-pink-950/40 to-black border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">Autonomous Showrunner</span>
                <h4 className="font-bold text-white text-base mt-1">Surprise Me — Build from My Taste Profile</h4>
                <p className="text-xs text-gray-300">Gemini can autonomously synthesize a new title around <span className="text-purple-300 font-semibold">{currentProfile.currentObsession}</span>.</p>
              </div>
              <button onClick={() => handleStartGeneration(true)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-900/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap">Auto Generate</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Story Premise or Creative Brief</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="E.g., A medical mystery on a Caribbean orbital station where patients remember events from the future..." rows={3} className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Primary Genre</label>
                <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500">
                  {['Cyberpunk', 'Hard Sci-Fi', 'Psychological Thriller', 'Medical Mystery', 'Sci-Fi Horror', 'Post-Apocalyptic', 'Quantum Mystery'].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Tone & Mood</label>
                <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500">
                  {['Atmospheric & Suspenseful', 'Fast-Paced & High Stakes', 'Dark & Cerebral', 'Epic & Philosophical', 'Eerie & Chilling'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Narrative Memory</label>
                <select value={selectedUniverse} onChange={(e) => setSelectedUniverse(e.target.value)} className="w-full bg-[#151522] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500">
                  <option value="new">Create a new universe</option>
                  {universes.map((u) => <option key={u.id} value={u.id}>Continue {u.name}</option>)}
                </select>
                {selectedUniverseLabel && <p className="text-[10px] text-purple-300">Existing canon will be queried before generation.</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFormat('series')} className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${format === 'series' ? 'bg-purple-600 text-white border-purple-400' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}><Tv className="w-3.5 h-3.5" /><span>Series</span></button>
                  <button onClick={() => setFormat('movie')} className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${format === 'movie' ? 'bg-purple-600 text-white border-purple-400' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}><Film className="w-3.5 h-3.5" /><span>Film</span></button>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between text-xs text-gray-400"><span>Narrative Complexity</span><span className="text-purple-400 font-bold">{intensity}%</span></div>
                <input type="range" min="50" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer" />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-gray-300">
              Output language: <span className="font-semibold text-purple-300">{getPreferredLocale()}</span>. Change it from the language control in the top navigation.
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => handleStartGeneration(false)} className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-900/50 hover:scale-105 active:scale-95 transition-all"><Sparkles className="w-4 h-4" /><span>Begin Real Production</span></button>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-6 animate-fade-in text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-900/50 animate-pulse"><Sparkles className="w-8 h-8 text-white" /></div>
            <div><h3 className="font-display font-black text-2xl text-white uppercase">Google Agent Studio In Action</h3><p className="text-xs text-purple-300 mt-1">ADK agents, Gemini media generation and ClickHouse memory are executing.</p></div>
            <div className="max-w-md mx-auto space-y-3 text-left">
              {PRODUCTION_STAGES.map((stage, idx) => {
                const completed = idx < currentStageIdx;
                const current = idx === currentStageIdx;
                return <div key={stage.id} className={`flex items-center space-x-3 p-3 rounded-xl border transition-all text-xs ${completed ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : current ? 'bg-purple-950/60 border-purple-500 text-white font-semibold shadow-lg shadow-purple-950/50 scale-105' : 'bg-white/5 border-white/5 text-gray-500 opacity-60'}`}><stage.icon className={`w-4 h-4 flex-shrink-0 ${completed ? 'text-emerald-400' : current ? 'text-purple-400 animate-pulse' : 'text-gray-500'}`} /><span className="flex-1">{stage.label}</span>{completed && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
