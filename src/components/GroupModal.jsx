import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, Globe, Calendar, Users, Image as ImageIcon, Loader2, Trophy, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

const AWARD_DATA = {
    "K-Pop & Music Awards": {
        "MAMA Awards": [
            "Artist of the Year", "Song of the Year", "Album of the Year", "Worldwide Icon of the Year",
            "Best Male Artist", "Best Female Artist", "Best Male Group", "Best Female Group", "Best New Artist",
            "Best Dance Performance (Solo)", "Best Dance Performance (Group)", "Best Vocal Performance (Solo)", "Best Vocal Performance (Group)", "Best Band Performance", "Best Collaboration", "Best OST",
            "Best Music Video", "Best Choreography", "Favorite New Artist", "Worldwide Fans' Choice"
        ],
        "Melon Music Awards (MMA)": [
            "Artist of the Year", "Album of the Year", "Song of the Year", "Record of the Year",
            "Top 10 Artists (Bonsang)", "New Artist of the Year", "Best Solo (Male/Female)", "Best Group (Male/Female)",
            "Best OST", "Best Music Video", "Global Artist", "Netizen Popularity Award", "Hot Trend Award", "Millions Top 10"
        ],
        "Golden Disc Awards (GDA)": [
            "Digital Daesang (Song of the Year)", "Album Daesang (Album of the Year)",
            "Digital Song Bonsang", "Album Bonsang", "Rookie Artist of the Year",
            "Best Solo Artist", "Best Group", "Most Popular Artist", "Cosmopolitan Artist Award"
        ],
        "Korean Music Awards (KMA)": [
            "Musician of the Year", "Song of the Year", "Album of the Year", "Rookie of the Year",
            "Best K-Pop Song", "Best K-Pop Album", "Best Pop Song", "Best Pop Album"
        ],
        "Seoul Music Awards (SMA)": [
            "Grand Award (Daesang)", "Main Award (Bonsang)", "Rookie of the Year",
            "Best Song Award", "Best Album Award", "R&B/Hip-Hop Award", "Ballad Award", "OST Award",
            "Popularity Award", "K-Wave Special Award", "Discovery of the Year"
        ],
        "Circle Chart Music Awards": [
            "Artist of the Year (Global Digital)", "Artist of the Year (Physical Album)", "Artist of the Year (Unique Listeners)",
            "Rookie of the Year", "World K-Pop Star", "Social Hot Star", "Retail Album of the Year", "Music Steady Seller"
        ],
        "The Fact Music Awards (TMA)": [
            "Grand Prize (Daesang)", "Artist of the Year (Bonsang)", "Next Leader Award",
            "Listener's Choice Award", "Worldwide Icon", "Best Performer", "Popularity Award"
        ],
        "Asia Artist Awards (AAA)": [
            "Actor of the Year (Daesang)", "Artist of the Year (Daesang)", "Album of the Year (Daesang)", "Song of the Year (Daesang)",
            "Performance of the Year (Daesang)", "Stage of the Year (Daesang)", "Fandom of the Year (Daesang)",
            "Best Artist", "Best Musician", "Rookie of the Year", "Best Icon", "Best Choice", "Popularity Award", "Asia Celebrity", "Hot Trend"
        ]
    },
    "Acting & Arts Awards": {
        "Baeksang Arts Awards": [
            "Grand Prize (Daesang) - TV", "Best Drama", "Best Director (TV)", "Best Actor (TV)", "Best Actress (TV)",
            "Best Supporting Actor (TV)", "Best Supporting Actress (TV)", "Best New Actor (TV)", "Best New Actress (TV)",
            "Grand Prize (Daesang) - Film", "Best Film", "Best Director (Film)", "Best Actor (Film)", "Best Actress (Film)",
            "Best Supporting Actor (Film)", "Best Supporting Actress (Film)", "Best New Actor (Film)", "Best New Actress (Film)",
            "Most Popular Actor", "Most Popular Actress"
        ],
        "Blue Dragon Series Awards": [
            "Blue Dragon's Choice (Daesang)", "Best Drama", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress",
            "Best Entertainer", "Popular Star Award"
        ],
        "Blue Dragon Film Awards": [
            "Best Film", "Best Director", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress",
            "Popular Star Award"
        ],
        "Grand Bell Awards": [
            "Best Film", "Best Director", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress"
        ]
    }
};

