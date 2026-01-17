import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

export function AutoplayVideo({ videoId, className, coverImage, isMuted: initialMuted = true, playOnHover = false, isHovered = false }) {
    const containerRef = useRef(null);
    // Load video when in view to be ready
    const isInView = useInView(containerRef, { margin: "0px 0px -100px 0px", amount: 0.3 });
    const playerRef = useRef(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [muted, setMuted] = useState(initialMuted);

    // If playOnHover is true, play when hovered.
    // If playOnHover is false, play when in view.
    const shouldPlay = playOnHover ? isHovered : isInView;
    // Always load if in view (or if hovered, though usually you hover something in view)
    const shouldLoad = isInView || isHovered; 

    useEffect(() => {
        if (!videoId || !shouldLoad || playerRef.current) return;

        // Load YouTube API if not loaded
        if (!window.YT) {
             const tag = document.createElement('script');
             tag.src = "https://www.youtube.com/iframe_api";
             const firstScriptTag = document.getElementsByTagName('script')[0];
             firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
             if (!containerRef.current) return;
             
             const wrapper = document.createElement('div');
             wrapper.style.width = '100%';
             wrapper.style.height = '100%';
             wrapper.style.pointerEvents = 'none'; // Prevent clicking on video to pause/play manually via YT controls
             containerRef.current.appendChild(wrapper);

             playerRef.current = new window.YT.Player(wrapper, {
                 videoId: videoId,
                 height: '100%',
                 width: '100%',
                 playerVars: {
                     autoplay: 0,
                     controls: 0,
                     disablekb: 1,
                     fs: 0,
                     iv_load_policy: 3,
                     modestbranding: 1,
                     playsinline: 1,
                     rel: 0,
                     mute: muted ? 1 : 0,
                     loop: 1,
                     playlist: videoId,
                     origin: window.location.origin
                 },
                 events: {
                     onReady: (event) => {
                         setIsPlayerReady(true);
                         if (muted) event.target.mute();
                     },
                     onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.ENDED) {
                            event.target.playVideo(); 
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

    }, [videoId, shouldLoad]);

    // Control playback
    useEffect(() => {
        if (playerRef.current && playerRef.current.playVideo && isPlayerReady) {
            if (shouldPlay) {
                playerRef.current.playVideo();
            } else {
                playerRef.current.pauseVideo();
            }
        }
    }, [shouldPlay, isPlayerReady]);

    const toggleMute = (e) => {
        e.stopPropagation(); // Prevent card click
        const newMuted = !muted;
        setMuted(newMuted);
        if (playerRef.current && playerRef.current.mute) {
            if (newMuted) playerRef.current.mute();
            else playerRef.current.unMute();
        }
    };

    return (
        <div ref={containerRef} className={cn("relative overflow-hidden bg-black", className)}>
            {/* Cover Image */}
            <div className={cn("absolute inset-0 z-20 transition-opacity duration-500", (isPlayerReady && shouldPlay) ? "opacity-0" : "opacity-100")}>
                {coverImage && (
                    <img 
                        src={coverImage} 
                        className="w-full h-full object-cover" 
                        alt="Video cover" 
                    />
                )}
            </div>
            
            {/* Mute Button */}
            {isPlayerReady && (
                <button 
                    onClick={toggleMute}
                    className="absolute bottom-3 right-3 z-30 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
            )}
        </div>
    );
}
