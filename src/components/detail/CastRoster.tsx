import React from 'react';
import { User, Shield, Target, Key, Network } from 'lucide-react';
import { Character } from '../../types/content';
import { artSrc } from '../../utils/art';

interface CastRosterProps {
  characters: Character[];
}

export const CastRoster: React.FC<CastRosterProps> = ({ characters }) => {
  if (!characters || characters.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="text-sm">No synthetic characters logged for this title yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map((char) => (
        <div
          key={char.id}
          className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/40 transition-all space-y-3"
        >
          {/* Top Avatar & Name */}
          <div className="flex items-center space-x-3">
            <img
              src={artSrc(char.avatarUrl, char.name, 'avatar')}
              alt={char.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40"
            />
            <div>
              <h4 className="font-bold text-white text-base">{char.name}</h4>
              <p className="text-xs text-purple-300 font-medium">{char.role}</p>
            </div>
          </div>

          {/* Visual Descriptor */}
          <div className="text-xs text-gray-300 bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
            <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider block">
              Synthetic Descriptor
            </span>
            <p className="italic">{char.visualDescriptor}</p>
          </div>

          {/* Motivation & Knowledge */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-gray-300">
              <Target className="w-3.5 h-3.5 text-pink-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-white">Goal:</strong> {char.motivation}</span>
            </div>

            <div className="flex items-start space-x-2 text-gray-300">
              <Key className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-white">Knowledge State:</strong> {char.knowledgeState}</span>
            </div>

            {char.relationships && char.relationships.length > 0 && (
              <div className="flex items-start space-x-2 text-gray-300">
                <Network className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">Bonds:</strong> {char.relationships.join(' · ')}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
