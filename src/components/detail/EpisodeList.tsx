import React from 'react';
import { Play, Clock, CheckCircle2, FileEdit, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Episode, EpisodeStatus } from '../../types/content';
import { artSrc } from '../../utils/art';

interface EpisodeListProps {
  episodes: Episode[];
  onPlayEpisode: (episode: Episode) => void;
}

const getStatusBadge = (status: EpisodeStatus) => {
  switch (status) {
    case 'Ready':
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>Ready to Watch</span>
        </span>
      );
    case 'Writing':
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
          <FileEdit className="w-3 h-3" />
          <span>Script Generation</span>
        </span>
      );
    case 'Storyboard ready':
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          <ImageIcon className="w-3 h-3" />
          <span>Storyboard Ready</span>
        </span>
      );
    case 'Scene generation':
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 animate-pulse">
          <Sparkles className="w-3 h-3" />
          <span>Scene Rendering</span>
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded">
          Planned Arc
        </span>
      );
  }
};

export const EpisodeList: React.FC<EpisodeListProps> = ({ episodes, onPlayEpisode }) => {
  if (!episodes || episodes.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="text-sm">No episodes generated yet in this season arc.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {episodes.map((ep) => (
        <div
          key={ep.id}
          onClick={() => onPlayEpisode(ep)}
          className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3.5 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer group"
        >
          {/* Episode Thumbnail & Progress Overlay */}
          <div className="relative w-full sm:w-44 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-gray-900">
            <img
              src={artSrc(ep.thumbnailUrl, ep.title, 'thumb')}
              alt={ep.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>

            {/* Duration Tag */}
            <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-gray-200">
              {ep.durationMinutes}m
            </span>

            {/* Watch Progress Bar */}
            {ep.watchedPercentage !== undefined && ep.watchedPercentage > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${ep.watchedPercentage}%` }}
                />
              </div>
            )}
          </div>

          {/* Episode Metadata */}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-400 text-sm">
                  {ep.episodeNumber}.
                </span>
                <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-purple-300 transition-colors">
                  {ep.title}
                </h4>
              </div>
              {getStatusBadge(ep.status)}
            </div>

            <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
              {ep.synopsis}
            </p>

            {ep.directorNotes && (
              <p className="text-[11px] text-purple-400 italic pt-0.5">
                Continuity Note: {ep.directorNotes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
