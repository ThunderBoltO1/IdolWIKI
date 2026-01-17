import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Loader2, Minimize2, Maximize2, Repeat, SkipBack, SkipForward, Shuffle, ListMusic } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function MusicPlayer({ url, groupName, songTitle, groupImage, onClose, onEnded, onNext, onPrev, playlist = [], currentSongIndex = 0, onSongSelect }) {
  const { theme } = useTheme();
  const [isMini, setIsMini] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  const [playing, setPlaying] = useState(() => {
    try {
      const saved = localStorage.getItem('music_playing');
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });

  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('music_volume');
      return saved !== null ? parseFloat(saved) : 0.5;
    } catch { return 0.5; }
  });

  const [muted, setMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('music_muted');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [loop, setLoop] = useState(() => {
    try {
      const saved = localStorage.getItem('music_loop');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const loopRef = useRef(loop);

  const [shuffle, setShuffle] = useState(() => {
    try {
      const saved = localStorage.getItem('music_shuffle');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const shuffleRef = useRef(shuffle);

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
    localStorage.setItem('music_playing', JSON.stringify(playing));
  }, [playing]);

  useEffect(() => {
    localStorage.setItem('music_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('music_muted', JSON.stringify(muted));
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('music_loop', JSON.stringify(loop));
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    localStorage.setItem('music_shuffle', JSON.stringify(shuffle));
    shuffleRef.current = shuffle;
  }, [shuffle]);

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
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        if (playing) {
          playerRef.current.loadVideoById(videoId);
        } else {
          playerRef.current.cueVideoById(videoId);
        }
        return;
      }

      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: playing ? 1 : 0,
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
              if (loopRef.current) {
                event.target.playVideo();
              } else if (onEnded) {
                onEnded(shuffleRef.current);
              } else {
                setPlaying(false);
                setProgress(0);
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingOnReady) existingOnReady();
        initPlayer();
      };
    }

    // Progress interval
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.getDuration === 'function') {
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
    if (playerRef.current && isReady && typeof playerRef.current.playVideo === 'function' && typeof playerRef.current.pauseVideo === 'function') {
      if (playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [playing, isReady]);

  useEffect(() => {
    if (playerRef.current && isReady && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume, isReady]);

  useEffect(() => {
    if (playerRef.current && isReady && typeof playerRef.current.mute === 'function' && typeof playerRef.current.unMute === 'function') {
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
  const toggleLoop = () => setLoop(!loop);
  const toggleShuffle = () => setShuffle(!shuffle);
  const handleProgress = (state) => {
    setProgress(state.played);
  };
  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function' && typeof playerRef.current.getDuration === 'function') {
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

          {/* Playlist Popover */}
          {showPlaylist && !isMini && (
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className={cn(
                    "fixed bottom-28 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40 p-2 rounded-3xl shadow-2xl border backdrop-blur-xl max-h-64 overflow-y-auto custom-scrollbar",
                    theme === 'dark' ? "bg-slate-900/90 border-white/10" : "bg-white/90 border-slate-200"
                )}
            >
                {playlist.length === 0 ? (
                    <div className="p-4 text-center text-xs opacity-50 font-bold">No songs in playlist</div>
                ) : (
                    playlist.map((song, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                onSongSelect && onSongSelect(idx);
                            }}
                            className={cn(
                                "w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors group",
                                idx === currentSongIndex 
                                    ? (theme === 'dark' ? "bg-white/10" : "bg-slate-100")
                                    : (theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")
                            )}
                        >
                            <span className={cn("text-[10px] font-black w-4 text-center", idx === currentSongIndex ? "text-brand-pink" : "opacity-30")}>{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-bold truncate", idx === currentSongIndex ? (theme === 'dark' ? "text-white" : "text-slate-900") : (theme === 'dark' ? "text-slate-400" : "text-slate-600"))}>{song.title || 'Untitled'}</p>
                            </div>
                            {idx === currentSongIndex && <div className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />}
                        </button>
                    ))
                )}
            </motion.div>
          )}

          <motion.div
            layout
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-6 left-4 right-4 md:left-auto md:right-8 z-50 border backdrop-blur-xl flex items-center shadow-2xl overflow-hidden",
              isMini 
                ? "w-16 h-16 rounded-full p-0 justify-center cursor-pointer hover:scale-110 transition-transform" 
                : "md:w-96 p-3 pr-5 rounded-[2rem] gap-4",
              theme === 'dark'
                ? "bg-slate-900/80 border-white/10 shadow-black/50"
                : "bg-white/80 border-white/20 shadow-slate-200/50"
            )}
            onClick={() => isMini && setIsMini(false)}
          >
            {/* Album Art with Spin */}
            <motion.div 
                layout="position"
                className={cn("relative shrink-0 transition-all duration-500", isMini ? "w-full h-full" : "w-14 h-14")}
                animate={{ rotate: playing ? 360 : 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear", active: playing }}
            >
                <img 
                    src={groupImage} 
                    alt={groupName} 
                    className={cn("w-full h-full object-cover shadow-md", isMini ? "" : "rounded-full border-2 border-white/10")} 
                />
                {isMini && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Maximize2 size={20} className="text-white" />
                    </div>
                )}
                {!isMini && (
                    <>
                        <div className="absolute inset-0 rounded-full border border-black/10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 rounded-full border border-white/20" />
                    </>
                )}
            </motion.div>

            {!isMini && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 items-center gap-4 min-w-0"
            >
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between">
                  <p className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'dark' ? "text-brand-pink" : "text-brand-pink")}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
                    Now Playing
                  </p>
              </div>
              <p className={cn("font-bold truncate text-sm leading-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>
                {songTitle || groupName}
              </p>
              {songTitle && (
                <p className={cn("text-[10px] font-medium truncate opacity-70", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                    {groupName}
                </p>
              )}
              
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

            <div className="flex items-center gap-1 pl-2 border-l border-white/10 dark:border-white/5">
              <button onClick={() => setShowPlaylist(!showPlaylist)} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10", showPlaylist && "text-brand-pink bg-brand-pink/10")}>
                <ListMusic size={16} />
              </button>

              <button onClick={toggleShuffle} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10", shuffle && "text-brand-pink")}>
                <Shuffle size={16} />
              </button>

              <button onClick={toggleLoop} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10", loop && "text-brand-pink")}>
                <Repeat size={16} />
              </button>

              <button onClick={onPrev} className="p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                <SkipBack size={16} />
              </button>

              <button 
                onClick={togglePlay} 
                className="p-2 bg-brand-pink text-white rounded-full shadow-lg shadow-brand-pink/30 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center mx-1"
              >
                {!isReady ? <Loader2 size={16} className="animate-spin" /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              
              <button onClick={() => onNext && onNext(shuffle)} className="p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                <SkipForward size={16} />
              </button>

              <button onClick={toggleMute} className={cn("p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10", muted && "text-red-500")}>
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              
              <div className="flex flex-col gap-1 ml-1">
                  <button onClick={(e) => { e.stopPropagation(); setIsMini(true); }} className={cn("p-1 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10")}>
                    <Minimize2 size={14} />
                  </button>
                  <button onClick={onClose} className={cn("p-1 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10")}>
                    <X size={14} />
                  </button>
              </div>
            </div>
            </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}