import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, Users, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function GroupSelection({ groups, companies, selectedCompany, onSelectCompany, onSelectGroup }) {
    const { theme } = useTheme();

    return (
        <div className="space-y-16 py-12">
            {/* Hero Section */}
            <section className="text-center space-y-8 max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm font-black tracking-[0.2em] uppercase"
                >
                    <TrendingUp size={16} />
                    <span>The Ultimate Idol Hub</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}
                >
                    Discover Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue animate-gradient">
                        K-Pop Destiny
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "text-lg md:text-xl lg:text-2xl font-medium max-w-2xl mx-auto leading-relaxed",
                        theme === 'dark' ? "text-slate-400" : "text-slate-600"
                    )}
                >
                    Experience the next generation of idol discovery. Seamlessly browse, interact, and stay updated with your favorite artists.
                </motion.p>

                {/* Filter Chips */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-2 md:gap-3 pt-6"
                >
                    <button
                        onClick={() => onSelectCompany('')}
                        className={cn(
                            "px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] transition-all border outline-none group",
                            !selectedCompany
                                ? "bg-brand-pink border-brand-pink text-white shadow-[0_10px_30px_-10px_rgba(255,51,153,0.5)] scale-105"
                                : theme === 'dark'
                                    ? "bg-slate-900 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                                    : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 shadow-sm"
                        )}
                    >
                        Total Roster
                    </button>
                    {companies.map(company => (
                        <button
                            key={company}
                            onClick={() => onSelectCompany(company)}
                            className={cn(
                                "px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] transition-all border outline-none",
                                selectedCompany === company
                                    ? "bg-brand-pink border-brand-pink text-white shadow-[0_10px_30px_-10px_rgba(255,51,153,0.5)] scale-105"
                                    : theme === 'dark'
                                        ? "bg-slate-900 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                                        : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 shadow-sm"
                            )}
                        >
                            {company}
                        </button>
                    ))}
                </motion.div>
            </section>

            {/* Group Grid with Layout Transitions */}
            <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 px-4"
            >
                <AnimatePresence mode='popLayout'>
                    {groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            theme={theme}
                            onClick={() => onSelectGroup(group.id)}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Features Stats */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                    "p-16 rounded-[48px] flex flex-wrap justify-center gap-12 md:gap-32 relative overflow-hidden",
                    theme === 'dark'
                        ? "bg-slate-900/40 backdrop-blur-2xl border border-white/5"
                        : "bg-white border border-slate-100 shadow-2xl shadow-slate-200/50"
                )}
            >
                <div className="absolute top-0 right-0 p-8 text-brand-pink opacity-10 rotate-12 scale-150">
                    <Star size={120} fill="currentColor" />
                </div>

                <div className="text-center group relative z-10">
                    <p className={cn("text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink")}>
                        {groups.length}
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Hot Categories</p>
                </div>
                <div className="text-center group relative z-10">
                    <p className={cn("text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-purple" : "text-slate-900 group-hover:text-brand-purple")}>
                        {groups.reduce((acc, g) => acc + g.members.length, 0)}
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Top Idols</p>
                </div>
                <div className="text-center group relative z-10">
                    <p className={cn("text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-blue" : "text-slate-900 group-hover:text-brand-blue")}>100%</p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Verified</p>
                </div>
            </motion.div>
        </div>
    );
}

function GroupCard({ group, theme, onClick }) {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Dynamic Glow Position
        const glowX = (x / rect.width) * 100;
        const glowY = (y / rect.height) * 100;
        setGlowPos({ x: glowX, y: glowY });

        const rotateX = (y - centerY) / 8;
        const rotateY = (centerX - x) / 8;
        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
                rotateX: rotate.x,
                rotateY: rotate.y,
                perspective: 1200
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                layout: { duration: 0.5 }
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={cn(
                "group relative aspect-[3/4.2] rounded-[48px] overflow-hidden cursor-pointer transition-all duration-300",
                theme === 'dark' ? "bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" : "bg-white shadow-2xl shadow-slate-200"
            )}
        >
            {/* Holographic Glow Effect */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 z-10 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,0.3) 0%, transparent 60%), 
                                 radial-gradient(circle at ${100 - glowPos.x}% ${100 - glowPos.y}%, rgba(255,51,153,0.1) 0%, transparent 40%)`
                }}
            />

            {/* Background Image */}
            <img
                src={group.image}
                alt={group.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />

            {/* Overlay */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-t transition-opacity duration-500",
                theme === 'dark'
                    ? "from-slate-950 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-70"
                    : "from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60"
            )} />

            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end translate-z-10 mt-10">
                <div className="space-y-2">
                    <motion.p className="text-brand-pink font-black text-[10px] tracking-[0.3em] uppercase mb-1">
                        {group.company}
                    </motion.p>
                    <h3 className="text-4xl font-black text-white group-hover:text-brand-pink mb-1 transition-colors tracking-tight">
                        {group.name}
                    </h3>
                    <p className="text-slate-300 font-bold tracking-widest text-xs uppercase opacity-80">{group.koreanName}</p>
                </div>

                <div className="mt-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest bg-white/10 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/20">
                            <Users size={12} className="text-brand-pink" />
                            <span>{group.members.length}</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-full bg-brand-pink text-white shadow-[0_10px_30px_-5px_rgba(255,51,153,0.5)] scale-0 group-hover:scale-100 transition-transform duration-500">
                        <ChevronRight size={24} />
                    </div>
                </div>
            </div>

            {/* Premium Border Accent */}
            <div className={cn(
                "absolute inset-0 border-[1.5px] rounded-[40px] pointer-events-none transition-all duration-500",
                theme === 'dark'
                    ? "border-white/5 group-hover:border-white/20"
                    : "border-black/5 group-hover:border-black/10"
            )} />
        </motion.div>
    );
}
