import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, Users, Star, LayoutGrid, Music, ZoomIn, ZoomOut, Sparkles, Loader2, X, Calendar, Globe, Building2, Share2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { IdolCard } from './IdolCard';
import { GroupCard } from './GroupCard';
import { BackgroundShapes } from './BackgroundShapes';
import { BackToTopButton } from './BackToTopButton';

export function GroupSelection({ groups, idols, companies, selectedCompany, onSelectCompany, onSelectGroup, onSelectIdol, onLikeIdol, onFavoriteGroup, loading, searchTerm, onSearchPosition, onEditIdol }) {
    const { theme } = useTheme();
    const [viewMode, setViewMode] = useState('all'); // 'all', 'groups', 'soloists'
    const [cardSize, setCardSize] = useState(300);
    const [visibleCount, setVisibleCount] = useState(48);
    const loadMoreRef = useRef(null);
    const [debutYearFilter, setDebutYearFilter] = useState('');
    const [quickViewIdol, setQuickViewIdol] = useState(null);
    const [sortBy, setSortBy] = useState('name_asc');

    useEffect(() => {
        setVisibleCount(48);
    }, [viewMode, searchTerm, selectedCompany]);

    const debutYears = useMemo(() => {
        const groupYears = (groups || []).map(g => g.debutDate ? new Date(g.debutDate).getFullYear() : null);
        const idolYears = (idols || []).map(i => i.debutDate ? new Date(i.debutDate).getFullYear() : null);
        const allYears = [...groupYears, ...idolYears].filter(Boolean);
        const uniqueYears = [...new Set(allYears)];
        return uniqueYears.sort((a, b) => b - a); // Sort descending
    }, [groups, idols]);

    const filteredGroups = useMemo(() => (groups || []).filter(group => {
        const searchLower = (searchTerm || '').toLowerCase();
        const matchesYear = !debutYearFilter || (group.debutDate && new Date(group.debutDate).getFullYear().toString() === debutYearFilter);
        return (
            (group.name || '').toLowerCase().includes(searchLower) ||
            (group.koreanName && group.koreanName.includes(searchTerm || '')) ||
            ((group.company || '').toLowerCase().includes(searchLower))
        ) && matchesYear;
    }), [groups, searchTerm, debutYearFilter]);

    // Filter idols that are not in any of the displayed groups (Soloists or Orphans)
    const displayIdols = useMemo(() => (idols || []).filter(idol => {
        const matchesCompany = !selectedCompany || (idol.company || '').split(' (')[0] === selectedCompany;
        const isGroupMember = idol.groupId && groups.some(g => g.id === idol.groupId);
        
        const searchLower = (searchTerm || '').toLowerCase();
        const matchesYear = !debutYearFilter || (idol.debutDate && new Date(idol.debutDate).getFullYear().toString() === debutYearFilter);
        const zodiac = calculateZodiac(idol.birthDate);
        const matchesSearch = !searchTerm || (
            (idol.name || '').toLowerCase().includes(searchLower) ||
            (idol.koreanName && idol.koreanName.includes(searchTerm || '')) ||
            (idol.fullEnglishName && idol.fullEnglishName.toLowerCase().includes(searchLower)) ||
            (idol.company && idol.company.toLowerCase().includes(searchLower)) ||
            (zodiac && zodiac.toLowerCase().includes(searchLower)) ||
            (idol.positions && idol.positions.some(p => p.toLowerCase().includes(searchLower)))
        );

        return matchesCompany && !isGroupMember && matchesSearch && matchesYear;
    }).sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    }), [idols, groups, selectedCompany, searchTerm]);

    const allItems = useMemo(() => {
        const items = [
            ...((viewMode === 'all' || viewMode === 'groups') ? filteredGroups.map(g => ({ ...g, _type: 'group' })) : []),
            ...((viewMode === 'all' || viewMode === 'soloists') ? displayIdols.map(i => ({ ...i, _type: 'idol' })) : [])
        ];

        return items.sort((a, b) => {
            // Prioritize favorites
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;

            switch (sortBy) {
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'debut_desc':
                    return new Date(b.debutDate || '1900-01-01') - new Date(a.debutDate || '1900-01-01');
                case 'debut_asc':
                    return new Date(a.debutDate || '1900-01-01') - new Date(b.debutDate || '1900-01-01');
                case 'members_desc':
                    return (b.members?.length || (b._type === 'idol' ? 1 : 0)) - (a.members?.length || (a._type === 'idol' ? 1 : 0));
                case 'members_asc':
                    return (a.members?.length || (a._type === 'idol' ? 1 : 0)) - (b.members?.length || (b._type === 'idol' ? 1 : 0));
                default:
                    return 0;
            }
        });
    }, [viewMode, filteredGroups, displayIdols, sortBy]);

    const visibleItems = allItems.slice(0, visibleCount);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && visibleCount < allItems.length) {
                    // Debounce/Throttle to prevent freezing
                    setTimeout(() => {
                        setVisibleCount(prev => prev + 24);
                    }, 100);
                }
            },
            { threshold: 0, rootMargin: '200px' }
        );

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [loading, visibleCount, allItems.length]);

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
                        "text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight relative z-10",
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

                    {/* Right Controls: Filters & Slider */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"
                    >
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select
                                value={debutYearFilter}
                                onChange={(e) => setDebutYearFilter(e.target.value)}
                                className={cn(
                                    "flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border outline-none appearance-none cursor-pointer",
                                    theme === 'dark' ? "bg-slate-900 border-white/10 text-slate-500 hover:text-white hover:border-white/20" : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300"
                                )}
                            >
                                <option value="">Year</option>
                                {debutYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className={cn(
                                    "flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border outline-none appearance-none cursor-pointer",
                                    theme === 'dark' ? "bg-slate-900 border-white/10 text-slate-500 hover:text-white hover:border-white/20" : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300"
                                )}
                            >
                                <option value="name_asc">A-Z</option>
                                <option value="name_desc">Z-A</option>
                                <option value="debut_desc">Newest</option>
                                <option value="debut_asc">Oldest</option>
                                <option value="members_desc">Most Members</option>
                                <option value="members_asc">Least Members</option>
                            </select>
                        </div>

                        <div className={cn(
                            "w-full sm:w-auto flex items-center gap-3 px-4 py-2 rounded-xl border",
                            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                        )}>
                            <ZoomOut size={14} className="text-slate-400" />
                            <input
                                type="range"
                                min="200" max="500" step="5"
                                value={cardSize}
                                onChange={(e) => setCardSize(Number(e.target.value))}
                                className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-pink"
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
                <AnimatePresence mode="wait">
                    {loading ? (
                        Array.from({ length: 12 }).map((_, i) => (
                            <SkeletonCard key={`skeleton-${i}`} theme={theme} />
                        ))
                    ) : (
                        <>
                            {/* Render Groups */}
                            {(viewMode === 'all' || viewMode === 'groups') &&
                                visibleItems
                                    .filter(item => item._type === 'group')
                                    .map((item) => (
                                        <GroupCard
                                            key={item.id}
                                            searchTerm={searchTerm}
                                            group={item}
                                            onClick={() => onSelectGroup(item.id)}
                                            onFavorite={() => onFavoriteGroup(item.id)}
                                        />
                                    ))}

                            {/* Separator and Header for Solo Artists */}
                            {viewMode === 'all' &&
                                visibleItems.some(i => i._type === 'group') &&
                                visibleItems.some(i => i._type === 'idol') && (
                                    <div className="col-span-full h-px bg-white/10 my-8" />
                                )}

                            {/* Render Solo Artists */}
                            {(viewMode === 'all' || viewMode === 'soloists') &&
                                visibleItems
                                    .filter(item => item._type === 'idol')
                                    .map((item) => (
                                        <IdolCard
                                            key={item.id}
                                            idol={item}
                                            searchTerm={searchTerm}
                                            onLike={onLikeIdol}
                                            onClick={onSelectIdol}
                                            onQuickView={setQuickViewIdol}
                                            onEdit={onEditIdol}
                                        />
                                    ))}
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {!loading && allItems.length === 0 && (
                <div className="px-4">
                    <div className={cn(
                        "max-w-2xl mx-auto text-center rounded-[40px] p-10 border",
                        theme === 'dark'
                            ? "bg-slate-900/40 border-white/10 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                    )}>
                        <p className={cn(
                            "text-sm font-black uppercase tracking-widest",
                            theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                            No results found
                        </p>
                        <p className={cn(
                            "mt-3 text-sm font-medium",
                            theme === 'dark' ? "text-slate-300" : "text-slate-600"
                        )}>
                            Try adjusting your search or filters.
                        </p>
                    </div>
                </div>
            )}

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
                    "p-8 sm:p-16 rounded-[48px] flex flex-wrap justify-center gap-8 sm:gap-12 md:gap-32 relative overflow-hidden",
                    theme === 'dark'
                        ? "bg-slate-900/40 backdrop-blur-2xl border border-white/5"
                        : "bg-white border border-slate-100 shadow-2xl shadow-slate-200/50"
                )}
            >
                <div className="absolute top-0 right-0 p-8 text-brand-pink opacity-10 rotate-12 scale-150">
                    <Star size={120} fill="currentColor" />
                </div>

                <div className="text-center group relative z-10">
                    <p className={cn("text-4xl sm:text-5xl md:text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink")}>
                        {(groups || []).length}
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Hot Categories</p>
                </div>
                <div className="text-center group relative z-10">
                    <p className={cn("text-4xl sm:text-5xl md:text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-purple" : "text-slate-900 group-hover:text-brand-purple")}>
                        {(groups || []).reduce((acc, g) => acc + ((g.members || []).length), 0) + displayIdols.length}
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Top Idols</p>
                </div>
                <div className="text-center group relative z-10">
                    <p className={cn("text-4xl sm:text-5xl md:text-6xl font-black transition-all group-hover:scale-110", theme === 'dark' ? "text-white group-hover:text-brand-blue" : "text-slate-900 group-hover:text-brand-blue")}>100%</p>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Verified</p>
                </div>
            </motion.div>
            <AnimatePresence>
                {quickViewIdol && (
                    <QuickViewModal idol={quickViewIdol} onClose={() => setQuickViewIdol(null)} theme={theme} onSearchPosition={onSearchPosition} />
                )}
            </AnimatePresence>

            <BackToTopButton />
        </div>
    );
}

function QuickViewModal({ idol, onClose, theme, onSearchPosition }) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const text = `Check out ${idol.name} from ${idol.group} on K-Pop DB!`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handlePositionClick = (pos) => {
        // Close modal and set search term to filter by position
        onClose();
        if (onSearchPosition) onSearchPosition(pos);
    };

    const getPositionStyle = (position) => {
        // Minimal style for all positions
        // Using a subtle background and border for a clean look
        return theme === 'dark'
            ? "bg-slate-800/80 text-slate-500 border-white/5 group-hover:border-brand-pink/20"
            : "bg-slate-50 text-slate-400 border-slate-100 group-hover:border-brand-pink/10";
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
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                        <p className="text-xs font-bold text-brand-pink uppercase tracking-[0.2em] mb-2 truncate">{idol.group}</p>
                        <h3 className="text-3xl md:text-4xl font-black tracking-tight break-words line-clamp-2">{idol.name}</h3>
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
                                <span 
                                    key={i} 
                                    onClick={() => handlePositionClick(pos)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer hover:opacity-80 transition-opacity",
                                        getPositionStyle(pos)
                                    )}
                                >
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
            className={cn("relative px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all outline-none overflow-hidden", isActive ? "text-white shadow-lg shadow-brand-pink/25" : theme === 'dark' ? "bg-slate-900 border border-white/5 text-slate-500 hover:text-white hover:border-white/10" : "bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 shadow-sm")}
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

function calculateZodiac(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries ♈";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus ♉";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini ♊";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer ♋";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo ♌";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo ♍";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra ♎";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio ♏";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius ♐";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn ♑";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius ♒";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces ♓";
    return null;
}
