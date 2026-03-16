import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Loader2, RotateCcw, X, Search, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAwards } from '../hooks/useAwards.js';
import { BackgroundShapes } from './BackgroundShapes';
import { useToast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';

const DEFAULT_AWARD_DATA = {
    "K-Pop & Music Awards": {
        "MAMA Awards": [
            "Artist of the Year", "Song of the Year", "Album of the Year", "Worldwide Icon of the Year",
            "Best Male Artist", "Best Female Artist", "Best Male Group", "Best Female Group", "Best New Artist",
            "Best New Male Artist", "Best New Female Artist",
            "Best Dance Performance (Solo)", "Best Dance Performance (Group)", "Best Dance Performance Male Group", "Best Dance Performance Female Group",
            "Best Vocal Performance (Solo)", "Best Vocal Performance (Group)", "Best Band Performance", "Best Collaboration", "Best OST",
            "Best Music Video", "Best Choreography", "Favorite New Artist", "Worldwide Fans' Choice", "Fans' Choice - Female", "Fans' Choice - Male"
        ],
        "Melon Music Awards (MMA)": [
            "Record of the Year (Daesang)", "Song of the Year (Daesang)", "Album of the Year (Daesang)", "Artist of the Year (Daesang)",
            "Best Group (Female)", "New Artist of the Year", "Top 10 Artists (Bonsang)", "Best Solo (Male/Female)", "Best Group (Male/Female)",
            "Best OST", "Best Music Video", "Global Artist", "Netizen Popularity Award", "Hot Trend Award", "Millions Top 10"
        ],
        "Golden Disc Awards (GDA)": [
            "Digital Daesang (Song of the Year)", "Album Daesang (Album of the Year)", "Digital Song Bonsang", "Album Bonsang",
            "Rookie Artist of the Year", "Best Solo Artist", "Best Group", "Most Popular Artist", "Cosmopolitan Artist Award"
        ],
        "Korean Music Awards (KMA)": [
            "Musician of the Year", "Song of the Year", "Album of the Year", "Rookie of the Year",
            "Best K-Pop Song", "Best K-Pop Album", "Best Pop Song", "Best Pop Album"
        ],
        "Seoul Music Awards (SMA)": [
            "Grand Award (Daesang)", "Main Award (Bonsang)", "Rookie of the Year", "Best Song Award", "Best Album Award",
            "R&B/Hip-Hop Award", "Ballad Award", "OST Award", "Popularity Award", "K-Wave Special Award", "Discovery of the Year"
        ],
        "Circle Chart Music Awards": [
            "Artist of the Year (Global Digital)", "Artist of the Year (Physical Album)", "Artist of the Year (Unique Listeners)",
            "Rookie of the Year", "World K-Pop Star", "Social Hot Star", "Retail Album of the Year", "Music Steady Seller"
        ],
        "The Fact Music Awards (TMA)": [
            "Grand Prize (Daesang)", "Artist of the Year (Bonsang)", "Next Leader Award", "Listener's Choice Award",
            "Worldwide Icon", "Best Performer", "Popularity Award"
        ],
        "Asia Artist Awards (AAA)": [
            "Actor of the Year (Daesang)", "Artist of the Year (Daesang)", "Album of the Year (Daesang)", "Song of the Year (Daesang)",
            "Performance of the Year (Daesang)", "Stage of the Year (Daesang)", "Fandom of the Year (Daesang)",
            "Best Artist", "Best Musician", "Rookie of the Year", "Best Icon", "Best Choice", "Popularity Award", "Asia Celebrity", "Hot Trend"
        ],
        "Hanteo Music Awards": ["Artist of the Year (Bonsang)", "Best Performance (Group)", "Rookie of the Year (Female)"],
        "K-World Dream Awards": ["K-World Dream Super Rookie Award", "K-World Dream Bonsang", "K-World Dream Best Artist", "K-World Dream Best Performance", "K-World Dream Best Music Video", "K-World Dream Producer Award"],
        "Korea Grand Music Awards": ["Grand Honour's Choice", "Best Artist", "Best Group", "Best Solo Artist", "Best Rookie", "Best Song", "Best Album", "Most Popular Artist", "K-Pop Global Leader"],
        "TikTok Awards Korea": ["Best Viral Song", "Artist of the Year", "Creator of the Year", "Video of the Year"],
        "Billboard Music Awards": ["Top Artist", "Top New Artist", "Top Duo/Group", "Top Social Artist", "Top K-Pop Artist", "Top K-Pop Album", "Top K-Pop Song", "Top Global K-Pop Artist", "Top Global K-Pop Album", "Top Global K-Pop Song", "Top K-Pop Touring Artist", "Top Selling Song"],
        "MTV Video Music Awards": ["Video of the Year", "Artist of the Year", "Song of the Year", "Best New Artist", "Push Performance of the Year", "Best Collaboration", "Best Pop", "Best K-Pop", "Best Group", "Song of Summer"]
    },
    "Acting & Arts Awards": {
        "Baeksang Arts Awards": ["Grand Prize (Daesang) - TV", "Best Drama", "Best Director (TV)", "Best Actor (TV)", "Best Actress (TV)", "Best Supporting Actor (TV)", "Best Supporting Actress (TV)", "Best New Actor (TV)", "Best New Actress (TV)", "Grand Prize (Daesang) - Film", "Best Film", "Best Director (Film)", "Best Actor (Film)", "Best Actress (Film)", "Best Supporting Actor (Film)", "Best Supporting Actress (Film)", "Best New Actor (Film)", "Best New Actress (Film)", "Most Popular Actor", "Most Popular Actress"],
        "Blue Dragon Series Awards": ["Blue Dragon's Choice (Daesang)", "Best Drama", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress", "Best Entertainer", "Popular Star Award"],
        "Blue Dragon Film Awards": ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress", "Popular Star Award"],
        "Grand Bell Awards": ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress"]
    }
};

export function AdminAwardManagement({ onBack }) {
    const { theme } = useTheme();
    const toast = useToast();
    const { awards, loading } = useAwards();
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedShow, setExpandedShow] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [newShow, setNewShow] = useState('');
    const [newAward, setNewAward] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const handleSeedData = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Seed Default Data',
            message: 'This will overwrite existing award categories with default K-Pop & acting awards. Continue?',
            confirmText: 'Seed Data',
            type: 'info',
            singleButton: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                setProcessing(true);
                try {
                    const batch = writeBatch(db);
                    for (const [category, shows] of Object.entries(DEFAULT_AWARD_DATA)) {
                        const docRef = doc(db, 'award_categories', category.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                        batch.set(docRef, { name: category, shows: shows });
                    }
                    await batch.commit();
                    toast.success('Data seeded successfully!');
                } catch (error) {
                    console.error("Error seeding data:", error);
                    toast.error("Failed to seed data: " + error.message);
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        setProcessing(true);
        try {
            const id = newCategory.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            await setDoc(doc(db, 'award_categories', id), {
                name: newCategory.trim(),
                shows: {}
            });
            setNewCategory('');
            toast.success('Category added');
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error("Error adding category: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCategory = async (catName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Category',
            message: `Delete "${catName}" and all its shows/awards? This cannot be undone.`,
            confirmText: 'Delete',
            type: 'danger',
            singleButton: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                setProcessing(true);
                try {
                    const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    await deleteDoc(doc(db, 'award_categories', id));
                    toast.success('Category deleted');
                } catch (error) {
                    console.error("Error deleting category:", error);
                    toast.error("Error deleting category: " + error.message);
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const handleAddShow = async (catName) => {
        if (!newShow.trim()) return;
        setProcessing(true);
        try {
            const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const currentShows = awards[catName] || {};
            await updateDoc(doc(db, 'award_categories', id), {
                shows: { ...currentShows, [newShow.trim()]: [] }
            });
            setNewShow('');
            toast.success('Show added');
        } catch (error) {
            console.error("Error adding show:", error);
            toast.error("Error adding show: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteShow = async (catName, showName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Show',
            message: `Delete "${showName}" and all its awards?`,
            confirmText: 'Delete',
            type: 'danger',
            singleButton: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                setProcessing(true);
                try {
                    const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const currentShows = { ...awards[catName] };
                    delete currentShows[showName];
                    await updateDoc(doc(db, 'award_categories', id), { shows: currentShows });
                    toast.success('Show deleted');
                } catch (error) {
                    console.error("Error deleting show:", error);
                    toast.error("Error deleting show: " + error.message);
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const handleAddAward = async (catName, showName) => {
        if (!newAward.trim()) return;
        setProcessing(true);
        try {
            const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const currentShows = { ...awards[catName] };
            const currentAwards = currentShows[showName] || [];
            currentShows[showName] = [...currentAwards, newAward.trim()];
            await updateDoc(doc(db, 'award_categories', id), { shows: currentShows });
            setNewAward('');
            toast.success('Award added');
        } catch (error) {
            console.error("Error adding award:", error);
            toast.error("Error adding award: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAward = async (catName, showName, awardName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Award',
            message: `Delete "${awardName}"?`,
            confirmText: 'Delete',
            type: 'danger',
            singleButton: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                setProcessing(true);
                try {
                    const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const currentShows = { ...awards[catName] };
                    currentShows[showName] = currentShows[showName].filter(a => a !== awardName);
                    await updateDoc(doc(db, 'award_categories', id), { shows: currentShows });
                    toast.success('Award deleted');
                } catch (error) {
                    console.error("Error deleting award:", error);
                    toast.error("Error deleting award: " + error.message);
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const filteredAwards = useMemo(() => {
        if (!searchTerm) return awards;
        const lowerSearch = searchTerm.toLowerCase();
        const result = {};

        Object.entries(awards).forEach(([category, shows]) => {
            const categoryMatches = category.toLowerCase().includes(lowerSearch);
            const matchingShows = {};
            let hasMatchingShows = false;

            Object.entries(shows).forEach(([showName, awardList]) => {
                const showMatches = showName.toLowerCase().includes(lowerSearch);
                const currentAwards = Array.isArray(awardList) ? awardList : [];
                const matchingAwards = currentAwards.filter(a => a.toLowerCase().includes(lowerSearch));
                
                if (categoryMatches || showMatches || matchingAwards.length > 0) {
                    matchingShows[showName] = (categoryMatches || showMatches) ? currentAwards : matchingAwards;
                    hasMatchingShows = true;
                }
            });

            if (hasMatchingShows) {
                result[category] = matchingShows;
            }
        });
        return result;
    }, [awards, searchTerm]);

    const getCategoryStats = (shows) => {
        const showCount = Object.keys(shows || {}).length;
        const awardCount = Object.values(shows || {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
        return { showCount, awardCount };
    };

    return (
        <div className={cn("container mx-auto px-4 pt-24 pb-12 min-h-screen max-w-4xl", theme === 'dark' ? "text-white" : "text-slate-900")}>
            <BackgroundShapes />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={cn("p-2.5 rounded-xl border transition-all shrink-0", theme === 'dark' ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100")}>
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className={cn("text-2xl md:text-3xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            Manage Awards
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage award categories, shows, and individual awards</p>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <button 
                        onClick={handleSeedData} 
                        disabled={processing} 
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
                            theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 border border-white/10" : "bg-slate-100 hover:bg-slate-200 border border-slate-200"
                        )}
                        title="Load K-Pop & Acting awards"
                    >
                        {processing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Seed Defaults
                    </button>
                    <span className="text-[10px] text-slate-500 font-medium">Load default categories</span>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Search awards, shows, or categories..." 
                            className={cn("w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-all font-medium", theme === 'dark' ? "bg-slate-900 border-white/10 focus:border-brand-pink" : "bg-white border-slate-200 focus:border-brand-pink")}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Add New Category</label>
                    <div className="flex gap-2">
                        <input 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)} 
                            placeholder="e.g. Sports Awards" 
                            className={cn("flex-1 p-3 rounded-xl border outline-none font-medium transition-all focus:border-brand-pink", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200")}
                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button 
                            onClick={handleAddCategory} 
                            disabled={processing || !newCategory.trim()} 
                            className={cn(
                                "p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-sm",
                                newCategory.trim() ? "bg-brand-pink text-white hover:scale-105 active:scale-95 shadow-lg shadow-brand-pink/20" : (theme === 'dark' ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400")
                            )}
                        >
                            <Plus size={20} />
                            Add
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-brand-pink" size={40} />
                        <p className="text-sm text-slate-500 font-medium">Loading awards...</p>
                    </div>
                ) : Object.keys(filteredAwards).length === 0 ? (
                    <div className={cn(
                        "text-center py-16 px-8 rounded-2xl border",
                        theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"
                    )}>
                        <Trophy size={48} className="mx-auto mb-4 text-slate-400" />
                        <h3 className={cn("font-bold text-lg mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            {searchTerm ? 'No matching awards' : 'No awards yet'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                            {searchTerm ? 'Try a different search term.' : 'Click "Seed Defaults" to load K-Pop & acting awards, or add a category above.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={handleSeedData} disabled={processing} className="px-6 py-3 rounded-xl bg-brand-pink text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all">
                                Seed Default Data
                            </button>
                        )}
                    </div>
                ) : (
                    Object.entries(filteredAwards).map(([catName, shows]) => {
                        const { showCount, awardCount } = getCategoryStats(shows);
                        return (
                        <motion.div 
                            key={catName} 
                            layout
                            className={cn("rounded-2xl border overflow-hidden transition-shadow", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}
                        >
                            <div 
                                className={cn("p-4 flex items-center justify-between cursor-pointer transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")} 
                                onClick={() => setExpandedCategory(expandedCategory === catName ? null : catName)}
                            >
                                <div className="flex items-center gap-3 font-bold text-lg min-w-0">
                                    {expandedCategory === catName || searchTerm ? <ChevronDown size={20} className="shrink-0" /> : <ChevronRight size={20} className="shrink-0" />}
                                    <span className="truncate">{catName}</span>
                                    <span className={cn("shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full", theme === 'dark' ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500")}>
                                        {showCount} shows · {awardCount} awards
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(catName); }} 
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                    title="Delete category"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {(expandedCategory === catName || searchTerm) && (
                                <div className="p-4 border-t border-dashed border-slate-200 dark:border-white/10 space-y-4 bg-black/5 dark:bg-black/20">
                                    <div className="flex gap-2">
                                        <input value={newShow} onChange={e => setNewShow(e.target.value)} placeholder={`Add Show to ${catName}`} className={cn("flex-1 p-2 rounded-lg border outline-none text-sm", theme === 'dark' ? "bg-slate-800 border-white/10" : "bg-white border-slate-200")} />
                                        <button onClick={() => handleAddShow(catName)} disabled={processing || !newShow.trim()} className="p-2 bg-brand-purple text-white rounded-lg"><Plus size={16} /></button>
                                    </div>
                                    
                                    {Object.entries(shows).map(([showName, awardList]) => {
                                        const awards = Array.isArray(awardList) ? awardList : [];
                                        return (
                                        <div key={showName} className={cn("rounded-xl border p-3", theme === 'dark' ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100")}>
                                            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpandedShow(expandedShow === showName ? null : showName)}>
                                                <div className="flex items-center gap-2 font-bold text-sm min-w-0">
                                                    {expandedShow === showName || searchTerm ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                                                    <span className="truncate">{showName}</span>
                                                    <span className={cn("shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded", theme === 'dark' ? "bg-white/10 text-slate-500" : "bg-slate-100 text-slate-500")}>
                                                        {awards.length} award{awards.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteShow(catName, showName); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={14} /></button>
                                            </div>

                                            {(expandedShow === showName || searchTerm) && (
                                                <div className="pl-6 space-y-2">
                                                    <div className="flex gap-2">
                                                        <input value={newAward} onChange={e => setNewAward(e.target.value)} placeholder={`Add award to ${showName}`} className={cn("flex-1 p-2 rounded-lg border outline-none text-xs font-medium", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200")} onKeyDown={e => e.key === 'Enter' && handleAddAward(catName, showName)} />
                                                        <button onClick={() => handleAddAward(catName, showName)} disabled={processing || !newAward.trim()} className="p-2 bg-brand-blue text-white rounded-lg hover:opacity-90 transition-opacity"><Plus size={14} /></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {awards.map((award, idx) => (
                                                            <div key={idx} className={cn("px-3 py-1 rounded-lg text-xs border flex items-center gap-2", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200")}>
                                                                {award}
                                                                <button onClick={() => handleDeleteAward(catName, showName, award)} className="text-red-500 hover:text-red-600"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                        );
                    })
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                singleButton={confirmModal.singleButton}
            />
        </div>
    );
}