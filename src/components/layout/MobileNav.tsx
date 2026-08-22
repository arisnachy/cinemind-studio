import React from 'react';
import { Home, Compass, Bookmark, Sparkles, Search } from 'lucide-react';

interface MobileNavProps { currentTab: string; onSelectTab: (tab: string) => void; onOpenSearch: () => void; onOpenCreateStudio: () => void; }

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, onOpenSearch, onOpenCreateStudio }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-pb">
    <div className="flex items-center justify-around">
      <button onClick={() => onSelectTab('home')} className={`flex flex-col items-center p-2 ${currentTab === 'home' ? 'text-purple-400' : 'text-gray-400'}`}><Home className="w-5 h-5" /><span className="text-[10px] mt-1">Home</span></button>
      <button onClick={onOpenSearch} className="flex flex-col items-center p-2 text-gray-400"><Search className="w-5 h-5" /><span className="text-[10px] mt-1">Search</span></button>
      <button onClick={onOpenCreateStudio} className="-mt-5 p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl border-2 border-[#0a0a0f]"><Sparkles className="w-5 h-5" /></button>
      <button onClick={() => onSelectTab('universes')} className={`flex flex-col items-center p-2 ${currentTab === 'universes' ? 'text-purple-400' : 'text-gray-400'}`}><Compass className="w-5 h-5" /><span className="text-[10px] mt-1">Universes</span></button>
      <button onClick={() => onSelectTab('watchlist')} className={`flex flex-col items-center p-2 ${currentTab === 'watchlist' ? 'text-purple-400' : 'text-gray-400'}`}><Bookmark className="w-5 h-5" /><span className="text-[10px] mt-1">My List</span></button>
    </div>
  </div>
);
