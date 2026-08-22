import React, { useState } from 'react';
import { X, ShieldCheck, Database, Calendar, User, MapPin, Sparkles, BookOpen, AlertTriangle, Cpu } from 'lucide-react';
import { Universe, Title } from '../../types/content';
import { artSrc } from '../../utils/art';

interface UniverseDetailModalProps {
  universe: Universe | null;
  titles: Title[];
  onClose: () => void;
  onOpenTitle: (title: Title) => void;
  onOpenDirectStudio: (universe: Universe) => void;
}

export const UniverseDetailModal: React.FC<UniverseDetailModalProps> = ({
  universe,
  titles,
  onClose,
  onOpenTitle,
  onOpenDirectStudio
}) => {
  const [tab, setTab] = useState<'timeline' | 'rules' | 'facts' | 'characters' | 'locations'>('timeline');

  if (!universe) return null;

  const universeTitles = titles.filter((t) => t.universeId === universe.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 md:p-6 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl rounded-none sm:rounded-2xl bg-[#0e0e17] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black text-white hover:scale-110 active:scale-95 transition-all border border-white/10"><X className="w-5 h-5" /></button>

        <div className="overflow-y-auto flex-1 no-scrollbar">
          <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full overflow-hidden bg-[#151522]">
            <img src={artSrc(universe.heroBackdropUrl, universe.name, 'backdrop')} alt={universe.name} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e17] via-[#0e0e17]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e17] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/30">Persistent Fictional Universe</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center space-x-1"><ShieldCheck className="w-3.5 h-3.5" /><span>{universe.canonHealthPercent}% Canon Health</span></span>
                <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">{universe.canonVersion}</span>
              </div>
              <h2 className="font-display font-black text-3xl sm:text-5xl text-white uppercase tracking-tight leading-none drop-shadow-xl">{universe.name}</h2>
              <p className="text-sm sm:text-base text-purple-300 font-medium">{universe.tagline}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="space-y-4">
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{universe.premise}</p>
              <div>
                <h4 className="font-bold text-white text-sm mb-3">Active Titles & Series in this Universe</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {universeTitles.map((t) => (
                    <div key={t.id} onClick={() => onOpenTitle(t)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer flex items-center space-x-3">
                      <img src={artSrc(t.backdropUrl, t.title, 'thumb')} alt={t.title} className="w-16 h-12 object-cover rounded-lg" />
                      <div><h5 className="font-bold text-white text-xs line-clamp-1">{t.title}</h5><p className="text-[10px] text-gray-400">{t.type === 'series' ? `${t.totalSeasons} Seasons` : t.duration}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex border-b border-white/10 space-x-6 text-sm font-semibold overflow-x-auto no-scrollbar">
              {[
                { id: 'timeline', label: 'Canon Timeline', icon: Calendar },
                { id: 'rules', label: 'World Rules', icon: BookOpen },
                { id: 'facts', label: 'Canon Facts Index', icon: Database },
                { id: 'characters', label: 'Character Graph', icon: User },
                { id: 'locations', label: 'Locations', icon: MapPin }
              ].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id as any)} className={`pb-3 transition-colors relative flex items-center space-x-2 whitespace-nowrap ${tab === t.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                  <t.icon className="w-4 h-4" /><span>{t.label}</span>{tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500" />}
                </button>
              ))}
            </div>

            {tab === 'timeline' && (
              <div className="space-y-4">
                {universe.timeline.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-purple-500/30 space-y-6">
                    {universe.timeline.map((event) => (
                      <div key={event.id} className="relative space-y-1">
                        <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 ring-4 ring-[#0e0e17]" />
                        <span className="text-xs font-mono text-cyan-400 font-bold">{event.yearOrEra}</span>
                        <h4 className="font-bold text-white text-sm">{event.title}</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{event.description}</p>
                        <div className="flex gap-2 pt-1 text-[10px] text-gray-400"><span>Characters: {event.affectedCharacters.join(', ')}</span></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 py-6 text-center">Timeline markers indexing in ClickHouse memory...</p>}
              </div>
            )}

            {tab === 'rules' && <div className="space-y-3">{universe.worldRules.map((rule, idx) => <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start space-x-3 text-xs text-gray-300"><span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">{idx + 1}</span><p className="leading-relaxed">{rule}</p></div>)}</div>}

            {tab === 'facts' && <div className="space-y-3">{universe.canonFacts.map((fact) => <div key={fact.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs"><div className="flex items-center justify-between"><span className="font-mono text-purple-400 text-[11px] font-bold">{fact.category}</span><span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Score: {(fact.confidenceScore * 100).toFixed(0)}%</span></div><p className="text-white font-medium">{fact.fact}</p><div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5"><span>Source: {fact.firstEstablishedIn}</span><span>Canon Version: {fact.canonVersion}</span></div></div>)}</div>}

            {tab === 'characters' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{universe.characters.map((c) => <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center space-x-3"><img src={artSrc(c.avatarUrl, c.name, 'avatar')} alt={c.name} className="w-10 h-10 rounded-full object-cover" /><div><h5 className="font-bold text-white text-xs">{c.name}</h5><p className="text-[11px] text-purple-300">{c.role}</p></div></div>)}</div>}

            {tab === 'locations' && <div className="space-y-3">{universe.locations.map((loc, idx) => <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs"><div className="flex items-center justify-between"><h5 className="font-bold text-white text-sm">{loc.name}</h5><span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{loc.type}</span></div><p className="text-gray-300">{loc.description}</p></div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
