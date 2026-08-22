import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Compass, Film, Tv, ArrowRight } from 'lucide-react';
import { Title, Universe } from '../../types/content';
import { ContentCard } from '../rails/ContentCard';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  titles: Title[];
  universes: Universe[];
  onPlay: (title: Title) => void;
  onOpenDetails: (title: Title) => void;
  onOpenDirectStudio: (title: Title) => void;
  watchlist: string[];
  onToggleWatchlist: (titleId: string) => void;
}

const SAMPLE_TAGS = [
  'Cyberpunk & Neon',
  'Hard Sci-Fi Orbital',
  'Psychological Mystery',
  'Deep Ocean Horror',
  'Autonomous Slate',
  'Under 35 Minutes'
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  titles,
  universes,
  onPlay,
  onOpenDetails,
  onOpenDirectStudio,
  watchlist,
  onToggleWatchlist
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTitles = query.trim()
    ? titles.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.synopsis.toLowerCase().includes(q) ||
          t.universeName.toLowerCase().includes(q) ||
          t.genres.some((g) => g.toLowerCase().includes(q)) ||
          t.tones.some((tone) => tone.toLowerCase().includes(q)) ||
          t.cast.some((c) => c.name.toLowerCase().includes(q))
        );
      })
    : titles;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0a0f]/95 backdrop-blur-xl animate-fade-in flex flex-col">
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 border-b border-white/10 px-4 sm:px-8 py-5">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-4 w-6 h-6 text-purple-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, characters, universes, or describe a story idea..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-13 pr-12 py-3.5 text-base sm:text-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-4 p-1.5 rounded-full bg-white/10 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>}
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold px-4 flex items-center space-x-1.5 border border-white/10"><span>ESC</span></button>
        </div>

        <div className="max-w-[1720px] mx-auto flex items-center space-x-2 overflow-x-auto no-scrollbar pt-3 text-xs">
          <span className="text-gray-500 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">Explore:</span>
          {SAMPLE_TAGS.map((tag) => <button key={tag} onClick={() => setQuery(tag)} className="px-3 py-1 rounded-full bg-white/5 hover:bg-purple-900/40 text-gray-300 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 whitespace-nowrap transition-all">{tag}</button>)}
        </div>
      </div>

      <div className="flex-1 max-w-[1720px] mx-auto px-4 sm:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-lg">{query.trim() ? `Search Results for "${query}"` : 'All Generated Titles & Slates'}</h3>
          <span className="text-xs text-gray-400">{filteredTitles.length} Titles Available</span>
        </div>

        {filteredTitles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredTitles.map((item) => (
              <ContentCard
                key={item.id}
                title={item}
                onPlay={(t) => { onClose(); onPlay(t); }}
                onOpenDetails={(t) => { onClose(); onOpenDetails(t); }}
                onOpenDirectStudio={(t) => { onClose(); onOpenDirectStudio(t); }}
                isInWatchlist={watchlist.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto animate-pulse" />
            <h4 className="font-bold text-white text-lg">No exact match in current catalog</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">You can synthesize this world now using Director Studio!</p>
          </div>
        )}
      </div>
    </div>
  );
};
