import React, { useState, useEffect } from 'react';
import { Search, Bell, Film, Sparkles, ChevronDown, Check, Languages } from 'lucide-react';
import { TasteProfile } from '../../types/content';
import { artSrc } from '../../utils/art';
import { COMMON_LOCALES, getLocaleMode, getPreferredLocale, setPreferredLocale, t } from '../../utils/locale';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenCreateStudio: () => void;
  currentProfile: TasteProfile;
  allProfiles: TasteProfile[];
  onSelectProfile: (profile: TasteProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenSearch, onOpenCreateStudio, currentProfile, allProfiles, onSelectProfile }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [localeMode, setLocaleMode] = useState(getLocaleMode());
  const [effectiveLocale, setEffectiveLocale] = useState(getPreferredLocale());

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    const handleLocale = () => { setLocaleMode(getLocaleMode()); setEffectiveLocale(getPreferredLocale()); };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('cinemind:locale', handleLocale as EventListener);
    document.documentElement.lang = effectiveLocale;
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('cinemind:locale', handleLocale as EventListener);
    };
  }, [effectiveLocale]);

  const chooseLocale = (value: string) => {
    if (value === 'other') {
      const custom = window.prompt('Enter a BCP-47 locale, for example ar-XA, hi-IN, zh-CN, sw-KE, nl-NL:');
      if (!custom?.trim()) return;
      setPreferredLocale(custom.trim());
    } else {
      setPreferredLocale(value);
    }
    setLocaleMode(getLocaleMode());
    setEffectiveLocale(getPreferredLocale());
    setLanguageOpen(false);
  };

  const navLinks = [
    {id:'home',label:t('home', effectiveLocale)},
    {id:'series',label:t('series', effectiveLocale)},
    {id:'movies',label:t('movies', effectiveLocale)},
    {id:'universes',label:t('universes', effectiveLocale)},
    {id:'watchlist',label:t('myList', effectiveLocale)},
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled ? 'bg-[#0a0a0f]/95 backdrop-blur-md shadow-2xl border-b border-white/5 py-3' : 'bg-gradient-to-b from-[#0a0a0f]/90 via-[#0a0a0f]/50 to-transparent py-5'}`}>
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-8 lg:space-x-10">
          <button onClick={() => onSelectTab('home')} className="flex items-center space-x-2.5 group text-left focus:outline-none">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-900/40"><Film className="w-4 h-4 text-white" /></div>
            <div className="flex flex-col"><span className="font-display font-black tracking-widest text-xl lg:text-2xl cinemind-text-gradient uppercase leading-none">CINEMIND</span><span className="text-[9px] font-semibold tracking-widest text-purple-400 uppercase -mt-0.5">STUDIO</span></div>
          </button>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <button key={link.id} onClick={() => onSelectTab(link.id)} className={`relative py-1 transition-colors ${currentTab === link.id ? 'text-white font-semibold' : 'text-gray-400 hover:text-gray-200'}`}>
                {link.label}{currentTab === link.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={onOpenCreateStudio} className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white text-xs font-semibold shadow-lg border border-white/10 hover:scale-105 transition-all"><Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('directorStudio', effectiveLocale)}</span><span className="sm:hidden">{t('create', effectiveLocale)}</span></button>
          <button onClick={onOpenSearch} className="flex items-center space-x-2 text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/5"><Search className="w-4 h-4" /><span className="hidden xl:inline text-xs text-gray-400 bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</span></button>

          <div className="relative">
            <button onClick={() => { setLanguageOpen(!languageOpen); setNotificationsOpen(false); setProfileDropdownOpen(false); }} className="flex items-center gap-1.5 p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/5" title={`${t('language', effectiveLocale)}: ${effectiveLocale}`}>
              <Languages className="w-4 h-4" />
              <span className="hidden xl:inline text-[10px] font-semibold uppercase">{effectiveLocale}</span>
            </button>
            {languageOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl glass-panel p-3 shadow-2xl z-50 border border-white/10">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-[11px] text-gray-400">{t('language', effectiveLocale)}</p>
                  <p className="font-bold text-sm text-white">{effectiveLocale}</p>
                  {localeMode === 'system' && <p className="text-[10px] text-purple-300 mt-0.5">Auto-detected from browser / operating system preference.</p>}
                </div>
                <div className="py-2 max-h-80 overflow-y-auto">
                  {COMMON_LOCALES.map(([value, label]) => (
                    <button key={value} onClick={() => chooseLocale(value)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left ${localeMode === value ? 'bg-purple-600/30 border border-purple-500/40' : 'hover:bg-white/5'}`}>
                      <div><p className="text-xs font-medium text-white">{value === 'system' ? t('systemLanguage', effectiveLocale) : label}</p>{value !== 'system' && <p className="text-[10px] text-gray-500">{value}</p>}</div>
                      {localeMode === value && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                  <button onClick={() => chooseLocale('other')} className="w-full px-3 py-2 rounded-xl text-left hover:bg-white/5 text-xs text-purple-300">{t('otherLanguage', effectiveLocale)}</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileDropdownOpen(false); setLanguageOpen(false); }} className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/5"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" /></button>
            {notificationsOpen && <div className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel p-4 shadow-2xl text-xs z-50"><p className="font-semibold text-white">Autonomous Studio Activity</p><div className="mt-3 p-2.5 rounded-xl bg-white/5"><p className="font-medium text-white">Narrative memory ready</p><p className="text-gray-400 text-[11px] mt-0.5">Live events appear here once Gemini and ClickHouse are configured.</p></div></div>}
          </div>
          <div className="relative">
            <button onClick={() => { setProfileDropdownOpen(!profileDropdownOpen); setNotificationsOpen(false); setLanguageOpen(false); }} className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
              <img src={artSrc(currentProfile.avatar, currentProfile.name, 'avatar')} alt={currentProfile.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-500/50" />
              <span className="hidden lg:inline text-xs font-medium text-gray-200 truncate max-w-[100px]">{currentProfile.name.split(' ')[0]}</span><ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {profileDropdownOpen && <div className="absolute right-0 mt-3 w-72 rounded-2xl glass-panel p-3 shadow-2xl z-50 border border-white/10">
              <div className="px-3 py-2 border-b border-white/10"><p className="text-[11px] text-gray-400">Active Taste Profile</p><p className="font-bold text-sm text-white">{currentProfile.name}</p></div>
              <div className="py-2">{allProfiles.map((p) => <button key={p.id} onClick={() => { onSelectProfile(p); setProfileDropdownOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left ${p.id === currentProfile.id ? 'bg-purple-600/30 border border-purple-500/40' : 'hover:bg-white/5'}`}><div className="flex items-center space-x-2.5"><img src={artSrc(p.avatar, p.name, 'avatar')} alt={p.name} className="w-7 h-7 rounded-full" /><div><p className="text-xs font-medium text-white">{p.name}</p><p className="text-[10px] text-gray-400">{p.topGenres[0]}</p></div></div>{p.id === currentProfile.id && <Check className="w-3.5 h-3.5 text-purple-400" />}</button>)}</div>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
};
