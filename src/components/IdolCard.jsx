import React from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { Music, Users, Star, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';

const Highlight = ({ text = '', highlight = '' }) => {
    if (!highlight?.trim() || !text) {
        return <>{text}</>;
    }
    // Escape special characters in the highlight string for use in regex
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.filter(String).map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-brand-pink/50 text-white rounded not-italic px-0.5 mx-0">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

export function IdolCard({ idol, onLike, onClick, onQuickView, searchTerm }) {
    const { theme } = useTheme();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const glowX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
    const glowY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);
    const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -12, scale: 1.02 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
            className={cn(
                "group relative overflow-hidden rounded-[40px] cursor-pointer transition-all duration-500 shadow-2xl",
                theme === 'dark' ? "glass-card hover:shadow-brand-pink/10" : "bg-white shadow-slate-200 border border-slate-100 hover:shadow-brand-pink/5"
            )}
            style={{ willChange: "transform" }}
            onClick={() => onClick(idol)}
        >
            {/* Animated Border on Hover */}
            <div className={cn(
                "absolute -inset-px rounded-[40px] z-0 transition-opacity duration-500",
                "opacity-0 group-hover:opacity-100",
                "bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue"
            )} />

            {/* Holographic Glow */}
            <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none z-10"
                style={{
                    background: glowBackground
                }}
            />
            {/* Image Container */}
            <div className="aspect-[3/4] overflow-hidden relative rounded-[38px]">
                <img
                    src={convertDriveLink(idol.image)}
                    alt={idol.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-opacity duration-500",
                    theme === 'dark' ? "from-slate-950/90" : "from-black/60",
                    "opacity-60 group-hover:opacity-90"
                )} />

                {/* Quick View Button */}
                {onQuickView && (
                    <div className="absolute top-5 left-5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickView(idol);
                            }}
                            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors active:scale-90"
                            title="Quick View"
                        >
                            <Eye size={18} />
                        </button>
                    </div>
                )}

                {/* Favorite Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onLike(idol.id);
                    }}
                    className={cn(
                        "absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:text-yellow-400 transition-colors active:scale-90",
                        idol.isFavorite && "text-yellow-400"
                    )}
                    title={idol.isFavorite ? "Unfavorite" : "Favorite"}
                >
                    <Star size={18} className={cn("transition-all", idol.isFavorite && "fill-yellow-400")} />
                </button>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cn("px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full text-white shadow-lg backdrop-blur-md flex items-center gap-1.5", !idol.group || idol.group === 'SOLOISTS' ? "bg-brand-purple/90" : "bg-brand-pink/90")}>
                            {(!idol.group || idol.group === 'SOLOISTS') ? (
                                <>
                                    <Music size={10} />
                                    <span>Soloist</span>
                                </>
                            ) : (
                                <>
                                    <Users size={10} />
                                    <span>{idol.group}</span>
                                </>
                            )}
                        </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight drop-shadow-md">
                        <Highlight text={idol.name} highlight={searchTerm} />
                    </h3>
                    <p className="text-xs font-bold text-slate-300 mb-3 truncate opacity-80">
                        <Highlight text={idol.company} highlight={searchTerm} />
                    </p>

                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-pink opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                        <Users size={12} />
                        <span>{(idol.positions && idol.positions[0]) || 'Member'}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
