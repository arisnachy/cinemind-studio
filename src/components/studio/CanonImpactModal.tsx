import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, RefreshCw, GitFork, CheckCircle2, Sparkles, Database, Search } from 'lucide-react';
import { Title, CanonContradiction } from '../../types/content';
import { studioApi } from '../../services/api';

interface CanonImpactModalProps {
  title: Title | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyResolution: (resolution: 'preserve' | 'rewrite' | 'fork') => void;
}

export const CanonImpactModal: React.FC<CanonImpactModalProps> = ({ title, isOpen, onClose, onApplyResolution }) => {
  const [requestedChange, setRequestedChange] = useState('Make a major story change while preserving everything already established.');
  const [contradictions, setContradictions] = useState<CanonContradiction[]>([]);
  const [summary, setSummary] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<'preserve' | 'rewrite' | 'fork'>('rewrite');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !title) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true); setError(null); setSummary(''); setContradictions([]);
    try {
      const result = await studioApi.analyzeCanon({ title, requestedChange });
      setSummary(result.summary);
      setContradictions(result.contradictions as CanonContradiction[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Canon analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolve = async () => {
    setIsProcessing(true); setError(null);
    try {
      const result = await studioApi.resolveCanon({ title, strategy: selectedResolution, requestedChange });
      setSuccessMessage(`${result.message} Canon version: ${result.canonVersion}.`);
      window.setTimeout(() => {
        onApplyResolution(selectedResolution);
        setSuccessMessage(null);
        onClose();
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Canon resolution failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={() => !isProcessing && !isAnalyzing && onClose()} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-[#0e0e17] border border-pink-500/40 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-900/40"><ShieldAlert className="w-5 h-5 text-white" /></div>
            <div><h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-tight">Canon Impact Analysis</h2><p className="text-xs text-gray-300 mt-0.5">Gemini Continuity Guardian + ClickHouse MCP · <strong className="text-purple-300">{title.universeName}</strong></p></div>
          </div>
          {!isProcessing && !isAnalyzing && <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="w-5 h-5" /></button>}
        </div>

        {error && <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200">{error}</div>}

        {!successMessage ? <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Director change request</label>
            <textarea value={requestedChange} onChange={(e) => setRequestedChange(e.target.value)} rows={3} className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-pink-500 p-3.5 text-sm text-white focus:outline-none" />
            <button onClick={handleAnalyze} disabled={isAnalyzing} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold disabled:opacity-60">{isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {isAnalyzing ? 'Querying canon memory…' : 'Analyze Impact'}</button>
          </div>

          {summary && <div className="p-4 rounded-xl bg-pink-950/30 border border-pink-500/30 flex items-start space-x-3"><AlertCircle className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" /><div className="text-xs space-y-1"><h4 className="font-bold text-white text-sm">Continuity verdict</h4><p className="text-gray-300 leading-relaxed">{summary}</p><p className="text-[10px] text-pink-300 flex items-center gap-1"><Database className="w-3 h-3" /> Established memory is queried through the official ClickHouse MCP runtime when configured.</p></div></div>}

          {contradictions.length > 0 && <div className="space-y-3"><h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Detected conflicts</h4>{contradictions.map((c, idx) => <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs"><div className="flex items-center justify-between gap-3"><span className="font-bold text-white">{c.sceneLocation}</span><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">{c.severity}</span></div><p className="text-gray-300">{c.conflictingFact}</p><p className="text-purple-300 italic pt-1 border-t border-white/5">Proposed fix: {c.suggestedFix}</p></div>)}</div>}

          {summary && <div className="space-y-3"><h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Resolution strategy</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => setSelectedResolution('rewrite')} className={`p-3.5 rounded-xl border text-left ${selectedResolution === 'rewrite' ? 'bg-purple-900/40 border-purple-500' : 'bg-white/5 border-white/10'}`}><div className="flex items-center space-x-2 text-purple-400 font-bold text-xs"><RefreshCw className="w-4 h-4" /><span>Rewrite affected scenes</span></div><p className="text-[11px] text-gray-400 mt-1">Change only impacted material, then revalidate.</p></button>
            <button onClick={() => setSelectedResolution('fork')} className={`p-3.5 rounded-xl border text-left ${selectedResolution === 'fork' ? 'bg-cyan-900/40 border-cyan-500' : 'bg-white/5 border-white/10'}`}><div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs"><GitFork className="w-4 h-4" /><span>Fork timeline</span></div><p className="text-[11px] text-gray-400 mt-1">Preserve primary canon and create an alternate branch.</p></button>
            <button onClick={() => setSelectedResolution('preserve')} className={`p-3.5 rounded-xl border text-left ${selectedResolution === 'preserve' ? 'bg-emerald-900/40 border-emerald-500' : 'bg-white/5 border-white/10'}`}><div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs"><CheckCircle2 className="w-4 h-4" /><span>Preserve canon</span></div><p className="text-[11px] text-gray-400 mt-1">Adapt the request within established constraints.</p></button>
          </div></div>}

          {summary && <div className="pt-2 flex justify-end"><button onClick={handleResolve} disabled={isProcessing} className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-sm disabled:opacity-50">{isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}<span>{isProcessing ? 'Applying resolution…' : 'Execute Canon Resolution'}</span></button></div>}
        </div> : <div className="py-10 text-center space-y-4 animate-fade-in"><div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-8 h-8" /></div><h3 className="font-display font-black text-2xl text-white">Continuity Resolution Applied</h3><p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto">{successMessage}</p></div>}
      </div>
    </div>
  );
};
