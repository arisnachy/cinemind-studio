import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Title } from '../../types/content';
import { ContentCard } from './ContentCard';

interface ContentRailProps {
  title: string;
  subtitle?: string;
  badge?: string;
  titles: Title[];
  onPlay: (title: Title) => void;
  onOpenDetails: (title: Title) => void;
  onOpenDirectStudio: (title: Title) => void;
  watchlist: string[];
  onToggleWatchlist: (titleId: string) => void;
  isContinueWatching?: boolean;
}

export const ContentRail: React.FC<ContentRailProps> = ({
  title,
  subtitle,
  badge,
  titles,
  onPlay,
  onOpenDetails,
  onOpenDirectStudio,
  watchlist,
  onToggleWatchlist,
  isContinueWatching = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!titles || titles.length === 0) return null;

  return (
    <section className="relative my-6 sm:my-8 group/rail">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8 mb-3 flex items-end justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white group-hover/rail:text-purple-300 transition-colors">{title}</h2>
            {badge && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1"><Sparkles className="w-2.5 h-2.5" /><span>{badge}</span></span>}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="relative">
        {showLeftArrow && <button onClick={() => scroll('left')} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/75 hover:bg-purple-950/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl opacity-0 group-hover/rail:opacity-100 transition-all hover:scale-110 active:scale-95" aria-label="Scroll left"><ChevronLeft className="w-6 h-6" /></button>}
        {showRightArrow && <button onClick={() => scroll('right')} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/75 hover:bg-purple-950/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl opacity-0 group-hover/rail:opacity-100 transition-all hover:scale-110 active:scale-95" aria-label="Scroll right"><ChevronRight className="w-6 h-6" /></button>}
        <div ref={scrollRef} onScroll={handleScroll} className="flex items-center space-x-3 sm:space-x-4 overflow-x-auto no-scrollbar px-4 sm:px-8 py-4 scroll-smooth">
          {titles.map((item) => <ContentCard key={item.id} title={item} onPlay={onPlay} onOpenDetails={onOpenDetails} onOpenDirectStudio={onOpenDirectStudio} isInWatchlist={watchlist.includes(item.id)} onToggleWatchlist={onToggleWatchlist} isContinueWatching={isContinueWatching} />)}
        </div>
      </div>
    </section>
  );
};
