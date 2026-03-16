import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useAnimation } from 'framer-motion';
import { Star, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { convertDriveLink } from '../../lib/storage';

function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export const MemberCard = React.memo(function MemberCard({ member, onClick, onImageClick, id, onSearchPosition, onFavorite, onEdit, onRemove }) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });
    const rotateX = useTransform(mouseY, [-0.5, 0.5], [25, -25]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-25, 25]);
    const imgX = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);
    const imgY = useTransform(mouseY, [-0.5, 0.5], [-15, 15]);

    const controls = useAnimation();
    const prevIsFavorite = usePrevious(member.isFavorite);

    useEffect(() => {
        if (member.isFavorite && !prevIsFavorite) {
            controls.start({
                scale: [1, 1.5, 1.2, 1.5, 1.2],
                rotate: [0, -10, 10, -10, 0],
                transition: { duration: 0.5, ease: "easeInOut" }
            });
        }
    }, [member.isFavorite, prevIsFavorite, controls]);

    const handlePositionClick = (e, pos) => {
        e.stopPropagation();
        if (onSearchPosition) onSearchPosition(pos);
    };

    const handleFavoriteClick = e => {
        e.stopPropagation();
        onFavorite();
    };

    const handleEditClick = e => {
        e.stopPropagation();
        onEdit();
    };

    const getPositionStyle = (position) => {
        return theme === 'dark'
            ? "bg-slate-800/80 text-slate-500 border-white/5 group-hover:border-brand-pink/20"
            : "bg-slate-50 text-slate-400 border-slate-100 group-hover:border-brand-pink/10";
    };

    return (
        <motion.div
            id={id}
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }
            }}
            whileInView={{ scale: [1, 1.03, 1] }}
            onClick={() => { if (onClick) { onClick(member); } }}
            className={cn("relative group rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 min-h-[280px]", ['inactive', 'former'].includes(member.status?.toLowerCase()) && "opacity-60 saturate-[0.8] hover:opacity-100 hover:saturate-100", theme === 'dark' ? "bg-slate-900/40 border border-white/10 hover:border-brand-pink/30" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-slate-200")}
        >
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-pink/5 rounded-full blur-[90px] -mr-24 -mt-24 transition-all duration-700 group-hover:bg-brand-pink/20" />
            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-10 relative z-10 h-full">
                <motion.div style={{ rotateX, rotateY, perspective: 1000 }} className="relative shrink-0 cursor-zoom-in min-w-0" onClick={(e) => { e.stopPropagation(); onImageClick && onImageClick(member.image); }}>
                    <div className="absolute inset-0 bg-brand-pink blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl" />
                    <motion.div style={{ x: imgX, y: imgY }} className="relative z-10">
                        <img src={convertDriveLink(member.image)} alt={member.name} loading="lazy" className={cn("w-36 h-48 md:w-48 md:h-64 rounded-2xl object-cover object-center border-4 border-white/10 shadow-xl transition-all duration-700 group-hover:scale-105", ['inactive', 'former'].includes(member.status?.toLowerCase()) && "opacity-80 group-hover:opacity-100")} />
                        {['inactive', 'former'].includes(member.status?.toLowerCase()) && (
                            <div className="absolute top-4 left-4 z-20 overflow-hidden ring-1 ring-white/20 dark:ring-white/10 rounded-xl shadow-2xl skew-x-[-12deg]">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-black/40 backdrop-blur-xl text-white border-l-4 border-amber-400/80">
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none text-amber-200/90 italic">Inactive</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        {user && (
                            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={handleFavoriteClick} className={cn("p-2.5 rounded-full bg-black/40 backdrop-blur-md border transition-all duration-300", member.isFavorite ? "border-yellow-400/50 text-yellow-400" : "border-white/10 text-white hover:text-yellow-400 hover:border-yellow-400/30")} title={member.isFavorite ? "Unfavorite" : "Favorite"}>
                                <motion.div animate={controls}>
                                    <Star size={18} className={cn("transition-colors duration-200", member.isFavorite ? "fill-yellow-400 text-yellow-400" : "fill-transparent stroke-current")} />
                                </motion.div>
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {onRemove && (
                    <div className="absolute bottom-4 right-4 z-20">
                        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={(e) => { e.stopPropagation(); onRemove(member); }} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors", theme === 'dark' ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-400/30" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200")} title="Remove from group">
                            <Trash2 size={16} /> Remove
                        </motion.button>
                    </div>
                )}

                <div className="flex-1 space-y-3 min-w-0 flex flex-col justify-center">
                    <p className="text-[15px] text-brand-pink font-black uppercase tracking-widest" title={(member.positions && member.positions[0]) || 'Member'}>
                        {(member.positions && member.positions[0]) || 'Member'}
                    </p>
                    <h4 className={cn("text-2xl md:text-3xl lg:text-4xl font-black transition-colors leading-tight tracking-tight", theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink")}>
                        {member.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-3">
                        {(member.positions || []).map((pos, i) => (
                            <span key={i} onClick={(e) => handlePositionClick(e, pos)} className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors cursor-pointer hover:opacity-80", getPositionStyle(pos))}>
                                {pos}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={cn("p-4 rounded-full transition-all duration-700 -translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 shrink-0", "bg-brand-pink/10 text-brand-pink")}>
                    <ChevronRight size={32} />
                </div>
            </div>
        </motion.div>
    );
});