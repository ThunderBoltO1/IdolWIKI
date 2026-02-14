import React from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Users as UsersIcon, Music, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { IdolCard } from './IdolCard';
import { GroupCard } from './GroupCard';
import { BackgroundShapes } from './BackgroundShapes';

export const FavoritesPage = ({ idols, groups, onBack, onSelectIdol, onSelectGroup, onFavoriteIdol, onFavoriteGroup, onEditIdol }) => {
    const { theme } = useTheme();

    const favoriteIdols = idols.filter(i => i.isFavorite);
    const favoriteGroups = groups.filter(g => g.isFavorite);

    const noFavorites = favoriteIdols.length === 0 && favoriteGroups.length === 0;

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
            <BackgroundShapes />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={cn(
                            "p-3 rounded-2xl transition-all active:scale-95 shadow-sm border",
                            theme === 'dark'
                                ? "bg-slate-800 border-white/5 hover:bg-slate-700 text-white"
                                : "bg-white border-slate-100 hover:bg-slate-50 text-slate-900"
                        )}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={cn(
                            "text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <Heart className="text-brand-pink" size={32} fill="currentColor" />
                            My Favorites
                        </h1>
                        <p className={cn(
                            "text-sm font-medium mt-1",
                            theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                            Your collection of favorite idols and groups
                        </p>
                    </div>
                </div>
            </div>

            {noFavorites ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "text-center py-20 rounded-[40px] border",
                        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
                    )}
                >
                    <Heart size={48} className={cn("mx-auto mb-4", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                    <h2 className={cn("text-2xl font-black mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>Your Favorites List is Empty</h2>
                    <p className={cn(theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Click the heart icon on any idol or group to add them here.</p>
                </motion.div>
            ) : (
                <div className="space-y-12">
                    {favoriteGroups.length > 0 && (
                        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className={cn(
                                "text-xs font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-2",
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            )}>
                                <UsersIcon size={16} /> Favorite Groups
                            </h2>
                            <div className="grid gap-6 md:gap-8" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 300px), 1fr))` }}>
                                {favoriteGroups.map(group => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        onClick={() => onSelectGroup(group.id)}
                                        onFavorite={() => onFavoriteGroup(group.id)}
                                    />
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {favoriteIdols.length > 0 && (
                        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <h2 className={cn(
                                "text-xs font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-2",
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            )}>
                                <Music size={16} /> Favorite Idols
                            </h2>
                            <div className="grid gap-6 md:gap-8" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 300px), 1fr))` }}>
                                {favoriteIdols.map(idol => (
                                    <IdolCard
                                        key={idol.id}
                                        idol={idol}
                                        onClick={onSelectIdol}
                                        onLike={onFavoriteIdol} // onLike is the prop for favoriting
                                    />
                                ))}
                            </div>
                        </motion.section>
                    )}
                </div>
            )}
        </div>
    );
};