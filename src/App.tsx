import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';
import { HeroBillboard } from './components/hero/HeroBillboard';
import { ContentRail } from './components/rails/ContentRail';
import { TitleDetailModal } from './components/detail/TitleDetailModal';
import { CinemaPlayerModal } from './components/player/CinemaPlayerModal';
import { UniversesView } from './components/universes/UniversesView';
import { UniverseDetailModal } from './components/universes/UniverseDetailModal';
import { CreateStudioModal } from './components/studio/CreateStudioModal';
import { CanonImpactModal } from './components/studio/CanonImpactModal';
import { SearchOverlay } from './components/search/SearchOverlay';
import { MOCK_PROFILES, MOCK_UNIVERSES, MOCK_TITLES } from './data/mockCatalog';
import { Title, Episode, Universe, TasteProfile } from './types/content';
import { Bookmark } from 'lucide-react';

export const App: React.FC = () => {
  // State
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentProfile, setCurrentProfile] = useState<TasteProfile>(MOCK_PROFILES[0]);
  const [titles, setTitles] = useState<Title[]>(MOCK_TITLES);
  const [universes, setUniverses] = useState<Universe[]>(MOCK_UNIVERSES);
  const [watchlist, setWatchlist] = useState<string[]>(['title-neurosync-flagship', 'title-aethelgard-fractured']);

  // Modals & Overlays
  const [selectedTitleForDetail, setSelectedTitleForDetail] = useState<Title | null>(null);
  const [playerState, setPlayerState] = useState<{ isOpen: boolean; title: Title | null; episode?: Episode | null }>({
    isOpen: false,
    title: null,
    episode: null
  });
  const [selectedUniverseForDetail, setSelectedUniverseForDetail] = useState<Universe | null>(null);
  const [isCreateStudioOpen, setIsCreateStudioOpen] = useState(false);
  const [canonAnalysisState, setCanonAnalysisState] = useState<{ isOpen: boolean; title: Title | null }>({
    isOpen: false,
    title: null
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Watchlist Toggle
  const handleToggleWatchlist = (titleId: string) => {
    setWatchlist((prev) =>
      prev.includes(titleId) ? prev.filter((id) => id !== titleId) : [...prev, titleId]
    );
  };

  // Title Created handler from Director Studio
  const handleTitleCreated = (newTitle: Title) => {
    setTitles((prev) => [newTitle, ...prev]);
    // Also open details to immediately explore the generated world
    setTimeout(() => {
      setSelectedTitleForDetail(newTitle);
    }, 400);
  };

  // Featured title for Hero Billboard
  const featuredTitle = titles.find((t) => t.featured) || titles[0];

  // Filtered lists for various rails & tabs
  const continueWatchingTitles = titles.filter((t) => t.continueWatching);
  const seriesTitles = titles.filter((t) => t.type === 'series');
  const movieTitles = titles.filter((t) => t.type === 'movie');
  const shortTitles = titles.filter((t) => t.type === 'short');
  const watchlistTitles = titles.filter((t) => watchlist.includes(t.id));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Top Persistent Streaming Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCreateStudio={() => setIsCreateStudioOpen(true)}
        currentProfile={currentProfile}
        allProfiles={MOCK_PROFILES}
        onSelectProfile={setCurrentProfile}
      />

      {/* Main Viewport Content Routing */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div className="space-y-4">
            {/* Cinematic Hero Region */}
            <HeroBillboard
              title={featuredTitle}
              onPlay={(t) => setPlayerState({ isOpen: true, title: t, episode: t.episodes[0] || null })}
              onOpenDetails={(t) => setSelectedTitleForDetail(t)}
              onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
              onOpenCanonAnalysis={(t) => setCanonAnalysisState({ isOpen: true, title: t })}
              isInWatchlist={watchlist.includes(featuredTitle.id)}
              onToggleWatchlist={handleToggleWatchlist}
            />

            {/* Content Rails Stack */}
            <div className="-mt-16 sm:-mt-24 lg:-mt-32 relative z-20 space-y-2 pb-16">
              {/* Rail 1: Continue Watching */}
              {continueWatchingTitles.length > 0 && (
                <ContentRail
                  title={`Continue Watching for ${currentProfile.name.split(' ')[0]}`}
                  subtitle="Jump right back into your active story arcs"
                  badge="In Progress"
                  titles={continueWatchingTitles}
                  onPlay={(t) => setPlayerState({ isOpen: true, title: t, episode: t.episodes[1] || t.episodes[0] })}
                  onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                  onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  isContinueWatching={true}
                />
              )}

              {/* Rail 2: Created For You: Autonomous Picks */}
              <ContentRail
                title="Created For You: Autonomous Picks"
                subtitle="Synthesized around your deep psychological & hard sci-fi affinities"
                badge="ClickHouse Vector Match"
                titles={titles.filter((t) => t.matchScore >= 95)}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />

              {/* Rail 3: New From Your Universes */}
              <ContentRail
                title="New From Your Universes"
                subtitle="Episodes and spin-offs in worlds you actively follow"
                titles={titles.filter((t) => t.universeId === 'univ-neurosync' || t.universeId === 'univ-aethelgard')}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />

              {/* Rail 4: Because You Like Neo-Noir Cybernetics */}
              <ContentRail
                title="Because You Like Neo-Noir & Cybernetics"
                subtitle="Memory manipulation, synthetic consciousness, and rain-soaked dystopian plots"
                titles={titles.filter((t) => t.genres.includes('Cyberpunk') || t.genres.includes('Neo-Noir'))}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />

              {/* Rail 5: Tonight: 20-35 Minute Stories */}
              <ContentRail
                title="Tonight: 20–35 Minute Stories"
                subtitle="Quick immersive stories calibrated for your evening viewing slot"
                badge="Evening Slot"
                titles={[...shortTitles, ...seriesTitles.slice(1, 3)]}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />

              {/* Rail 6: Original Series Slates */}
              <ContentRail
                title="Original Series Slates"
                subtitle="Multi-episode narrative arcs with persistent character progression"
                titles={seriesTitles}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />

              {/* Rail 7: Feature Length Films */}
              <ContentRail
                title="Feature Length Films"
                subtitle="Standalone cinematic events set within canonical universes"
                titles={movieTitles}
                onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />
            </div>
          </div>
        )}

        {/* Series Tab View */}
        {currentTab === 'series' && (
          <div className="pt-24 pb-20 max-w-[1720px] mx-auto px-4 sm:px-8 space-y-6">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
                Original Generated Series
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Multi-episode story bibles and evolving seasons generated for your taste.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {seriesTitles.map((item) => (
                <div key={item.id} className="w-full">
                  <ContentRail
                    title={item.title}
                    subtitle={`${item.totalSeasons} Seasons · ${item.universeName}`}
                    titles={[item]}
                    onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                    onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                    onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                    watchlist={watchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movies Tab View */}
        {currentTab === 'movies' && (
          <div className="pt-24 pb-20 max-w-[1720px] mx-auto px-4 sm:px-8 space-y-6">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
                Original Feature Films
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Full-length standalone cinematic experiences set across persistent universes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movieTitles.map((item) => (
                <div key={item.id} className="w-full">
                  <ContentRail
                    title={item.title}
                    subtitle={`${item.duration} · ${item.universeName}`}
                    titles={[item]}
                    onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                    onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                    onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                    watchlist={watchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universes Tab View */}
        {currentTab === 'universes' && (
          <UniversesView
            universes={universes}
            titles={titles}
            onSelectUniverse={(u) => setSelectedUniverseForDetail(u)}
            onOpenCreateStudio={() => setIsCreateStudioOpen(true)}
          />
        )}

        {/* Watchlist Tab View */}
        {currentTab === 'watchlist' && (
          <div className="pt-24 pb-20 max-w-[1720px] mx-auto px-4 sm:px-8 space-y-6">
            <div className="pb-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
                  My Watchlist
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Saved titles and universe arcs queued for future viewing.
                </p>
              </div>
              <span className="text-xs text-purple-400 font-semibold">{watchlistTitles.length} Titles Saved</span>
            </div>

            {watchlistTitles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {watchlistTitles.map((item) => (
                  <div key={item.id} className="w-full">
                    <ContentRail
                      title={item.title}
                      subtitle={item.universeName}
                      titles={[item]}
                      onPlay={(t) => setPlayerState({ isOpen: true, title: t })}
                      onOpenDetails={(t) => setSelectedTitleForDetail(t)}
                      onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <Bookmark className="w-12 h-12 text-gray-600 mx-auto" />
                <h4 className="font-bold text-white text-lg">Your list is currently empty</h4>
                <p className="text-xs text-gray-400">
                  Click the "+" button on any content card to add stories to your watchlist.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Dock Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCreateStudio={() => setIsCreateStudioOpen(true)}
      />

      {/* Cinematic Platform Footer */}
      <Footer />

      {/* Modals & Overlays */}
      {/* 1. Title Detail Modal */}
      {selectedTitleForDetail && (
        <TitleDetailModal
          title={selectedTitleForDetail}
          onClose={() => setSelectedTitleForDetail(null)}
          onPlay={(t) => {
            setSelectedTitleForDetail(null);
            setPlayerState({ isOpen: true, title: t, episode: t.episodes[0] || null });
          }}
          onPlayEpisode={(ep) => {
            setPlayerState({ isOpen: true, title: selectedTitleForDetail, episode: ep });
          }}
          onOpenDirectStudio={(t) => {
            setSelectedTitleForDetail(null);
            setIsCreateStudioOpen(true);
          }}
          onOpenCanonAnalysis={(t) => {
            setSelectedTitleForDetail(null);
            setCanonAnalysisState({ isOpen: true, title: t });
          }}
          isInWatchlist={watchlist.includes(selectedTitleForDetail.id)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* 2. Cinema Player Modal */}
      {playerState.isOpen && playerState.title && (
        <CinemaPlayerModal
          title={playerState.title}
          episode={playerState.episode}
          onClose={() => setPlayerState({ isOpen: false, title: null, episode: null })}
        />
      )}

      {/* 3. Universe Lore Detail Modal */}
      {selectedUniverseForDetail && (
        <UniverseDetailModal
          universe={selectedUniverseForDetail}
          titles={titles}
          onClose={() => setSelectedUniverseForDetail(null)}
          onOpenTitle={(t) => {
            setSelectedUniverseForDetail(null);
            setSelectedTitleForDetail(t);
          }}
          onOpenDirectStudio={(u) => {
            setSelectedUniverseForDetail(null);
            setIsCreateStudioOpen(true);
          }}
        />
      )}

      {/* 4. Director Studio Modal */}
      <CreateStudioModal
        isOpen={isCreateStudioOpen}
        onClose={() => setIsCreateStudioOpen(false)}
        onTitleCreated={handleTitleCreated}
        currentProfile={currentProfile}
        universes={universes}
      />

      {/* 5. Canon Impact Analysis Modal */}
      <CanonImpactModal
        title={canonAnalysisState.title || featuredTitle}
        isOpen={canonAnalysisState.isOpen}
        onClose={() => setCanonAnalysisState({ isOpen: false, title: null })}
        onApplyResolution={(resolution) => {
          // Canon resolution applied feedback
        }}
      />

      {/* 6. Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        titles={titles}
        universes={universes}
        onPlay={(t) => setPlayerState({ isOpen: true, title: t, episode: t.episodes[0] || null })}
        onOpenDetails={(t) => setSelectedTitleForDetail(t)}
        onOpenDirectStudio={(t) => setIsCreateStudioOpen(true)}
        watchlist={watchlist}
        onToggleWatchlist={handleToggleWatchlist}
      />
    </div>
  );
};
export default App;
