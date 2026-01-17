import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronRight, Loader2, RotateCcw, X, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAwards } from '../hooks/useAwards.js';
import { BackgroundShapes } from './BackgroundShapes';

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
    const { awards, loading } = useAwards();
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedShow, setExpandedShow] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [newShow, setNewShow] = useState('');
    const [newAward, setNewAward] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSeedData = async () => {
        if (!window.confirm("This will overwrite existing award categories with default data. Continue?")) return;
        setProcessing(true);
        try {
            const batch = writeBatch(db);
            for (const [category, shows] of Object.entries(DEFAULT_AWARD_DATA)) {
                const docRef = doc(db, 'award_categories', category.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                batch.set(docRef, { name: category, shows: shows });
            }
            await batch.commit();
            alert("Data seeded successfully!");
        } catch (error) {
            console.error("Error seeding data:", error);
            alert("Failed to seed data: " + error.message);
        } finally {
            setProcessing(false);
        }
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
        } catch (error) {
            console.error("Error adding category:", error);
            alert("Error adding category: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCategory = async (catName) => {
        if (!window.confirm(`Delete category "${catName}"?`)) return;
        setProcessing(true);
        try {
            const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await deleteDoc(doc(db, 'award_categories', id));
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Error deleting category: " + error.message);
        } finally {
            setProcessing(false);
        }
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
        } catch (error) {
            console.error("Error adding show:", error);
            alert("Error adding show: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteShow = async (catName, showName) => {
        if (!window.confirm(`Delete show "${showName}"?`)) return;
        setProcessing(true);
        try {
            const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const currentShows = { ...awards[catName] };
            delete currentShows[showName];
            await updateDoc(doc(db, 'award_categories', id), { shows: currentShows });
        } catch (error) {
            console.error("Error deleting show:", error);
            alert("Error deleting show: " + error.message);
        } finally {
            setProcessing(false);
        }
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
        } catch (error) {
            console.error("Error adding award:", error);
            alert("Error adding award: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAward = async (catName, showName, awardName) => {
        if (!window.confirm(`Delete award "${awardName}"?`)) return;
        setProcessing(true);
        try {
            const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const currentShows = { ...awards[catName] };
            currentShows[showName] = currentShows[showName].filter(a => a !== awardName);
            await updateDoc(doc(db, 'award_categories', id), { shows: currentShows });
        } catch (error) {
            console.error("Error deleting award:", error);
            alert("Error deleting award: " + error.message);
        } finally {
            setProcessing(false);
        }
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

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-4xl">
            <BackgroundShapes />
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className={cn("text-3xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        Manage Awards
                    </h1>
                </div>
                <button onClick={handleSeedData} disabled={processing} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors", theme === 'dark' ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200")}>
                    <RotateCcw size={14} /> Seed Defaults
                </button>
            </div>

            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder="Search awards, shows, or categories..." 
                        className={cn("w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all", theme === 'dark' ? "bg-slate-900 border-white/10 focus:border-brand-pink" : "bg-white border-slate-200 focus:border-brand-pink")}
                    />
                </div>

                <div className="flex gap-2">
                    <input 
                        value={newCategory} 
                        onChange={e => setNewCategory(e.target.value)} 
                        placeholder="New Category Name" 
                        className={cn("flex-1 p-3 rounded-xl border outline-none", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200")}
                    />
                    <button onClick={handleAddCategory} disabled={processing || !newCategory.trim()} className="p-3 bg-brand-pink text-white rounded-xl"><Plus size={20} /></button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                ) : Object.keys(filteredAwards).length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        {searchTerm ? "No matching awards found." : "No awards found. Use \"Seed Defaults\" to initialize."}
                    </div>
                ) : (
                    Object.entries(filteredAwards).map(([catName, shows]) => (
                        <div key={catName} className={cn("rounded-2xl border overflow-hidden", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                            <div className={cn("p-4 flex items-center justify-between cursor-pointer", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")} onClick={() => setExpandedCategory(expandedCategory === catName ? null : catName)}>
                                <div className="flex items-center gap-3 font-bold text-lg">
                                    {expandedCategory === catName || searchTerm ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    {catName}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(catName); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                            </div>

                            {(expandedCategory === catName || searchTerm) && (
                                <div className="p-4 border-t border-dashed border-slate-200 dark:border-white/10 space-y-4 bg-black/5 dark:bg-black/20">
                                    <div className="flex gap-2">
                                        <input value={newShow} onChange={e => setNewShow(e.target.value)} placeholder={`Add Show to ${catName}`} className={cn("flex-1 p-2 rounded-lg border outline-none text-sm", theme === 'dark' ? "bg-slate-800 border-white/10" : "bg-white border-slate-200")} />
                                        <button onClick={() => handleAddShow(catName)} disabled={processing || !newShow.trim()} className="p-2 bg-brand-purple text-white rounded-lg"><Plus size={16} /></button>
                                    </div>
                                    
                                    {Object.entries(shows).map(([showName, awardList]) => (
                                        <div key={showName} className={cn("rounded-xl border p-3", theme === 'dark' ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-100")}>
                                            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpandedShow(expandedShow === showName ? null : showName)}>
                                                <div className="flex items-center gap-2 font-bold text-sm">
                                                    {expandedShow === showName || searchTerm ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    {showName}
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteShow(catName, showName); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={14} /></button>
                                            </div>

                                            {(expandedShow === showName || searchTerm) && (
                                                <div className="pl-6 space-y-2">
                                                    <div className="flex gap-2">
                                                        <input value={newAward} onChange={e => setNewAward(e.target.value)} placeholder={`Add Award to ${showName}`} className={cn("flex-1 p-2 rounded-lg border outline-none text-xs", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200")} />
                                                        <button onClick={() => handleAddAward(catName, showName)} disabled={processing || !newAward.trim()} className="p-2 bg-brand-blue text-white rounded-lg"><Plus size={14} /></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {awardList.map((award, idx) => (
                                                            <div key={idx} className={cn("px-3 py-1 rounded-lg text-xs border flex items-center gap-2", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200")}>
                                                                {award}
                                                                <button onClick={() => handleDeleteAward(catName, showName, award)} className="text-red-500 hover:text-red-600"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}