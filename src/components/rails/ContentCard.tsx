import React, { useState } from 'react';
import { Play, Plus, Check, Info, ThumbsUp, ThumbsDown, Sparkles, Compass, Clock } from 'lucide-react';
import { Title } from '../../types/content';
import { artSrc } from '../../utils/art';

interface ContentCardProps {
  title: Title;
  onPlay: (title: Title) => void;
  onOpenDetails: (title: Title) => void;
  onOpenDirectStudio: (title: Title) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (titleId: string) => void;
  isContinueWatching?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  onPlay,
  onOpenDetails,
  onOpenDirectStudio,
  isInWatchlist,
  onToggleWatchlist,
  isContinueWatching = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [likedState, setLikedState] = useState<'liked' | 'disliked' | null>(null);

  return (
    <div
      className="relative flex-shrink-0 w-[240px] sm:w-[280px] lg:w-[320px] rounded-xl cursor-pointer group select-none transition-all duration-300 transform-gpu hover:z-30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => onOpenDetails(title)}
        className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#151522] border border-white/10 shadow-lg group-hover:border-purple-500/50 group-hover:shadow-2xl group-hover:shadow-purple-950/60 transition-all duration-300"
      >
        <img
          src={artSrc(title.backdropUrl, title.title, 'backdrop')}
          alt={title.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          {title.badges && title.badges.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/30 backdrop-blur-md">
              {title.badges[0]}
            </span>
          )}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
            {title.matchScore}% Match
          </span>
        </div>
        {!isHovered && (
          <div className="absolute bottom-2.5 left-3 right-3 z-10">
            <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider truncate">{title.universeName}</p>
            <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">{title.title}</h3>
          </div>
        )}
        {isContinueWatching && title.continueWatching && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${title.continueWatching.progressPercentage}%` }} />
          </div>
        )}
      </div>

      {isHovered && (
        <div className="absolute top-0 left-0 right-0 rounded-xl glass-panel p-3.5 shadow-2xl border border-purple-500/40 z-40 animate-scale-in">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <button onClick={(e) => { e.stopPropagation(); onPlay(title); }} className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all" title="Play Trailer / Scene"><Play className="w-4 h-4 fill-current text-black ml-0.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(title.id); }} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isInWatchlist ? 'bg-purple-600 text-white border-purple-400' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'}`} title={isInWatchlist ? 'In My List' : 'Add to My List'}>{isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</button>
              <button onClick={(e) => { e.stopPropagation(); setLikedState(likedState === 'liked' ? null : 'liked'); }} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${likedState === 'liked' ? 'bg-emerald-600/40 text-emerald-300 border-emerald-500' : 'bg-white/10 hover:bg-white/20 text-gray-300 border-white/20'}`} title="Rate Story"><ThumbsUp className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onOpenDetails(title); }} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 hover:scale-110 transition-all" title="Full Details & Episodes"><Info className="w-4 h-4" /></button>
          </div>
          <div onClick={() => onOpenDetails(title)} className="space-y-1">
            <h4 className="font-bold text-white text-sm leading-snug line-clamp-1">{title.title}</h4>
            <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-medium"><span className="text-emerald-400 font-bold">{title.matchScore}% Match</span><span className="px-1 py-0.5 rounded bg-white/10 text-white text-[9px]">{title.rating}</span><span>{title.duration || `${title.totalSeasons} Seasons`}</span></div>
            {isContinueWatching && title.continueWatching && <div className="flex items-center space-x-1.5 text-[10px] text-purple-300 pt-0.5"><Clock className="w-3 h-3" /><span>S{title.continueWatching.seasonNumber}:E{title.continueWatching.episodeNumber} · {title.continueWatching.remainingMinutes}m left</span></div>}
            <div className="flex flex-wrap gap-1 pt-1.5">{title.genres.slice(0, 3).map((g, idx) => <span key={idx} className="text-[9px] text-gray-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{g}</span>)}</div>
          </div>
        </div>
      )}
    </div>
  );
};
