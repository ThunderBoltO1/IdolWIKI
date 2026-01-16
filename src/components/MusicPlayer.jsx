import React, { useState, useRef, useEffect } from 'react';
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
  const playerRef = useRef(null); // Will hold the YT.Player instance
  const containerRef = useRef(null); // Will hold the div for iframe

  // Helper to extract video ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    if (!url) return;

    const videoId = getYouTubeId(url);
    if (!videoId) return;

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            event.target.setVolume(volume * 100);
            if (playing) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setPlaying(false);
              setProgress(0);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Progress interval
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const current = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        if (duration > 0) {
          setProgress(current / duration);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      // Optional: destroy player on unmount if needed, but keeping it might be smoother for navigation
      // if (playerRef.current) playerRef.current.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (playerRef.current && isReady) {
      if (playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [playing, isReady]);

  useEffect(() => {
    if (playerRef.current && isReady) {
      playerRef.current.setVolume(volume * 100);
      if (volume > 0 && muted) setMuted(false);
    }
  }, [volume, isReady]);

  useEffect(() => {
    if (playerRef.current && isReady) {
      if (muted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  }, [muted, isReady]);

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
    if (playerRef.current && playerRef.current.getDuration) {
      const duration = playerRef.current.getDuration();
      playerRef.current.seekTo(duration * newProgress, true);
    }
  };

  return (
    <AnimatePresence>
      {url && (
        <>
          {/* Hidden Container for YouTube IFrame API */}
          <div ref={containerRef} className="hidden" />

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