export function GroupModal({ isOpen, onClose, onSave }) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        koreanName: '',
        description: '',
        company: '',
        debutDate: '',
        fanclub: '',
        image: '',
        members: [], // Initialize empty members
        gallery: [],
        awards: []
    });

    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                koreanName: '',
                description: '',
                company: '',
                debutDate: '',
                fanclub: '',
                image: '',
                members: [],
                gallery: [],
                awards: []
            });
            setNewAward({
                year: new Date().getFullYear(),
                category: 'K-Pop & Music Awards',
                show: '',
                award: ''
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Error creating group:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGalleryChange = (index, value) => {
        const newGallery = [...(formData.gallery || [])];
        newGallery[index] = value;
        setFormData({ ...formData, gallery: newGallery });
    };

    const addGalleryImage = () => setFormData({ ...formData, gallery: [...(formData.gallery || []), ''] });
    
    const removeGalleryImage = (index) => {
        const newGallery = (formData.gallery || []).filter((_, i) => i !== index);
        setFormData({ ...formData, gallery: newGallery });
    };

    const handleAddAward = () => {
        if (!newAward.show || !newAward.award) return;
        setFormData({ ...formData, awards: [...(formData.awards || []), { ...newAward }] });
    };

    const handleRemoveAward = (index) => {
        setFormData({ ...formData, awards: (formData.awards || []).filter((_, i) => i !== index) });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className={cn(
                        "absolute inset-0 backdrop-blur-md",
                        theme === 'dark' ? "bg-slate-950/80" : "bg-slate-900/40"
                    )}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={cn(
                        "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
                        theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white border border-slate-200"
                    )}
                >
                    <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                        <h2 className={cn("text-2xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            Add New Group
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                            <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Group Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} theme={theme} icon={Users} placeholder="e.g. BLACKPINK" required />
                            <InputGroup label="Korean Name" value={formData.koreanName} onChange={e => setFormData({...formData, koreanName: e.target.value})} theme={theme} icon={Globe} placeholder="e.g. 블랙핑크" />
                            
                            <div className="md:col-span-2">
                                <InputGroup label="Image URL" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} theme={theme} icon={ImageIcon} placeholder="https://..." />
                            </div>

                            <InputGroup label="Company" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} theme={theme} icon={Building2} placeholder="e.g. YG Entertainment" />
                            <InputGroup label="Debut Date" value={formData.debutDate} onChange={e => setFormData({...formData, debutDate: e.target.value})} theme={theme} icon={Calendar} type="date" />
                            <InputGroup label="Fanclub Name" value={formData.fanclub} onChange={e => setFormData({...formData, fanclub: e.target.value})} theme={theme} icon={Users} placeholder="e.g. BLINK" />
                            
                            <div className="md:col-span-2 space-y-2">
                                <label className={cn("text-[10px] font-black uppercase tracking-widest ml-1", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className={cn(
                                        "w-full rounded-2xl p-4 border-2 focus:outline-none transition-all text-sm font-medium min-h-[100px] resize-none",
                                        theme === 'dark' 
                                            ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" 
                                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                    )}
                                    placeholder="Tell us about the group..."
                                />
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <label className={cn("text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                    <Trophy size={12} /> Awards (Comma separated)
                                </label>
                                
                                <div className={cn("p-4 rounded-2xl border-2 space-y-4", theme === 'dark' ? "bg-slate-800/30 border-white/5" : "bg-slate-50 border-slate-100")}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            value={newAward.category}
                                            onChange={e => setNewAward({ ...newAward, category: e.target.value, show: '', award: '' })}
                                            className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                        >
                                            {Object.keys(AWARD_DATA).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            value={newAward.year}
                                            onChange={e => setNewAward({ ...newAward, year: e.target.value })}
                                            className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                            placeholder="Year"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <select
                                            value={newAward.show}
                                            onChange={e => setNewAward({ ...newAward, show: e.target.value, award: '' })}
                                            className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                        >
                                            <option value="">Select Award Show</option>
                                            {newAward.category && Object.keys(AWARD_DATA[newAward.category]).map(show => <option key={show} value={show}>{show}</option>)}
                                        </select>
                                        <select
                                            value={newAward.award}
                                            onChange={e => setNewAward({ ...newAward, award: e.target.value })}
                                            disabled={!newAward.show}
                                            className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                        >
                                            <option value="">Select Award</option>
                                            {newAward.show && AWARD_DATA[newAward.category][newAward.show].map(award => <option key={award} value={award}>{award}</option>)}
                                        </select>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={handleAddAward}
                                        disabled={!newAward.show || !newAward.award}
                                        className="w-full py-2 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-brand-pink/90 disabled:opacity-50"
                                    >
                                        Add Award
                                    </motion.button>
                                </div>

                                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                    {(formData.awards || []).map((item, idx) => (
                                        <motion.div
                                            layout
                                            key={`${item.year}-${item.show}-${item.award}-${idx}`}
                                            initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className={cn("flex items-center justify-between p-3 rounded-xl border", theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-white border-slate-100")}
                                        >
                                            <div className="text-xs">
                                                <span className="font-black text-brand-pink mr-2">{item.year}</span>
                                                <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-700")}>{item.show}</span>
                                                <div className="text-[10px] text-slate-500 font-medium">{item.award}</div>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveAward(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                        </motion.div>
                                    ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className={cn("text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <ImageIcon size={12} /> Gallery Images
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addGalleryImage}
                                        className="flex items-center gap-1 text-[10px] text-brand-pink font-black uppercase tracking-wider hover:underline"
                                    >
                                        <Plus size={12} /> Add Image
                                    </button>
                                </div>
                                {(formData.gallery || []).map((url, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            value={url}
                                            onChange={(e) => handleGalleryChange(idx, e.target.value)}
                                            className={cn(
                                                "w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-xs font-bold",
                                                theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                            )}
                                            placeholder={`Gallery Image ${idx + 1} URL...`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(idx)}
                                            className={cn("p-3 rounded-2xl transition-colors shrink-0", theme === 'dark' ? "bg-slate-800 text-red-400 hover:bg-red-900/40" : "bg-red-50 text-red-500 hover:bg-red-100")}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className={cn(
                                    "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                    theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20 flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Create Group
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function InputGroup({ label, value, onChange, theme, icon: Icon, type = "text", placeholder, required }) {
    return (
        <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                <Icon size={12} /> {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                className={cn(
                    "w-full rounded-2xl p-4 border-2 focus:outline-none transition-all text-sm font-bold",
                    theme === 'dark' 
                        ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" 
                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                )}
            />
        </div>
    );
}