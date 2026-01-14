import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { ChevronRight, TrendingUp, Users, Star, LayoutGrid, Music, ZoomIn, ZoomOut, Sparkles, Loader2, X, Calendar, Globe, Building2, Share2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { IdolCard } from './IdolCard';
import { useAuth } from '../context/AuthContext';

export function GroupSelection({ groups, idols, companies, selectedCompany, onSelectCompany, onSelectGroup, onSelectIdol, onLikeIdol, onFavoriteGroup, loading, searchTerm }) {
    const { theme } = useTheme();
    const [viewMode, setViewMode] = useState('all'); // 'all', 'groups', 'soloists'
    const [cardSize, setCardSize] = useState(300);
    const [visibleCount, setVisibleCount] = useState(24);
    const loadMoreRef = useRef(null);
    const [quickViewIdol, setQuickViewIdol] = useState(null);

    useEffect(() => {
        setVisibleCount(24);
    }, [viewMode, searchTerm, selectedCompany]);

    const filteredGroups = useMemo(() => groups.filter(group => {
        const searchLower = searchTerm.toLowerCase();
        return (
            group.name.toLowerCase().includes(searchLower) ||
            (group.koreanName && group.koreanName.includes(searchTerm))
        );
    }), [groups, searchTerm]);

    // Filter idols that are not in any of the displayed groups (Soloists or Orphans)
    const displayIdols = useMemo(() => (idols || []).filter(idol => {
        const matchesCompany = !selectedCompany || (idol.company || '').includes(selectedCompany);
        const isGroupMember = idol.groupId && groups.some(g => g.id === idol.groupId);
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
            idol.name.toLowerCase().includes(searchLower) ||
            (idol.koreanName && idol.koreanName.includes(searchTerm)) ||
            (idol.fullEnglishName && idol.fullEnglishName.toLowerCase().includes(searchLower))
        );

        return matchesCompany && !isGroupMember && matchesSearch;
    }).sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    }), [idols, groups, selectedCompany, searchTerm]);

    const allItems = useMemo(() => [
        ...((viewMode === 'all' || viewMode === 'groups') ? filteredGroups.map(g => ({ ...g, _type: 'group' })) : []),
        ...((viewMode === 'all' || viewMode === 'soloists') ? displayIdols.map(i => ({ ...i, _type: 'idol' })) : [])
    ], [viewMode, filteredGroups, displayIdols]);

    const visibleItems = allItems.slice(0, visibleCount);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && visibleCount < allItems.length) {
                    setVisibleCount(prev => prev + 12);
                }
            },
            { threshold: 0.1, rootMargin: '400px' }
        );

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [loading, visibleCount, allItems.length]);

    // Background Floating Shapes
    const BackgroundShapes = () => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <motion.div
                animate={{
                    y: [0, -40, 0],
                    rotate: [0, 10, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: "transform" }}
                className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-pink/5 rounded-full blur-[100px]"
            />
            <motion.div
                animate={{
                    y: [0, 50, 0],
                    rotate: [0, -10, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                style={{ willChange: "transform" }}
                className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-brand-purple/5 rounded-full blur-[100px]"
            />
        </div>
    );

    return (
        <div className="space-y-12 py-12 relative">
            <BackgroundShapes />
            
            {/* Hero Section */}
            <section className="text-center space-y-8 max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-pink/10 to-brand-purple/10 border border-brand-pink/20 text-brand-pink text-xs font-black tracking-[0.25em] uppercase shadow-lg shadow-brand-pink/5 backdrop-blur-sm"
                >
                    <Sparkles size={14} className="animate-pulse" />
                    <span>The Ultimate Idol Hub</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight relative z-10",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}
                >
                    Discover Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue animate-gradient bg-[length:200%_auto]">
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

            </section>

            {/* Controls Section */}
            <div className="space-y-6 max-w-[1600px] mx-auto px-4">
                {/* Top Row: View Mode & Search */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* View Mode Toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex justify-center md:justify-start gap-2 w-full md:w-auto"
                    >
                        {[
                            { id: 'all', label: 'All', icon: LayoutGrid },
                            { id: 'groups', label: 'Groups', icon: Users },
                            { id: 'soloists', label: 'Soloists', icon: Music }
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                className={cn(
                                    "relative flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border overflow-hidden",
                                    viewMode === mode.id
                                        ? "text-white shadow-lg shadow-brand-purple/25 border-transparent"
                                        : theme === 'dark'
                                            ? "bg-slate-900 border-white/10 text-slate-500 hover:text-white hover:border-white/20"
                                            : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300"
                                )}
                            >
                                {viewMode === mode.id && (
                                    <motion.div
                                        layoutId="activeViewMode"
                                        className="absolute inset-0 bg-brand-purple"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <mode.icon size={14} />
                                    <span>{mode.label}</span>
                                </span>
                            </button>
                        ))}
                    </motion.div>

                </div>

                {/* Bottom Row: Filters & Slider */}
                <div className="flex flex-col-reverse md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Filter Chips */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap justify-start gap-2 md:gap-3 flex-1"
                    >
                        <FilterButton label="All" isActive={!selectedCompany} onClick={() => onSelectCompany('')} theme={theme} />
                        {companies.map(company => (
                            <FilterButton
                                key={company}
                                label={company}
                                isActive={selectedCompany === company}
                                onClick={() => onSelectCompany(company)}
                                theme={theme}
                            />
                        ))}
                    </motion.div>

                    {/* Card Size Slider */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="w-full md:w-auto flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-2 pl-4 pr-3 rounded-2xl border border-slate-200 dark:border-white/5"
                    >
                        <span className={cn("text-[10px] font-black uppercase tracking-widest whitespace-nowrap", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                            Size
                        </span>
                        <div className="flex items-center gap-3 min-w-[100px]">
                            <ZoomOut size={14} className="text-slate-400" />
                            <input
                                type="range"
                                min="200" max="500" step="5"
                                value={cardSize}
                                onChange={(e) => setCardSize(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                            />
                            <ZoomIn size={14} className="text-slate-400" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Group Grid with Layout Transitions */}
            <motion.div
                className="grid gap-6 md:gap-8 px-4"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardSize}px), 1fr))` }}
            >
                <AnimatePresence mode='popLayout'>
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonCard key={`skeleton-${i}`} theme={theme} />
                        ))
                    ) : (
                        <>
                            {/* Render Groups */}
                            {(viewMode === 'all' || viewMode === 'groups') && visibleItems.filter(item => item._type === 'group').map((item) => (
                                <GroupCard
                                    key={item.id}
                                    group={item}
                                    onClick={() => onSelectGroup(item.id)}
                                    onFavorite={() => onFavoriteGroup(item.id)}
                                />
                            ))}

                            {/* Separator and Header for Solo Artists */}
                            {viewMode === 'all' && visibleItems.some(i => i._type === 'group') && visibleItems.some(i => i._type === 'idol') && (
                                <div className="col-span-full h-px bg-white/10 my-8" />
                            )}

                            {/* Render Solo Artists */}
                            {(viewMode === 'all' || viewMode === 'soloists') && visibleItems.filter(item => item._type === 'idol').map((item) => (
                                <IdolCard
                                    key={item.id}
                                    idol={item}
                                    onLike={onLikeIdol}
                                    onClick={onSelectIdol}
                                    onQuickView={setQuickViewIdol}
                                />
                            ))}
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Load More Button */}
            {!loading && visibleCount < allItems.length && (
                <div ref={loadMoreRef} className="flex justify-center pt-12 pb-8">
                    <div className={cn(
                        "p-3 rounded-full shadow-lg",
                        theme === 'dark' ? "bg-slate-800 text-brand-pink" : "bg-white text-brand-pink"
                    )}>
                        <Loader2 className="animate-spin" size={24} />
                    </div>
                </div>
            )}

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
                        {groups.reduce((acc, g) => acc + g.members.length, 0) + displayIdols.length}
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Top Idols</p>
                </div>
                <div className="text-center group relative z-10">
                    <p className={cn("text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-blue" : "text-slate-900 group-hover:text-brand-blue")}>100%</p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Verified</p>
                </div>
            </motion.div>

            <AnimatePresence>
                {quickViewIdol && (
                    <QuickViewModal idol={quickViewIdol} onClose={() => setQuickViewIdol(null)} theme={theme} />
                )}
            </AnimatePresence>
        </div>
    );
}

function GroupCard({ group, onClick, onFavorite }) {
    const { theme } = useTheme();
    const { user } = useAuth();
    
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

    const glowX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
    const glowY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);
    const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at ${useTransform(glowX, v => 100 - v)}% ${useTransform(glowY, v => 100 - v)}%, rgba(255,51,153,0.1) 0%, transparent 40%)`;

    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(xPct);
        mouseY.set(yPct);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
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
            style={{
                rotateX,
                rotateY,
                perspective: 1000,
                transformStyle: "preserve-3d",
                willChange: "transform"
            }}
            className={cn(
                "group relative aspect-[3/4.2] rounded-[48px] overflow-hidden cursor-pointer transition-all duration-300",
                theme === 'dark' ? "bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" : "bg-white shadow-2xl shadow-slate-200"
            )}
        >
            <div className="absolute top-5 left-5 z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                    <Users size={12} className="text-brand-pink" />
                    <span>Group</span>
                </div>
            </div>

            {user && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFavorite();
                    }}
                    className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:text-yellow-400 transition-colors active:scale-90"
                    title={group.isFavorite ? "Unfavorite Group" : "Favorite Group"}
                >
                    <Star size={18} className={cn("transition-all", group.isFavorite && "fill-yellow-400 text-yellow-400")} />
                </button>
            )}


            {/* Holographic Glow Effect */}
            <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 z-10 pointer-events-none"
                style={{
                    background: glowBackground
                }}
            />

            {/* Background Image */}
            <img
                src={group.image}
                alt={group.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                loading="lazy"
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

function QuickViewModal({ idol, onClose, theme }) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const text = `Check out ${idol.name} from ${idol.group} on K-Pop DB!`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className={cn(
                    "relative w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                )}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-full md:w-5/12 h-80 md:h-auto relative overflow-hidden group">
                    <img
                        src={idol.image}
                        alt={idol.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                        <p className="text-xs font-bold text-brand-pink uppercase tracking-[0.2em] mb-2">{idol.group}</p>
                        <h3 className="text-4xl font-black tracking-tight">{idol.name}</h3>
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center space-y-8">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-brand-pink mb-2">Profile</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm font-medium opacity-80">
                                <Users size={16} />
                                <span>{idol.fullEnglishName} ({idol.koreanName})</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium opacity-80">
                                <Building2 size={16} />
                                <span>{idol.company}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium opacity-80">
                                <Globe size={16} />
                                <span>{idol.nationality}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium opacity-80">
                                <Calendar size={16} />
                                <span>Born: {idol.birthDate}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-brand-purple mb-2">Positions</h4>
                        <div className="flex flex-wrap gap-2">
                            {idol.positions?.map((pos, i) => (
                                <span key={i} className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border",
                                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                                )}>
                                    {pos}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={handleShare}
                            className={cn(
                                "flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                                theme === 'dark' ? "bg-white text-slate-900 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                        >
                            {copied ? <Check size={16} /> : <Share2 size={16} />}
                            {copied ? "Copied!" : "Share Profile"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function FilterButton({ label, isActive, onClick, theme }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all outline-none overflow-hidden",
                isActive
                    ? "text-white shadow-lg shadow-brand-pink/25"
                    : theme === 'dark'
                        ? "bg-slate-900 border border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                        : "bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 shadow-sm"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="activeCompany"
                    className="absolute inset-0 bg-gradient-to-r from-brand-pink to-brand-purple"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            )}
            <span className="relative z-10">{label}</span>
        </button>
    );
}

function SkeletonCard({ theme }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
                "aspect-[3/4.2] rounded-[48px] overflow-hidden relative",
                theme === 'dark' ? "bg-slate-900" : "bg-slate-100"
            )}
        >
            <div className={cn(
                "absolute inset-0 animate-pulse",
                theme === 'dark' ? "bg-slate-800" : "bg-slate-200"
            )} />
            <div className="absolute bottom-8 left-8 right-8 space-y-4 opacity-50">
                <div className={cn("h-3 w-1/3 rounded-full", theme === 'dark' ? "bg-slate-700" : "bg-slate-300")} />
                <div className={cn("h-8 w-2/3 rounded-full", theme === 'dark' ? "bg-slate-700" : "bg-slate-300")} />
            </div>
        </motion.div>
    );
}
