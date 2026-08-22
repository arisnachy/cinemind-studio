import React from 'react';
import { Compass, ShieldCheck, Sparkles, Database, Layers, ArrowRight, Plus } from 'lucide-react';
import { Universe, Title } from '../../types/content';
import { artSrc } from '../../utils/art';

interface UniversesViewProps {
  universes: Universe[];
  titles: Title[];
  onSelectUniverse: (universe: Universe) => void;
  onOpenCreateStudio: () => void;
}

export const UniversesView: React.FC<UniversesViewProps> = ({
  universes,
  titles,
  onSelectUniverse,
  onOpenCreateStudio
}) => {
  return (
    <div className="pt-24 pb-20 max-w-[1720px] mx-auto px-4 sm:px-8 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1"><Compass className="w-4 h-4" /><span>Persistent Lore Engine</span></div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">Fictional Universes</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">Each universe is a multi-dimensional narrative ecosystem stored in ClickHouse. Worlds evolve, timelines branch, and canon remains strict across all generated spin-offs.</p>
        </div>

        <button onClick={onOpenCreateStudio} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all"><Plus className="w-4 h-4" /><span>Found New Universe</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {universes.map((univ) => {
          const univTitles = titles.filter((t) => t.universeId === univ.id);
          return (
            <div key={univ.id} onClick={() => onSelectUniverse(univ)} className="rounded-2xl bg-[#12121c] border border-white/10 hover:border-purple-500/50 shadow-xl overflow-hidden cursor-pointer group hover:shadow-2xl hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-900">
                  <img src={artSrc(univ.heroBackdropUrl, univ.name, 'backdrop')} alt={univ.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121c] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-300 bg-black/70 px-2 py-0.5 rounded border border-purple-500/30 backdrop-blur-md">{univ.canonVersion}</span>
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30 backdrop-blur-md"><ShieldCheck className="w-3 h-3" /><span>{univ.canonHealthPercent}% Canon Health</span></span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div><h3 className="font-display font-black text-xl text-white group-hover:text-purple-300 transition-colors uppercase">{univ.name}</h3><p className="text-xs text-purple-400 italic mt-0.5">{univ.tagline}</p></div>
                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">{univ.premise}</p>
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-gray-400">
                    <div className="flex items-center justify-between"><span>Active Titles in Universe:</span><span className="text-white font-semibold">{univTitles.length} Titles</span></div>
                    <div className="flex items-center justify-between"><span>Active Narrative Arc:</span><span className="text-purple-300 font-medium truncate max-w-[180px]">{univ.activeArc}</span></div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-white/5 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-purple-300 group-hover:text-white transition-colors"><span>Explore Timeline & Canon Facts</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
