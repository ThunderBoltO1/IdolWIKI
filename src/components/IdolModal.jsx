import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Edit2, Trash2, Save, Calendar, User, Ruler, Activity, Building2, Globe, Instagram, Check, Star, Volume2, Loader2, Rocket, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
export function IdolModal({ isOpen, mode, idol, onClose, onSave, onDelete, onLike, onGroupClick }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const [formData, setFormData] = useState(idol || {});
    const [editMode, setEditMode] = useState(mode === 'create');
    const [activeImage, setActiveImage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(idol || {
                name: '',
                koreanName: '',
                fullEnglishName: '',
                group: '',
                groupId: '',
                positions: [],
                company: '',
                nationality: '',
                debutDate: '',
                birthDate: '',
                height: '',
                bloodType: '',
                gender: 'F',
                image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
                gallery: [],
                instagram: '',
                likes: 0
            });
            setEditMode(mode === 'create' || mode === 'edit');
            setActiveImage(idol?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60');
        }
    }, [isOpen, mode, idol]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const processedValue = name === 'image' ? convertDriveLink(value) : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
        if (name === 'image') setActiveImage(processedValue);
    };

    const handlePositionsChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, positions: val.split(',').map(s => s.trim()) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        if (mode === 'create') onClose();
        else setEditMode(false);
    };

    const handleSpeak = (text) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    if (!isOpen) return null;

    const allImages = [formData.image, ...(formData.gallery || [])].filter(Boolean);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
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
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className={cn(
                        "relative w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row border transition-colors duration-500",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className={cn(
                            "absolute top-6 right-6 z-20 p-2.5 rounded-full transition-all duration-300 active:scale-90 shadow-lg",
                            theme === 'dark' ? "bg-black/40 hover:bg-black/60 text-white" : "bg-white/80 hover:bg-white text-slate-800"
                        )}
                    >
                        <X size={20} />
                    </button>

                    {/* Left Column: Image & Gallery */}
                    <div className={cn(
                        "w-full md:w-5/12 h-[350px] md:h-auto relative flex flex-col overflow-hidden",
                        theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                    )}>
                        <div className="relative flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeImage}
                                    initial={{ opacity: 0, scale: 1.15 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={activeImage || null}
                                    alt={formData.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => e.target.src = 'https://via.placeholder.com/500x800?text=No+Image'}
                                />
                            </AnimatePresence>
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-80",
                                theme === 'dark' ? "from-slate-900" : "from-black/60"
                            )} />

                            {!editMode && (
                                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10">
                                    <button
                                        onClick={() => user ? onLike(idol.id) : alert('Please login to like idols!')}
                                        className={cn(
                                            "p-4 rounded-3xl backdrop-blur-xl transition-all duration-500 group shadow-2xl border",
                                            user ? "hover:scale-110 active:scale-90" : "opacity-50 cursor-not-allowed",
                                            formData.isFavorite
                                                ? "bg-brand-pink text-white border-brand-pink/50"
                                                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                        )}
                                    >
                                        <Heart className={cn("w-7 h-7 transition-all", formData.isFavorite ? "fill-white scale-110" : "group-hover:text-brand-pink")} />
                                    </button>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/60 uppercase font-black tracking-widest mb-1">Fan Love</p>
                                        <p className="text-2xl font-black text-white drop-shadow-lg">{(formData.likes || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {!editMode && allImages.length > 1 && (
                            <div className={cn(
                                "p-5 flex gap-3 overflow-x-auto custom-scrollbar transition-colors duration-500",
                                theme === 'dark' ? "bg-slate-950/60 backdrop-blur-xl border-t border-white/5" : "bg-white/40 backdrop-blur-md border-t border-slate-200"
                            )}>
                                {allImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={cn(
                                            "w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all duration-500 shadow-md",
                                            activeImage === img
                                                ? "border-brand-pink scale-90 rotate-2 shadow-brand-pink/30"
                                                : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                        )}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Details or Form */}
                    <div className="w-full md:w-7/12 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex-1 mr-4">
                                {editMode ? (
                                    <div className="space-y-4">
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={cn(
                                                "bg-transparent text-5xl font-black border-b-2 focus:outline-none w-full transition-colors",
                                                theme === 'dark' ? "text-white border-white/10 focus:border-brand-pink" : "text-slate-900 border-slate-200 focus:border-brand-pink"
                                            )}
                                            placeholder="Stage Name"
                                        />
                                        <div className="space-y-3">
                                            <input
                                                name="group"
                                                value={formData.group}
                                                onChange={handleChange}
                                                className={cn(
                                                    "bg-transparent text-lg font-black tracking-widest uppercase border-b w-full focus:outline-none",
                                                    theme === 'dark' ? "text-brand-pink border-white/5" : "text-brand-pink border-slate-100"
                                                )}
                                                placeholder="Group Name"
                                            />
                                            <input
                                                name="groupId"
                                                value={formData.groupId}
                                                onChange={handleChange}
                                                className={cn(
                                                    "bg-transparent text-xs font-mono border-b w-full focus:outline-none",
                                                    theme === 'dark' ? "text-slate-600 border-white/5" : "text-slate-400 border-slate-100"
                                                )}
                                                placeholder="group-id-slug"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h2 className={cn(
                                                "text-5xl font-black tracking-tight drop-shadow-sm",
                                                theme === 'dark' ? "text-white" : "text-slate-900"
                                            )}>
                                                {formData.name}
                                            </h2>
                                            {formData.isFavorite && <Star className="text-yellow-400 fill-yellow-400" size={24} />}
                                        </div>
                                        <button
                                            onClick={() => formData.groupId && onGroupClick(formData.groupId)}
                                            className={cn(
                                                "text-xl font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 group",
                                                formData.groupId ? "text-brand-pink hover:text-brand-pink/80 cursor-pointer" : "text-slate-400"
                                            )}
                                        >
                                            <Building2 size={18} className="transition-transform group-hover:-translate-y-0.5" />
                                            {formData.group || 'Soloist'}
                                            {formData.groupId && <Activity size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!editMode && isAdmin && (
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-90",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => { onDelete(idol.id); onClose(); }}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-90",
                                            theme === 'dark' ? "bg-slate-800 text-red-400 hover:bg-red-900/40" : "bg-red-50 text-red-500 hover:bg-red-100"
                                        )}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10 flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <DetailItem icon={User} label="Full Name" value={formData.fullEnglishName} editMode={editMode} name="fullEnglishName" onChange={handleChange} theme={theme} />
                                <DetailItem
                                    icon={Globe}
                                    label="Korean Name"
                                    value={formData.koreanName}
                                    editMode={editMode}
                                    name="koreanName"
                                    onChange={handleChange}
                                    theme={theme}
                                    onAction={() => handleSpeak(formData.koreanName)}
                                />
                                <DetailItem icon={Building2} label="Company" value={formData.company} editMode={editMode} name="company" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Globe} label="Nationality" value={formData.nationality} editMode={editMode} name="nationality" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Calendar} label="Birth Date" value={formData.birthDate} editMode={editMode} name="birthDate" type="date" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Activity} label="Debut Date" value={formData.debutDate} editMode={editMode} name="debutDate" type="date" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Ruler} label="Height" value={formData.height} editMode={editMode} name="height" onChange={handleChange} theme={theme} />

                                <div className="sm:col-span-2 space-y-3">
                                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block">Positions</label>
                                    {editMode ? (
                                        <input
                                            value={formData.positions?.join(', ')}
                                            onChange={handlePositionsChange}
                                            className={cn(
                                                "w-full rounded-2xl p-4 transition-all duration-300 focus:outline-none border-2",
                                                theme === 'dark'
                                                    ? "bg-slate-800/50 text-white border-white/5 focus:border-brand-pink"
                                                    : "bg-slate-50 text-slate-900 border-slate-100 focus:border-brand-pink"
                                            )}
                                            placeholder="Lead Vocalist, Main Dancer..."
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.positions?.map((p, i) => (
                                                <span key={i} className={cn(
                                                    "px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all hover:scale-105 shadow-sm",
                                                    theme === 'dark'
                                                        ? "bg-slate-800 border-white/5 text-slate-300"
                                                        : "bg-white border-slate-200 text-slate-600"
                                                )}>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {editMode && (
                                    <>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                                    <Instagram size={12} />
                                                    Photo URL
                                                </label>
                                            </div>

                                            <div className="relative group/input">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-pink transition-colors">
                                                    <Globe size={18} />
                                                </div>
                                                <input
                                                    name="image"
                                                    value={formData.image}
                                                    onChange={handleChange}
                                                    className={cn(
                                                        "w-full rounded-2xl py-4 pl-12 pr-6 border-2 focus:outline-none transition-all text-sm font-bold",
                                                        theme === 'dark'
                                                            ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white"
                                                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                                                    )}
                                                    placeholder="Paste image URL..."
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-medium pl-1">
                                                💡 Tip: คุณสามารถใช้ลิงก์จากเว็บฝากรูป เช่น <a href="https://postimages.org/" target="_blank" className="text-brand-pink hover:underline">postimages.org</a> ได้ครับ
                                            </p>
                                        </div>
                                        <DetailItem icon={Instagram} label="Instagram URL" value={formData.instagram} editMode={editMode} name="instagram" onChange={handleChange} theme={theme} />
                                    </>
                                )}
                            </div>

                            {!editMode && formData.instagram && (
                                <a
                                    href={formData.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-tr from-brand-pink/10 to-brand-purple/10 border border-brand-pink/20 text-brand-pink font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                                >
                                    <Instagram size={20} /> Official Instagram
                                </a>
                            )}

                            {editMode && (
                                <div className={cn(
                                    "pt-8 flex justify-end gap-4 border-t",
                                    theme === 'dark' ? "border-white/5" : "border-slate-100"
                                )}>
                                    <button
                                        type="button"
                                        onClick={() => mode === 'create' ? onClose() : setEditMode(false)}
                                        className={cn(
                                            "px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-sm",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-3 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-purple text-white font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all flex items-center gap-3 shadow-xl shadow-brand-pink/20 active:scale-95"
                                    >
                                        <Save size={20} /> Save Changes
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function DetailItem({ icon: Icon, label, value, editMode, onChange, name, type = "text", theme, onAction }) {
    if (editMode) {
        return (
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                    <Icon size={12} />
                    {label}
                </label>
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={cn(
                        "w-full rounded-2xl p-4 transition-all duration-300 focus:outline-none border-2 text-sm font-bold",
                        theme === 'dark'
                            ? "bg-slate-800/50 text-white border-white/5 focus:border-brand-pink"
                            : "bg-slate-50 text-slate-900 border-slate-100 focus:border-brand-pink"
                    )}
                />
            </div>
        );
    }

    return (
        <div className="group/detail">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2 mb-1.5 opacity-80">
                <Icon size={12} className="group-hover/detail:text-brand-pink transition-colors" />
                {label}
            </p>
            <div className="flex items-center gap-3">
                <p className={cn(
                    "font-black text-lg transition-colors group-hover/detail:text-brand-pink",
                    theme === 'dark' ? "text-slate-100" : "text-slate-900"
                )}>
                    {value || '-'}
                </p>
                {onAction && value && (
                    <button
                        onClick={onAction}
                        className={cn(
                            "p-1.5 rounded-lg transition-all active:scale-90",
                            theme === 'dark' ? "text-slate-400 hover:text-brand-pink hover:bg-white/5" : "text-slate-400 hover:text-brand-pink hover:bg-slate-100"
                        )}
                        title="Listen Pronunciation"
                    >
                        <Volume2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
