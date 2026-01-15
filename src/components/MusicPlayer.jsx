import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function MusicPlayer({ url, groupName, groupImage, onClose }) {
  const { theme } = useTheme();
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    // Reset state when URL changes
    setPlaying(true);
    setProgress(0);
    setIsReady(false);
  }, [url]);

  const togglePlay = () => setPlaying(!playing);
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setMuted(false);
  };
  const toggleMute = () => {
    setMuted(!muted);
    if (muted && volume === 0) setVolume(0.5);
  };
  const handleProgress = (state) => {
    setProgress(state.played);
  };
  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    playerRef.current?.seekTo(newProgress);
  };

  return (
    <AnimatePresence>
      {url && (
        <>
          <div className="hidden">
            <ReactPlayer
              ref={playerRef}
              url={url}
              playing={playing}
              volume={volume}
              muted={muted}
              onProgress={handleProgress}
              onReady={() => setIsReady(true)}
              onEnded={() => setPlaying(false)}
              onError={(e) => console.warn('MusicPlayer error:', e)}
              width="0"
              height="0"
              config={{
                youtube: {
                  playerVars: { controls: 0, modestbranding: 1, playsinline: 1 },
                },
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 p-3 pr-5 rounded-[2rem] shadow-2xl border backdrop-blur-xl flex items-center gap-4",
              theme === 'dark'
                ? "bg-slate-900/80 border-white/10 shadow-black/50"
                : "bg-white/80 border-white/20 shadow-slate-200/50"
            )}
          >
            {/* Album Art with Spin */}
            <motion.div 
                className="relative w-14 h-14 shrink-0"
                animate={{ rotate: playing ? 360 : 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear", active: playing }}
            >
                <img 
                    src={groupImage} 
                    alt={groupName} 
                    className="w-full h-full rounded-full object-cover shadow-md border-2 border-white/10" 
                />
                <div className="absolute inset-0 rounded-full border border-black/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 rounded-full border border-white/20" />
            </motion.div>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between">
                  <p className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'dark' ? "text-brand-pink" : "text-brand-pink")}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
                    Now Playing
                  </p>
              </div>
              <p className={cn("font-bold truncate text-sm leading-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>
                {groupName}
              </p>
              
              {/* Custom Progress Bar */}
              <div className="group/progress relative h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-1 cursor-pointer overflow-hidden">
                 <motion.div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-pink to-brand-purple rounded-full"
                    style={{ width: `${progress * 100}%` }}
                 />
                 <input
                    type="range"
                    min={0}
                    max={0.999999}
                    step="any"
                    value={progress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
              </div>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-white/10 dark:border-white/5">
              <button 
                onClick={togglePlay} 
                className="p-2.5 bg-brand-pink text-white rounded-full shadow-lg shadow-brand-pink/30 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
              >
                {!isReady ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
              
              <div className="flex flex-col gap-1">
                  <button onClick={toggleMute} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10", muted && "text-red-500")}>
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button onClick={onClose} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10")}>
                    <X size={16} />
                  </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}