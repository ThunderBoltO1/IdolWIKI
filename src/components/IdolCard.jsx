import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Music, Users, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function IdolCard({ idol, onLike, onClick }) {
    const { theme } = useTheme();
    const [glowPos, setGlowPos] = React.useState({ x: 50, y: 50 });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setGlowPos({ x, y });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -12, scale: 1.02 }}
            onMouseMove={handleMouseMove}
            className={cn(
                "group relative overflow-hidden rounded-[40px] cursor-pointer transition-all duration-500 shadow-2xl",
                theme === 'dark' ? "glass-card hover:shadow-brand-pink/10" : "bg-white shadow-slate-200 border border-slate-100 hover:shadow-brand-pink/5"
            )}
            onClick={() => onClick(idol)}
        >
            {/* Holographic Glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none z-10"
                style={{
                    background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`
                }}
            />
            {/* Image Container */}
            <div className="aspect-[3/4] overflow-hidden relative">
                <img
                    src={idol.image}
                    alt={idol.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-opacity duration-500",
                    theme === 'dark' ? "from-slate-950/90" : "from-black/60",
                    "opacity-60 group-hover:opacity-90"
                )} />

                {/* Like Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onLike(idol.id);
                    }}
                    className={cn(
                        "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-xl transition-all active:scale-75 shadow-lg z-10",
                        theme === 'dark' ? "bg-black/40 hover:bg-brand-pink/20" : "bg-white/80 hover:bg-brand-pink/10"
                    )}
                >
                    <Heart
                        className={cn(
                            "w-5 h-5 transition-all duration-300",
                            idol.isFavorite ? "fill-brand-pink text-brand-pink scale-110" : "text-white group-hover:text-brand-pink"
                        )}
                    />
                </button>

                {/* Favorite Badge */}
                {idol.isFavorite && (
                    <div className="absolute top-4 left-4 p-1.5 bg-brand-pink rounded-lg text-white shadow-lg z-10 rotate-[-10deg]">
                        <Star size={12} fill="currentColor" />
                    </div>
                )}

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-brand-pink/90 text-white shadow-lg backdrop-blur-md">
                            {idol.group}
                        </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight drop-shadow-md">{idol.name}</h3>
                    <p className="text-xs font-bold text-slate-300 mb-3 truncate opacity-80">{idol.company}</p>

                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-pink opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                        <Users size={12} />
                        <span>{idol.positions[0]}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
