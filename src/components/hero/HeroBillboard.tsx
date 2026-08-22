import React, { useState } from 'react';
import { Play, Info, Sparkles, Volume2, VolumeX, Plus, Check, Compass, ShieldAlert, Cpu } from 'lucide-react';
import { Title } from '../../types/content';
import { artSrc } from '../../utils/art';

interface HeroBillboardProps {
  title: Title;
  onPlay: (title: Title) => void;
  onOpenDetails: (title: Title) => void;
  onOpenDirectStudio: (title: Title) => void;
  onOpenCanonAnalysis: (title: Title) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (titleId: string) => void;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({
  title,
  onPlay,
  onOpenDetails,
  onOpenDirectStudio,
  onOpenCanonAnalysis,
  isInWatchlist,
  onToggleWatchlist
}) => {
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="relative w-full h-[85vh] min-h-[620px] max-h-[920px] overflow-hidden select-none bg-[#0a0a0f]">
      <div className="absolute inset-0">
        <img src={artSrc(title.backdropUrl, title.title, 'backdrop')} alt={title.title} className="w-full h-full object-cover object-center transform scale-105 animate-pulse-subtle" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
      </div>
      <div className="relative z-20 max-w-[1720px] h-full mx-auto px-4 sm:px-8 flex flex-col justify-end pb-24 md:pb-32 lg:pb-36">
        <div className="max-w-3xl space-y-4 lg:space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-600/80 text-white font-semibold shadow-lg shadow-purple-900/40 backdrop-blur-md border border-purple-400/30"><Sparkles className="w-3.5 h-3.5" /><span>Created For Your Taste Profile</span></span>
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/10 text-cyan-300 font-semibold backdrop-blur-md border border-white/10"><Compass className="w-3.5 h-3.5" /><span>Universe: {title.universeName}</span></span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">{title.matchScore}% Match</span>
          </div>
          <div className="space-y-1">
            <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-white drop-shadow-2xl uppercase leading-[0.95]">{title.title}</h1>
            <p className="text-sm sm:text-lg text-purple-300 font-medium tracking-wide drop-shadow">{title.tagline}</p>
          </div>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed line-clamp-3 max-w-2xl drop-shadow-md">{title.synopsis}</p>
          <div className="flex items-center space-x-3 text-xs sm:text-sm text-gray-300 font-medium">
            <span className="px-2 py-0.5 rounded bg-white/15 text-white font-semibold border border-white/10">{title.rating}</span><span>{title.duration || `${title.totalSeasons} Seasons`}</span><span className="text-gray-500">•</span><span className="text-purple-300">{title.genres.slice(0, 3).join(' • ')}</span><span className="text-gray-500">•</span><span className="hidden sm:inline text-gray-400">{title.tones.slice(0, 2).join(', ')}</span>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
            <button onClick={() => onPlay(title)} className="flex items-center space-x-2.5 px-6 sm:px-8 py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-950 font-bold text-sm sm:text-base shadow-2xl hover:scale-105 active:scale-95 transition-all"><Play className="w-5 h-5 fill-current text-black" /><span>{title.continueWatching ? `Resume S${title.continueWatching.seasonNumber}:E${title.continueWatching.episodeNumber}` : 'Watch Teaser & Scenes'}</span></button>
            <button onClick={() => onOpenDetails(title)} className="flex items-center space-x-2 px-5 sm:px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/10 hover:border-white/30 hover:scale-105 active:scale-95 transition-all"><Info className="w-5 h-5" /><span>More Info</span></button>
            <button onClick={() => onOpenDirectStudio(title)} className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 hover:text-white font-semibold text-xs sm:text-sm backdrop-blur-md border border-purple-500/40 hover:scale-105 active:scale-95 transition-all"><Sparkles className="w-4 h-4 text-purple-300" /><span className="hidden sm:inline">Direct Story</span></button>
            <button onClick={() => onToggleWatchlist(title.id)} className={`p-3 rounded-xl backdrop-blur-md border transition-all ${isInWatchlist ? 'bg-purple-600/40 text-purple-200 border-purple-500/50' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}>{isInWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>
      <div className="absolute right-4 sm:right-8 bottom-28 sm:bottom-36 z-20 flex items-center space-x-3">
        <button onClick={() => onOpenCanonAnalysis(title)} className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-purple-900/60 text-gray-300 hover:text-white text-xs border border-white/10 hover:border-purple-500/40 backdrop-blur-md transition-all"><Cpu className="w-3.5 h-3.5 text-purple-400" /><span>Canon Health: 99.8%</span></button>
        <button onClick={() => setIsMuted(!isMuted)} className="p-3 rounded-full bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white border border-white/10 backdrop-blur-md transition-all">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-purple-400" />}</button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent pointer-events-none" />
    </div>
  );
};
