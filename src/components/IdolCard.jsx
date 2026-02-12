import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, Star, ChevronRight, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { convertDriveLink } from '../lib/storage';
import { Highlight } from './Highlight';

export function IdolCard({ idol, onLike, onClick, onEdit, searchTerm }) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30
            }}
            onClick={() => onClick(idol)}
            whileHover={{ y: -5 }}
            className={cn(
                "group relative aspect-[3/4.2] rounded-[32px] md:rounded-[48px] overflow-hidden cursor-pointer transition-all duration-500",
                theme === 'dark' ? "bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" : "bg-white shadow-2xl shadow-slate-200",
                !imageLoaded && "animate-pulse bg-slate-800"
            )}
        >
            <div className="absolute top-5 left-5 z-20 flex flex-col gap-2 items-start">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {idol.group ? <Users size={20} className="text-brand-pink" /> : <Users size={20} className="text-brand-pink" />}
                    <span>{idol.group ? 'Group' : 'Soloist'}</span>
                </div>
                {idol.status === 'Inactive' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/80 backdrop-blur-md border border-red-400/30 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                        <span>Inactive</span>
                    </div>
                )}
            </div>

            {user && (
                <div className="absolute top-5 right-5 z-20 flex flex-col gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLike(idol.id);
                        }}
                        className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:text-yellow-400 transition-colors active:scale-90"
                        title={idol.isFavorite ? "Unfavorite Idol" : "Favorite Idol"}
                    >
                        <Star size={18} className={cn("transition-all", idol.isFavorite && "fill-yellow-400 text-yellow-400")} />
                    </button>
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(idol);
                            }}
                            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:text-brand-pink transition-colors active:scale-90"
                            title="Edit Idol"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                </div>
            )}

            <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: imageLoaded ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                src={convertDriveLink(idol.image, 600)}
                alt={idol.name}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
            />

            <div className={cn(
                "absolute inset-0 bg-gradient-to-t transition-opacity duration-500",
                theme === 'dark'
                    ? "from-slate-950 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-70"
                    : "from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60"
            )} />

            <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-end z-10">
                <div className="relative h-28">
                    <div className={cn(
                        "absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-out",
                        idol.group && idol.memberCount > 0 && "group-hover:-translate-y-14"
                    )}>
                        <div className="space-y-2">
                            <motion.p className="text-brand-pink font-black text-xs tracking-[0.3em] uppercase mb-1 truncate">
                                <Highlight text={idol.company} highlight={searchTerm} />
                            </motion.p>
                            <h3 className="text-2xl md:text-4xl font-black text-white group-hover:text-brand-pink mb-1 transition-colors tracking-tight line-clamp-2 break-words">
                                <Highlight text={idol.name} highlight={searchTerm} />
                            </h3>
                            <p className="text-slate-300 font-bold tracking-widest text-xs uppercase opacity-80">{idol.koreanName}</p>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between">
                        <div className="flex gap-3 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                            {idol.group && idol.memberCount > 0 ? (
                                <div className="flex items-center gap-2 text-xs text-white font-black uppercase tracking-widest bg-white/10 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/20">
                                    <Users size={12} className="text-brand-pink" />
                                    <span>{idol.memberCount} Members</span>
                                </div>
                            ) : null}
                        </div>
                        <div className="p-4 rounded-full bg-brand-pink text-white shadow-[0_10px_30px_-5px_rgba(255,51,153,0.5)] scale-0 group-hover:scale-100 transition-transform duration-500">
                            <ChevronRight size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn(
                "absolute inset-0 border-[1.5px] rounded-[32px] md:rounded-[40px] pointer-events-none transition-all duration-500",
                theme === 'dark'
                    ? "border-white/5 group-hover:border-white/20"
                    : "border-black/5 group-hover:border-black/10"
            )} />
        </motion.div>
    );
}
