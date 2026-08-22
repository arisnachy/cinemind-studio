import React from 'react';
import { Sparkles, Database, TrendingUp, UserCheck, Activity, Cpu } from 'lucide-react';
import { WhyCreatedFactor } from '../../types/content';

interface WhyCreatedDrawerProps {
  factors: WhyCreatedFactor[];
  universeName: string;
}

const getScoreColor = (score: string) => {
  switch (score) {
    case 'Very High':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'High':
      return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
    case 'Core Habit':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'Rising':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    default:
      return 'bg-white/10 text-gray-300 border-white/20';
  }
};

export const WhyCreatedDrawer: React.FC<WhyCreatedDrawerProps> = ({ factors, universeName }) => {
  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-purple-600/30 text-purple-300 mt-0.5">
          <Database className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
            <span>Why This Title Was Generated For You</span>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
              ClickHouse Memory Vector
            </span>
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            CINEMIND doesn't pull from a static catalog. This title was synthesized by the Showrunner Agent by retrieving your declared taste preferences and behavioral engagement patterns stored in ClickHouse.
          </p>
        </div>
      </div>

      {/* Factor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factors.map((f, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-white text-sm">{f.factor}</h5>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(f.affinityScore)}`}>
                {f.affinityScore}
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {f.description}
            </p>

            <div className="pt-2 border-t border-white/5 flex items-center space-x-2 text-[10px] font-mono text-purple-400">
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="truncate">{f.sourceSignal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
