import React, { useState } from 'react';
import { X, Play, Plus, Check, Sparkles, Compass, ShieldCheck, Database, Film, Tv, Clock, Star } from 'lucide-react';
import { Title, Episode } from '../../types/content';
import { artSrc } from '../../utils/art';
import { EpisodeList } from './EpisodeList';
import { CastRoster } from './CastRoster';
import { WhyCreatedDrawer } from './WhyCreatedDrawer';

interface TitleDetailModalProps {
  title: Title | null;
  onClose: () => void;
  onPlay: (title: Title) => void;
  onPlayEpisode: (episode: Episode) => void;
  onOpenDirectStudio: (title: Title) => void;
  onOpenCanonAnalysis: (title: Title) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (titleId: string) => void;
}

export const TitleDetailModal: React.FC<TitleDetailModalProps> = ({
  title,
  onClose,
  onPlay,
  onPlayEpisode,
  onOpenDirectStudio,
  onOpenCanonAnalysis,
  isInWatchlist,
  onToggleWatchlist
}) => {
  const [activeTab, setActiveTab] = useState<'episodes' | 'cast' | 'why' | 'lore'>('episodes');

  if (!title) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 md:p-6 animate-fade-in">
      {/* Click backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative z-10 w-full max-w-5xl rounded-none sm:rounded-2xl bg-[#0e0e17] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black text-white hover:scale-110 active:scale-95 transition-all border border-white/10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 no-scrollbar">
          {/* Hero Backdrop Header Inside Modal */}
          <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full overflow-hidden bg-[#151522]">
            <img
              src={artSrc(title.backdropUrl, title.title, 'backdrop')}
              alt={title.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Multi-layered Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e17] via-[#0e0e17]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e17] via-transparent to-transparent" />

            {/* In-Header Title & CTAs */}
            <div className="absolute bottom-6 left-6 right-6 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2.5 py-1 rounded-md border border-purple-500/30">
                  {title.universeName}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {title.matchScore}% Match
                </span>
              </div>

              <h2 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-none drop-shadow-xl">
                {title.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Play Main */}
                <button
                  onClick={() => onPlay(title)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-white hover:bg-gray-200 text-black font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>{title.continueWatching ? 'Resume Story' : 'Play Teaser / Scene'}</span>
                </button>

                {/* Direct Story Button */}
                <button
                  onClick={() => onOpenDirectStudio(title)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Direct Story (Edit Canon)</span>
                </button>

                {/* Watchlist */}
                <button
                  onClick={() => onToggleWatchlist(title.id)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isInWatchlist
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                  title={isInWatchlist ? 'In My List' : 'Add to My List'}
                >
                  {isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Metadata & Synopsis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 border-b border-white/10">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 font-medium">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">{title.rating}</span>
                  <span>{title.releaseYear}</span>
                  <span>{title.duration || `${title.totalSeasons} Seasons`}</span>
                  <span className="text-purple-400 font-semibold">{title.canonStatus}</span>
                  <div className="flex gap-1.5">
                    {title.badges.map((b, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {title.synopsis}
                </p>
              </div>

              {/* Sidebar Quick Specs */}
              <div className="space-y-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-gray-400 block font-medium">Genres:</span>
                  <span className="text-white font-semibold">{title.genres.join(', ')}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Mood & Tone:</span>
                  <span className="text-purple-300 font-semibold">{title.tones.join(', ')}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Universe Anchor:</span>
                  <span className="text-cyan-300 font-semibold">{title.universeName}</span>
                </div>
                <button
                  onClick={() => onOpenCanonAnalysis(title)}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 hover:text-white text-xs font-semibold border border-purple-500/30 transition-all flex items-center justify-center space-x-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Canon Continuity Check</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 space-x-6 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('episodes')}
                className={`pb-3 transition-colors relative flex items-center space-x-2 ${
                  activeTab === 'episodes' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Episodes & Slate</span>
                {activeTab === 'episodes' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('cast')}
                className={`pb-3 transition-colors relative flex items-center space-x-2 ${
                  activeTab === 'cast' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Generated Cast</span>
                {activeTab === 'cast' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('why')}
                className={`pb-3 transition-colors relative flex items-center space-x-2 ${
                  activeTab === 'why' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Database className="w-4 h-4 text-purple-400" />
                <span>Why This Was Created</span>
                {activeTab === 'why' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                )}
              </button>
            </div>

            {/* Tab Panels */}
            {activeTab === 'episodes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Season 1: Original Arc</h3>
                  <span className="text-xs text-gray-400">{title.episodes.length} Episodes Generated</span>
                </div>
                <EpisodeList episodes={title.episodes} onPlayEpisode={onPlayEpisode} />
              </div>
            )}

            {activeTab === 'cast' && (
              <CastRoster characters={title.cast} />
            )}

            {activeTab === 'why' && (
              <WhyCreatedDrawer factors={title.whyCreated} universeName={title.universeName} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
