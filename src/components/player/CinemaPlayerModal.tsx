import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Subtitles, Sparkles, BookOpen, Film, CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import { Title, Episode } from '../../types/content';
import { artSrc } from '../../utils/art';
import { studioApi } from '../../services/api';

interface CinemaPlayerModalProps {
  title: Title | null;
  episode?: Episode | null;
  onClose: () => void;
}

export const CinemaPlayerModal: React.FC<CinemaPlayerModalProps> = ({ title, episode, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [viewMode, setViewMode] = useState<'video' | 'script' | 'storyboard'>('video');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(title?.videoPreviewUrl || '');
  const [videoJob, setVideoJob] = useState<{loading:boolean; message:string}>({loading:false, message:''});
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setVideoUrl(title?.videoPreviewUrl || '');
    setVideoJob({loading:false, message:''});
  }, [title?.id, title?.videoPreviewUrl]);

  if (!title) return null;
  const currentItemTitle = episode ? `${title.title} — E${episode.episodeNumber}: ${episode.title}` : title.title;
  const currentSynopsis = episode ? episode.synopsis : title.synopsis;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const generateVeoClip = async () => {
    setVideoJob({loading:true, message:'Submitting cinematic scene to Veo 3.1…'});
    try {
      setVideoJob({loading:true, message:'Veo 3.1 is rendering a five-second original scene on Google Cloud. This can take a few minutes…'});
      const result = await studioApi.generateVideo({ title, episodeId: episode?.id });
      setVideoUrl(result.playbackUrl);
      setVideoJob({loading:false, message:`Generated with ${result.model}.`});
    } catch (err) {
      setVideoJob({loading:false, message: err instanceof Error ? err.message : 'Veo generation failed.'});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-fade-in">
      <div className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105" aria-label="Back to catalog"><X className="w-6 h-6" /></button>
          <div><h3 className="font-bold text-white text-base sm:text-lg drop-shadow">{currentItemTitle}</h3><p className="text-xs text-purple-300 drop-shadow">Universe: {title.universeName}</p></div>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
          <button onClick={() => setViewMode('video')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'video' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><Film className="w-3.5 h-3.5" /><span>Generated Scene</span></button>
          <button onClick={() => setViewMode('storyboard')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'storyboard' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><Sparkles className="w-3.5 h-3.5" /><span>Storyboard</span></button>
          <button onClick={() => setViewMode('script')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'script' ? 'bg-purple-600 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}><BookOpen className="w-3.5 h-3.5" /><span>Screenplay</span></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {viewMode === 'video' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {videoUrl ? (
              <video ref={videoRef} src={videoUrl} poster={artSrc(title.backdropUrl, title.title, 'backdrop')} autoPlay muted={isMuted} loop className="max-w-full max-h-full object-contain" onClick={togglePlay} onTimeUpdate={(e) => { const el=e.currentTarget; if(el.duration) setProgress((el.currentTime/el.duration)*100); }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={artSrc(title.backdropUrl, title.title, 'backdrop')} alt={title.title} className="absolute inset-0 w-full h-full object-cover opacity-55" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
                <div className="relative z-10 max-w-xl mx-auto p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-600/30 border border-purple-400/40 backdrop-blur flex items-center justify-center"><Wand2 className="w-8 h-8 text-purple-200" /></div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">Generate this scene with Veo 3.1</h3>
                  <p className="text-sm text-gray-200">{currentSynopsis}</p>
                  <button disabled={videoJob.loading} onClick={generateVeoClip} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-5 py-3 font-bold text-sm hover:bg-gray-200 disabled:opacity-60">
                    {videoJob.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {videoJob.loading ? 'Rendering on Google Cloud…' : 'Generate Veo Scene'}
                  </button>
                  {videoJob.message && <p className="text-xs text-purple-200 bg-black/50 rounded-lg px-3 py-2 border border-white/10">{videoJob.message}</p>}
                </div>
              </div>
            )}
            {videoUrl && showSubtitles && <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-1.5 rounded-md text-sm text-yellow-300 text-center font-medium max-w-xl border border-white/10 backdrop-blur-md">CINEMIND · Original AI-generated scene</div>}
          </div>
        )}

        {viewMode === 'storyboard' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6 overflow-y-auto max-h-[75vh] no-scrollbar">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10"><span className="text-xs font-mono text-purple-400">Storyboard Frame · {episode ? `S${episode.seasonNumber}E${episode.episodeNumber}` : 'Feature'}</span><h4 className="font-bold text-white text-lg mt-1">{currentItemTitle}</h4><p className="text-sm text-gray-300 mt-2 leading-relaxed">{currentSynopsis}</p><img src={artSrc(episode?.thumbnailUrl || title.backdropUrl, currentItemTitle, 'backdrop')} alt="Storyboard frame" className="w-full h-72 object-cover rounded-lg mt-4 border border-white/10" /></div>
          </div>
        )}

        {viewMode === 'script' && (
          <div className="max-w-3xl mx-auto p-8 bg-[#0c0c14] border border-white/10 rounded-2xl overflow-y-auto max-h-[75vh] font-mono text-xs sm:text-sm text-gray-200 space-y-4 shadow-2xl">
            <div className="text-center pb-4 border-b border-white/10 space-y-1"><h3 className="font-bold text-lg text-white uppercase">{currentItemTitle}</h3><p className="text-purple-400">GEMINI STORY BIBLE · CANON MEMORY ENABLED</p></div>
            <p className="font-bold text-purple-300">STORY INTENT</p><p className="text-gray-300 leading-relaxed">{currentSynopsis}</p>
            {episode?.directorNotes && <><p className="font-bold text-purple-300">DIRECTOR NOTES</p><p className="text-gray-400 leading-relaxed">{episode.directorNotes}</p></>}
            <p className="font-bold text-purple-300">CONTINUITY STATUS</p><p className="text-emerald-300">Canonical story state is available to the ClickHouse narrative-memory agent.</p>
          </div>
        )}
      </div>

      <div className="relative z-30 p-6 bg-gradient-to-t from-black via-black/80 to-transparent space-y-3">
        <div className="flex items-center space-x-3 text-xs text-gray-400 font-mono"><span>{videoUrl ? 'LIVE' : 'AI'}</span><div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} /></div><span>{videoUrl ? 'VEO' : 'STORYBOARD'}</span></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={togglePlay} disabled={!videoUrl} className="p-3 rounded-full bg-white hover:bg-gray-200 text-black shadow-lg disabled:opacity-40">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button>
            <button onClick={() => setIsMuted(!isMuted)} disabled={!videoUrl} className="p-2 text-gray-300 hover:text-white disabled:opacity-40">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /><span>{videoUrl ? 'Veo output streaming' : 'Original media only'}</span></div>
          </div>
          <div className="flex items-center space-x-3 text-gray-300"><button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-2 rounded-lg ${showSubtitles ? 'text-purple-400 bg-white/10' : 'hover:text-white'}`}><Subtitles className="w-5 h-5" /></button><button onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()} className="p-2 hover:text-white"><Maximize2 className="w-5 h-5" /></button></div>
        </div>
      </div>
    </div>
  );
};
