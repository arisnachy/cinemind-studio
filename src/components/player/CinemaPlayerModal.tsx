import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Subtitles, BookOpen, Film, Sparkles, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Episode, ProductionSegment, Title } from '../../types/content';
import { artSrc } from '../../utils/art';
import { studioApi } from '../../services/api';
import { getPreferredLocale, t } from '../../utils/locale';

interface CinemaPlayerModalProps {
  title: Title | null;
  episode?: Episode | null;
  onClose: () => void;
}

export const CinemaPlayerModal: React.FC<CinemaPlayerModalProps> = ({ title, episode, onClose }) => {
  const locale = getPreferredLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [segments, setSegments] = useState<ProductionSegment[]>([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [masterUrl, setMasterUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [viewMode, setViewMode] = useState<'video' | 'script' | 'storyboard'>('video');
  const [progress, setProgress] = useState(0);
  const [job, setJob] = useState<{loading:boolean; message:string}>({loading:false, message:''});
  const [videoError, setVideoError] = useState('');

  const activeSegment = segments[segmentIndex];

  useEffect(() => {
    if (!title) return;
    const prepared = (title.productionSegments || []) as ProductionSegment[];
    const usePrepared = !episode || episode.episodeNumber === 1;
    setSegments(usePrepared ? prepared : []);
    setSegmentIndex(0);
    setMasterUrl(usePrepared ? (title.productionPlaybackUrl || '') : '');
    setProgress(0);
    setIsPlaying(false);
    setIsMuted(true);
    setVideoError('');
    setJob({loading:false, message:title.productionStatus === 'FAILED' ? title.productionError || 'Production failed.' : ''});
  }, [title?.id, title?.productionPlaybackUrl, episode?.id]);

  useEffect(() => {
    if (!masterUrl) return;
    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      setIsMuted(true);
      video.load();
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [masterUrl]);

  if (!title) return null;

  const currentItemTitle = episode ? `${title.title} — E${episode.episodeNumber}: ${episode.title}` : title.title;
  const currentSynopsis = episode ? episode.synopsis : title.synopsis;
  const hasReadyProduction = !!masterUrl && segments.length > 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch((err) => setVideoError(err instanceof Error ? err.message : String(err)));
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const locateSegment = (time: number) => {
    if (!segments.length) return 0;
    let cursor = 0;
    for (let i = 0; i < segments.length; i += 1) {
      cursor += Math.max(1, segments[i].durationSeconds || 8);
      if (time < cursor) return i;
    }
    return segments.length - 1;
  };

  const produceLegacyEpisode = async () => {
    setJob({loading:true, message:`Producing a continuous ${locale} master cut with Gemini, continuity frames, Veo, Gemini-TTS and final composition…`});
    setVideoError('');
    try {
      const result = await studioApi.renderEpisode({ title, episodeId: episode?.id, locale, targetSeconds: 24, includeNarration: true });
      if (!result.segments.length || !result.finalPlaybackUrl) throw new Error('Production did not return a continuous master cut.');
      setSegments(result.segments);
      setSegmentIndex(0);
      setMasterUrl(result.finalPlaybackUrl);
      setJob({loading:false, message:`Ready · ${result.totalDurationSeconds}s · one continuous master · ${result.locale}.`});
    } catch (err) {
      setJob({loading:false, message:err instanceof Error ? err.message : 'Episode production failed.'});
    }
  };

  const subtitle = activeSegment?.subtitle || activeSegment?.dialogue || activeSegment?.narration || '';

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none">
      <div className="absolute top-0 left-0 right-0 z-30 p-5 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="w-6 h-6" /></button>
          <div>
            <h3 className="font-bold text-sm sm:text-lg">{currentItemTitle}</h3>
            <p className="text-[11px] text-purple-300">{title.universeName} · {locale} {title.productionContinuityLock?.enabled ? '· Continuity Lock' : ''}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 rounded-xl bg-black/60 border border-white/10 p-1 text-xs">
          <button onClick={() => setViewMode('video')} className={`px-3 py-1.5 rounded-lg flex gap-1.5 items-center ${viewMode === 'video' ? 'bg-purple-600' : 'text-gray-400'}`}><Film className="w-3.5 h-3.5" />Master Cut</button>
          <button onClick={() => setViewMode('storyboard')} className={`px-3 py-1.5 rounded-lg flex gap-1.5 items-center ${viewMode === 'storyboard' ? 'bg-purple-600' : 'text-gray-400'}`}><Sparkles className="w-3.5 h-3.5" />{t('storyboard', locale)}</button>
          <button onClick={() => setViewMode('script')} className={`px-3 py-1.5 rounded-lg flex gap-1.5 items-center ${viewMode === 'script' ? 'bg-purple-600' : 'text-gray-400'}`}><BookOpen className="w-3.5 h-3.5" />{t('screenplay', locale)}</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center relative pt-16 pb-24">
        {viewMode === 'video' && (
          <div className="w-full h-full flex items-center justify-center relative">
            {hasReadyProduction ? (
              <>
                <video
                  ref={videoRef}
                  src={masterUrl}
                  poster={artSrc(title.backdropUrl, title.title, 'backdrop')}
                  autoPlay muted={isMuted} playsInline preload="auto"
                  className="max-w-full max-h-full object-contain"
                  onClick={togglePlay}
                  onPlay={() => { setIsPlaying(true); setVideoError(''); }}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    const v=e.currentTarget;
                    if(v.duration) setProgress((v.currentTime/v.duration)*100);
                    const nextIndex = locateSegment(v.currentTime);
                    if (nextIndex !== segmentIndex) setSegmentIndex(nextIndex);
                  }}
                  onError={(e) => setVideoError(e.currentTarget.error?.message || 'Generated master video could not be played.')}
                />
                {showSubtitles && subtitle && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/85 border border-white/10 px-5 py-2 rounded-lg text-sm text-yellow-200 text-center max-w-2xl">{subtitle}</div>}
                <div className="absolute top-8 right-6 rounded-full bg-black/75 border border-white/10 px-3 py-1 text-xs">Master Cut · Beat {segmentIndex + 1}/{segments.length}</div>
                {title.productionContinuityLock?.enabled && <div className="absolute top-8 left-6 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[10px] text-emerald-300 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Continuous identity lock</div>}
              </>
            ) : (
              <div className="relative max-w-2xl text-center px-8 space-y-5">
                <img src={artSrc(title.backdropUrl, title.title, 'backdrop')} className="fixed inset-0 w-full h-full object-cover opacity-25 -z-10" alt="" />
                <h3 className="text-3xl font-black">Episode master required</h3>
                <p className="text-gray-300">{currentSynopsis}</p>
                <p className="text-sm text-gray-400">CINEMIND now publishes only continuous master cuts. Older generated items can be rebuilt once.</p>
                <button disabled={job.loading} onClick={produceLegacyEpisode} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold hover:bg-purple-500 disabled:opacity-50">
                  {job.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                  {job.loading ? 'Producing continuous master…' : 'Produce episode master'}
                </button>
                {job.message && <p className="text-xs bg-black/60 border border-white/10 rounded-xl p-3 break-words">{job.message}</p>}
              </div>
            )}
            {videoError && <div className="absolute inset-x-4 top-24 mx-auto max-w-xl rounded-xl bg-red-950/90 border border-red-500/30 p-4 text-sm flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0" />{videoError}</div>}
          </div>
        )}

        {viewMode === 'storyboard' && (
          <div className="w-full max-w-5xl max-h-full overflow-y-auto px-6 py-8 space-y-3">
            {segments.length ? segments.map((s) => (
              <div key={s.shotNumber} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex justify-between text-xs text-purple-300 font-bold"><span>SHOT {s.shotNumber} · {s.shotType || 'cinematic'}</span><span>{s.storyBeat}</span></div>
                <p className="mt-2 text-sm text-gray-200">{s.subtitle || s.dialogue || s.narration}</p>
                <p className="mt-2 text-[11px] text-gray-500">{s.location} · {s.continuityAnchor}</p>
              </div>
            )) : <p className="text-center text-gray-400">Storyboard will appear after production.</p>}
          </div>
        )}

        {viewMode === 'script' && (
          <div className="w-full max-w-4xl max-h-full overflow-y-auto px-8 py-10 font-mono text-sm space-y-4">
            <h3 className="text-xl font-bold">{currentItemTitle}</h3>
            <p className="text-purple-300">{title.productionLogline || currentSynopsis}</p>
            {segments.map((s) => <div key={s.shotNumber} className="border-l-2 border-purple-500 pl-4 py-1"><p className="text-xs text-purple-300">SHOT {s.shotNumber} — {s.storyBeat}</p>{s.narration && <p>NARRATOR: {s.narration}</p>}{s.dialogue && <p>{s.dialogueSpeaker || 'CHARACTER'}: {s.dialogue}</p>}</div>)}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 p-5 bg-gradient-to-t from-black via-black/90 to-transparent space-y-3">
        <div className="flex items-center gap-3 text-[10px] text-gray-400"><span>EPISODE</span><div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{width:`${progress}%`}} /></div><span>{Math.round(progress)}%</span></div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} disabled={!hasReadyProduction} className="p-3 rounded-full bg-white text-black disabled:opacity-30">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}</button>
            <button onClick={toggleMute} disabled={!hasReadyProduction} className="p-2 text-gray-300 disabled:opacity-30">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            {hasReadyProduction && <span className="hidden sm:inline text-[10px] text-emerald-300">Single master · localized voice mix</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-2 rounded-lg ${showSubtitles ? 'text-purple-300 bg-white/10' : 'text-gray-400'}`}><Subtitles className="w-5 h-5" /></button>
            <button onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()} className="p-2 text-gray-300"><Maximize2 className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
