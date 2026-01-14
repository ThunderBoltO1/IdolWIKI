import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function MusicPlayer({ url, groupName, groupImage }) {
    const { theme } = useTheme();
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    // Start muted to comply with browser autoplay policies. User must interact to enable sound.
    const [muted, setMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const playerRef = useRef(null);
    const [safeUrl, setSafeUrl] = useState(null);

    useEffect(() => {
        const trimmed = url && String(url).trim();
        if (trimmed) {
            setSafeUrl(trimmed);
            setVisible(true);
            setMuted(true);
            setProgress(0);
            setIsReady(false);
            setIsLoading(true);
            // Don't auto-play immediately, wait for onReady
            setPlaying(false);
        } else {
            setSafeUrl(null);
            setVisible(false);
            setPlaying(false);
            setIsReady(false);
            setIsLoading(false);
        }
    }, [url]);

    const handlePlayPause = () => {
        if (isLoading && !isReady) return; // Prevent clicks while initial loading
        
        const newPlaying = !playing;
        setPlaying(newPlaying);
    };
    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (muted && newVolume > 0) setMuted(false);
    };
    const handleToggleMute = () => {
        if (muted) {
            setMuted(false);
            if (volume === 0) setVolume(0.5);
        } else {
            setMuted(true);
        }
    };
    const handleProgress = (state) => setProgress(state.played);
    const handleSeek = (e) => {
        const seekTo = parseFloat(e.target.value);
        setProgress(seekTo);
        if (playerRef.current) {
            playerRef.current.seekTo(seekTo);
        }
    };

    const handleReady = () => {
        setIsReady(true);
        setIsLoading(false);
        // Auto-play when ready (but still muted) - only if user hasn't explicitly paused
        // This allows the initial auto-play behavior
        if (!playing) {
            setPlaying(true);
        }
    };

    const handleStart = () => {
        setIsLoading(false);
    };

    const handleError = (error) => {
        console.warn("MusicPlayer error:", error);
        setIsLoading(false);
        setIsReady(false);
        setPlaying(false);
    };

    if (!visible || !safeUrl) return null;

    return (
        <>
            <div className="pointer-events-none fixed -top-full -left-full opacity-0">
                <ReactPlayer
                    ref={playerRef}
                    url={safeUrl}
                    playing={playing && isReady}
                    volume={volume}
                    muted={muted}
                    onProgress={handleProgress}
                    onReady={handleReady}
                    onStart={handleStart}
                    onEnded={() => {
                        setPlaying(false);
                        setIsLoading(false);
                    }}
                    onError={handleError}
                    width="1px"
                    height="1px"
                    config={{
                        youtube: { 
                            playerVars: { 
                                controls: 0, 
                                modestbranding: 1, 
                                playsinline: 1,
                                autoplay: 0 // Let ReactPlayer control autoplay
                            } 
                        },
                    }}
                />
            </div>

            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={cn(
                        "fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 p-4 rounded-3xl shadow-2xl border flex items-center gap-4",
                        theme === 'dark'
                            ? "bg-slate-900/80 backdrop-blur-xl border-white/10"
                            : "bg-white/80 backdrop-blur-xl border-slate-200"
                    )}
                >
                    <img src={groupImage} alt={groupName} className="w-14 h-14 rounded-2xl object-cover shadow-md" />
                    <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                            Now Playing
                            {muted && <span className="text-brand-pink animate-pulse">(Muted)</span>}
                        </p>
                        <p className={cn("font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{groupName}'s Theme</p>
                        <input
                            type="range" min={0} max={0.999999} step="any"
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-1 mt-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePlayPause} 
                            disabled={isLoading && !isReady}
                            className={cn(
                                "p-3 bg-brand-pink text-white rounded-full shadow-lg shadow-brand-pink/30 hover:scale-110 active:scale-95 transition-transform",
                                (isLoading && !isReady) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {(isLoading && !isReady) ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : playing ? (
                                <Pause size={16} fill="currentColor" />
                            ) : (
                                <Play size={16} fill="currentColor" className="ml-0.5" />
                            )}
                        </button>
                        <div className="group relative flex items-center">
                            <button onClick={handleToggleMute} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-200")}>
                                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <div className={cn("absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-3 rounded-2xl shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto", theme === 'dark' ? "bg-slate-800 border-white/10" : "bg-white border-slate-200")}>
                                <input
                                    type="range" min={0} max={1} step="any"
                                    value={muted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                                />
                            </div>
                        </div>
                         <button onClick={() => setVisible(false)} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-200")}>
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
}