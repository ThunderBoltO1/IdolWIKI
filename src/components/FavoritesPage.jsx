import React from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Users as UsersIcon, Music } from 'lucide-react';
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
            <div className="flex items-center gap-4 mb-12">
                <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={cn("text-2xl md:text-3xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                    <Star className="text-yellow-400" fill="currentColor" />
                    My Favorites
                </h1>
            </div>

            {noFavorites ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={cn(
                        "text-center py-20 rounded-3xl",
                        theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100'
                    )}
                >
                    <Star size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <h2 className="text-2xl font-bold">Your Favorites List is Empty</h2>
                    <p className="text-slate-500 mt-2">Click the star icon on any idol or group to add them here.</p>
                </motion.div>
            ) : (
                <div className="space-y-16">
                    {favoriteGroups.length > 0 && (
                        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><UsersIcon /> Favorite Groups</h2>
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
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Music /> Favorite Idols</h2>
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