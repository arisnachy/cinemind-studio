import React from 'react';
import { Film, Sparkles, Database, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#07070b] pt-14 pb-24 md:pb-14 text-xs text-gray-400 mt-20">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/5">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5"><div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center"><Film className="w-3.5 h-3.5 text-white" /></div><span className="font-display font-black tracking-widest text-lg text-white">CINEMIND</span></div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">The streaming catalog that does not exist until you arrive. Original fictional universes, multi-agent continuity, and real-time narrative synthesis.</p>
            <div className="flex items-center space-x-2 text-[11px] text-purple-400"><Sparkles className="w-3.5 h-3.5" /><span>Agentic Cinema · Blockbuster Hackathon</span></div>
          </div>
          <div><h4 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">Platform</h4><ul className="space-y-2 text-gray-400"><li>Autonomous Showrunner</li><li>Persistent World Lore</li><li>Canon Impact Analysis</li><li>Taste Signal Vectors</li></ul></div>
          <div><h4 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">Narrative Engine</h4><ul className="space-y-2 text-gray-400"><li className="flex items-center space-x-1.5"><Database className="w-3.5 h-3.5 text-amber-400" /><span>ClickHouse Narrative Memory (MCP)</span></li><li className="flex items-center space-x-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /><span>Google Cloud Agent Builder / ADK</span></li><li className="flex items-center space-x-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /><span>Original CINEMIND Assets</span></li></ul></div>
          <div><h4 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px]">Hackathon Compliance</h4><p className="text-[11px] leading-relaxed text-gray-500">All universes, titles, characters and storylines in the demo are original fictional CINEMIND content.</p><div className="mt-3 text-[10px] text-gray-500 font-mono">Apache-2.0 · Build v0.2.0</div></div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-[11px] gap-4"><p>© 2026 CINEMIND Studio.</p><div className="flex space-x-6"><span>Privacy</span><span>Terms</span><span>Canon Rules</span></div></div>
      </div>
    </footer>
  );
};
