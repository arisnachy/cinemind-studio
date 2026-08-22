import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Subtitles, Sparkles, BookOpen, Film, CheckCircle2, Loader2, Wand2, AlertTriangle, Clapperboard } from 'lucide-react';
import { Title, Episode } from '../../types/content';
import { artSrc } from '../../utils/art';
import { EpisodeRenderSegment, studioApi } from '../../services/api';
import { getPreferredLocale, t } from '../../utils/locale';

interface CinemaPlayerModalProps {
  title: Title | null;
  episode?: Episode | null;
  onClose: () => void;
}

export const CinemaPlayerModal: React.FC<CinemaPlayerModalProps> = ({ title, episode, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [viewMode, setViewMode] = useState<'video' | 'script' | 'storyboard'>('video');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(title?.videoPreviewUrl || '');
  const [videoError, setVideoError] = useState('');
  const [videoJob, setVideoJob] = useState<{loading:boolean; message:string}>({loading:false, message:''});
  const [segments, setSegments] = useState<EpisodeRenderSegment[]>([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const locale = getPreferredLocale();
  const activeSegment = segments[segmentIndex];
  const narrationUrl = activeSegment?.narrationUrl || '';

  useEffect(() => {
    setVideoUrl(title?.videoPreviewUrl || '');
    setVideoJob({loading:false, message:''});
    setVideoError('');
    setProgress(0);
    setIsPlaying(false);
    setIsMuted(true);
    setSegments([]);
    setSegmentIndex(0);
  }, [title?.id, title?.videoPreviewUrl, episode?.id]);

  useEffect(() => {
    if (!videoUrl) return;
    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      video.volume = narrationUrl ? 0.28 : 1;
      setIsMuted(true);
      setVideoError('');
      video.load();
      if (narrationRef.current) {
        narrationRef.current.pause();
        narrationRef.current.currentTime = 0;
        narrationRef.current.load();
      }
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [videoUrl, narrationUrl]);

  if (!title) return null;
  const currentItemTitle = episode ? `${title.title} — E${episode.episodeNumber}: ${episode.title}` : title.title;
  const currentSynopsis = episode ? episode.synopsis : title.synopsis;

  const syncNarrationToVideo = () => {
    const video = videoRef.current;
    const audio = narrationRef.current;
    if (!video || !audio || !narrationUrl || isMuted) return;
    if (Math.abs(audio.currentTime - video.currentTime) > 0.35) audio.currentTime = Math.min(video.currentTime, audio.duration || video.currentTime);
    if (!video.paused && audio.paused) void audio.play().catch(() => undefined);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    const audio = narrationRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => {
        if (!isMuted && audio && narrationUrl) {
          audio.currentTime = Math.min(video.currentTime, audio.duration || video.currentTime);
          void audio.play().catch(() => undefined);
        }
      }).catch((err) => setVideoError(`Playback was blocked: ${err instanceof Error ? err.message : String(err)}`));
    } else {
      video.pause();
      audio?.pause();
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    const video = videoRef.current;
    const audio = narrationRef.current;
    if (video) video.muted = next;
    if (next) {
      audio?.pause();
    } else if (audio && narrationUrl && video && !video.paused) {
      audio.currentTime = Math.min(video.currentTime, audio.duration || video.currentTime);
      void audio.play().catch(() => undefined);
    }
  };

  const generateVeoClip = async () => {
    setVideoJob({loading:true, message:'Submitting cinematic scene to Veo 3.1…'});
    setVideoError('');
    setSegments([]);
    try {
      const result = await studioApi.generateVideo({ title, episodeId: episode?.id, locale });
      setVideoUrl(result.playbackUrl);
      setVideoJob({loading:false, message:`Generated ${result.durationSeconds}s scene with ${result.model} · ${locale}. Unmute for generated audio.`});
    } catch (err) {
      setVideoJob({loading:false, message: err instanceof Error ? err.message : 'Veo generation failed.'});
    }
  };

  const renderEpisodeCut = async () => {
    setVideoJob({loading:true, message:`Gemini is directing a 32-second ${locale} episode cut. Veo will render four consecutive shots and Gemini-TTS will create language-specific voice tracks. This uses 4 Veo generations and can take several minutes…`});
    setVideoError('');
    setSegments([]);
    setSegmentIndex(0);
    try {
      const result = await studioApi.renderEpisode({
        title,
        episodeId: episode?.id,
        locale,
        targetSeconds: 32,
        includeNarration: true,
      });
      if (!result.segments.length) throw new Error('Episode renderer returned no shots.');
      setSegments(result.segments);
      setSegmentIndex(0);
      setVideoUrl(result.segments[0].playbackUrl);
      setVideoJob({loading:false, message:`${result.episodeTitle} · ${result.totalDurationSeconds}s · ${result.segments.length} shots · ${result.locale}. Voice: ${result.ttsModel || 'Veo native audio'}. ${result.summary}`});
    } catch (err) {
      setVideoJob({loading:false, message: err instanceof Error ? err.message : 'Episode rendering failed.'});
    }
  };

  const handleEnded = () => {
    narrationRef.current?.pause();
    if (narrationRef.current) narrationRef.current.currentTime = 0;
    if (segments.length > 1 && segmentIndex < segments.length - 1) {
      const nextIndex = segmentIndex + 1;
      setSegmentIndex(nextIndex);
      setProgress(0);
      setVideoUrl(segments[nextIndex].playbackUrl);
      return;
    }
    setIsPlaying(false);
  };

  const subtitleText = activeSegment?.subtitle || activeSegment?.narration || (videoUrl ? 'CINEMIND · Original AI-generated scene' : '');

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-fade-in">
      <audio ref={narrationRef} src={narrationUrl || undefined} preload="auto" />
      <div className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105" aria-label="Back to catalog"><X className="w-6 h-6" /></button>
          <div><h3 className="font-bold text-white text-base sm:text-lg drop-shadow">{currentItemTitle}</h3><p className="text-xs text-purple-300 drop-shadow">Universe: {title.universeName} · {locale}</p></div>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
          <button onClick={() => setViewMode('video')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'video' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><Film className="w-3.5 h-3.5" /><span>{segments.length ? t('episodeCut', locale) : t('generatedScene', locale)}</span></button>
          <button onClick={() => setViewMode('storyboard')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'storyboard' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><Sparkles className="w-3.5 h-3.5" /><span>{t('storyboard', locale)}</span></button>
          <button onClick={() => setViewMode('script')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'script' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><BookOpen className="w-3.5 h-3.5" /><span>{t('screenplay', locale)}</span></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {viewMode === 'video' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                poster={artSrc(title.backdropUrl, title.title, 'backdrop')}
                autoPlay
                muted={isMuted}
                playsInline
                preload="auto"
                className="max-w-full max-h-full object-contain"
                onClick={togglePlay}
                onPlay={() => { setIsPlaying(true); setVideoError(''); syncNarrationToVideo(); }}
                onPause={() => { setIsPlaying(false); narrationRef.current?.pause(); }}
                onLoadedData={() => setVideoError('')}
                onEnded={handleEnded}
                onSeeking={syncNarrationToVideo}
                onTimeUpdate={(e) => { const el=e.currentTarget; if(el.duration) setProgress((el.currentTime/el.duration)*100); syncNarrationToVideo(); }}
                onError={(e) => {
                  const media = e.currentTarget;
                  const code = media.error?.code;
                  const message = media.error?.message || 'The generated MP4 could not be decoded or streamed by this browser.';
                  setVideoError(`Video playback error${code ? ` ${code}` : ''}: ${message}`);
                  setIsPlaying(false);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={artSrc(title.backdropUrl, title.title, 'backdrop')} alt={title.title} className="absolute inset-0 w-full h-full object-cover opacity-55" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
                <div className="relative z-10 max-w-xl mx-auto p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-600/30 border border-purple-400/40 backdrop-blur flex items-center justify-center"><Wand2 className="w-8 h-8 text-purple-200" /></div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">Generate with Veo 3.1</h3>
                  <p className="text-sm text-gray-200">{currentSynopsis}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button disabled={videoJob.loading} onClick={generateVeoClip} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-5 py-3 font-bold text-sm hover:bg-gray-200 disabled:opacity-60">
                      {videoJob.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t('generateScene', locale)}
                    </button>
                    {episode && <button disabled={videoJob.loading} onClick={renderEpisodeCut} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-5 py-3 font-bold text-sm hover:bg-purple-500 disabled:opacity-60"><Clapperboard className="w-4 h-4" />{t('renderEpisode', locale)}</button>}
                  </div>
                  <p className="text-[10px] text-gray-400">Episode Cut currently renders 4 × 8-second Veo shots (32 seconds). It consumes four Veo generations. Gemini-TTS adds a separate narration track when available.</p>
                  {videoJob.message && <p className="text-xs text-purple-200 bg-black/50 rounded-lg px-3 py-2 border border-white/10">{videoJob.message}</p>}
                </div>
              </div>
            )}
            {videoUrl && showSubtitles && subtitleText && <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-1.5 rounded-md text-sm text-yellow-300 text-center font-medium max-w-xl border border-white/10 backdrop-blur-md">{subtitleText}</div>}
            {videoUrl && segments.length > 1 && <div className="absolute top-24 right-6 z-20 rounded-full bg-black/70 border border-white/10 px-3 py-1 text-xs text-white">Shot {segmentIndex + 1}/{segments.length}</div>}
            {videoUrl && isMuted && <button onClick={toggleMute} className="absolute bottom-36 right-6 z-20 rounded-full bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">Unmute dialogue / narration</button>}
            {videoUrl && activeSegment?.narrationUrl && !isMuted && <div className="absolute bottom-36 left-6 z-20 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[10px] text-emerald-300">Gemini-TTS · {activeSegment.narrationVoice || 'voice'} · {locale}</div>}
            {videoUrl && videoError && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 max-w-xl rounded-xl border border-amber-400/30 bg-black/90 p-4 text-amber-100 shadow-2xl"><div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 mt-0.5 text-amber-400 shrink-0"/><div><p className="font-bold">Generated file received, playback failed</p><p className="text-xs mt-1 text-amber-100/80 break-words">{videoError}</p><button onClick={() => { const video=videoRef.current; if(video){ setVideoError(''); video.load(); void video.play(); } }} className="mt-3 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold">Reload video</button></div></div></div>}
          </div>
        )}

        {viewMode === 'storyboard' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6 overflow-y-auto max-h-[75vh] no-scrollbar">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10"><span className="text-xs font-mono text-purple-400">Storyboard Frame · {episode ? `S${episode.seasonNumber}E${episode.episodeNumber}` : 'Feature'}</span><h4 className="font-bold text-white text-lg mt-1">{currentItemTitle}</h4><p className="text-sm text-gray-300 mt-2 leading-relaxed">{currentSynopsis}</p><img src={artSrc(episode?.thumbnailUrl || title.backdropUrl, currentItemTitle, 'backdrop')} alt="Storyboard frame" className="w-full h-72 object-cover rounded-lg mt-4 border border-white/10" /></div>
            {segments.map((segment) => <div key={segment.shotNumber} className="p-4 rounded-xl bg-white/5 border border-white/10"><p className="text-xs text-purple-300 font-bold">SHOT {segment.shotNumber}</p><p className="text-sm text-gray-200 mt-1">{segment.subtitle || segment.narration || segment.dialogue}</p><p className="text-[11px] text-gray-500 mt-2">Continuity: {segment.continuityAnchor}</p></div>)}
          </div>
        )}

        {viewMode === 'script' && (
          <div className="max-w-3xl mx-auto p-8 bg-[#0c0c14] border border-white/10 rounded-2xl overflow-y-auto max-h-[75vh] font-mono text-xs sm:text-sm text-gray-200 space-y-4 shadow-2xl">
            <div className="text-center pb-4 border-b border-white/10 space-y-1"><h3 className="font-bold text-lg text-white uppercase">{currentItemTitle}</h3><p className="text-purple-400">GEMINI STORY BIBLE · {locale} · CANON MEMORY ENABLED</p></div>
            <p className="font-bold text-purple-300">STORY INTENT</p><p className="text-gray-300 leading-relaxed">{currentSynopsis}</p>
            {episode?.directorNotes && <><p className="font-bold text-purple-300">DIRECTOR NOTES</p><p className="text-gray-400 leading-relaxed">{episode.directorNotes}</p></>}
            {segments.length > 0 && <><p className="font-bold text-purple-300">RENDERED CUT</p>{segments.map((s) => <div key={s.shotNumber} className="border-l-2 border-purple-500 pl-3"><p className="text-white">SHOT {s.shotNumber}</p>{s.narration && <p className="text-gray-300">Narrator: {s.narration}</p>}{s.dialogue && <p className="text-gray-300">Dialogue: {s.dialogue}</p>}</div>)}</>}
            <p className="font-bold text-purple-300">CONTINUITY STATUS</p><p className="text-emerald-300">Canonical story state is available to the ClickHouse narrative-memory agent.</p>
          </div>
        )}
      </div>

      <div className="relative z-30 p-6 bg-gradient-to-t from-black via-black/80 to-transparent space-y-3">
        <div className="flex items-center space-x-3 text-xs text-gray-400 font-mono"><span>{videoUrl ? 'LIVE' : 'AI'}</span><div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} /></div><span>{segments.length ? `${segmentIndex + 1}/${segments.length}` : videoUrl ? 'VEO' : 'STORYBOARD'}</span></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={togglePlay} disabled={!videoUrl} className="p-3 rounded-full bg-white hover:bg-gray-200 text-black shadow-lg disabled:opacity-40">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button>
            <button onClick={toggleMute} disabled={!videoUrl} className="p-2 text-gray-300 hover:text-white disabled:opacity-40">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            {episode && <button disabled={videoJob.loading} onClick={renderEpisodeCut} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 text-xs font-semibold hover:bg-purple-600/30 disabled:opacity-50"><Clapperboard className="w-4 h-4" />{videoJob.loading ? t('renderingEpisode', locale) : t('renderEpisode', locale)}</button>}
            <div className="hidden lg:flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /><span>{videoUrl ? 'Veo output streaming' : 'Original media only'}</span></div>
          </div>
          <div className="flex items-center space-x-3 text-gray-300"><button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-2 rounded-lg ${showSubtitles ? 'text-purple-400 bg-white/10' : 'hover:text-white'}`} title={t('subtitles', locale)}><Subtitles className="w-5 h-5" /></button><button onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()} className="p-2 hover:text-white"><Maximize2 className="w-5 h-5" /></button></div>
        </div>
        {videoJob.message && videoUrl && <p className="text-[10px] text-purple-200 truncate">{videoJob.message}</p>}
      </div>
    </div>
  );
};
