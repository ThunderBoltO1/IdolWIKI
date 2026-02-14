import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, Save, Building2, Globe, Calendar, Users, Image as ImageIcon, Loader2, Trophy, Plus, Trash2, Youtube, Search, Upload, Instagram, Crop as CropIcon, GripVertical, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { ImageCropper } from './ImageCropper';
import { createImage, isDataUrl } from '../lib/cropImage';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { convertDriveLink } from '../lib/storage';
import { useAwards } from '../hooks/useAwards.js';
import { uploadImage, deleteImage, validateFile, compressImage, dataURLtoFile } from '../lib/upload';
import { useToast } from './Toast';

const XIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

function DateSelect({ value, onChange, theme, label }) {
    const date = value ? new Date(value) : new Date();
    const [year, setYear] = useState(value ? date.getFullYear() : '');
    const [month, setMonth] = useState(value ? date.getMonth() + 1 : '');
    const [day, setDay] = useState(value ? date.getDate() : '');

    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setYear(d.getFullYear());
            setMonth(d.getMonth() + 1);
            setDay(d.getDate());
        }
    }, [value]);

    const updateDate = (y, m, d) => {
        if (y && m && d) {
            const formattedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            onChange(formattedDate);
        } else {
            onChange('');
        }
    };

    const years = Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        { val: 1, label: 'Jan' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' }, { val: 4, label: 'Apr' },
        { val: 5, label: 'May' }, { val: 6, label: 'Jun' }, { val: 7, label: 'Jul' }, { val: 8, label: 'Aug' },
        { val: 9, label: 'Sep' }, { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dec' }
    ];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    const selectClass = cn(
        "flex-1 rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-sm font-bold appearance-none cursor-pointer",
        theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
    );

    return (
        <div className="space-y-2">
            <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-4s00")}>
                <Calendar size={12} /> {label}
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <select
                        value={day}
                        onChange={(e) => { setDay(e.target.value); updateDate(year, month, e.target.value); }}
                        className={selectClass}
                    >
                        <option value="">Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="relative flex-1">
                    <select
                        value={month}
                        onChange={(e) => { setMonth(e.target.value); updateDate(year, e.target.value, day); }}
                        className={selectClass}
                    >
                        <option value="">Month</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                </div>
                <div className="relative flex-1">
                    <select
                        value={year}
                        onChange={(e) => { setYear(e.target.value); updateDate(e.target.value, month, day); }}
                        className={selectClass}
                    >
                        <option value="">Year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}

export function GroupModal({ isOpen, onClose, onSave, idols = [], onAddIdol }) {
    const { theme } = useTheme();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [cropState, setCropState] = useState({ src: null, callback: null, aspect: 3 / 4.2 });
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);
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
        awards: [],
        albums: [],
        status: 'Active',
        disbandDate: ''
    });
    const { awards: awardData } = useAwards();

    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

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
                awards: [],
                albums: [],
                status: 'Active',
                disbandDate: ''
            });
            setNewAward({
                year: new Date().getFullYear(),
                category: 'K-Pop & Music Awards',
                show: '',
                award: ''
            });
            setMemberSearch('');
            setSelectedMembers([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setMemberSearch('');
            }
        };

        if (memberSearch) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [memberSearch]);

    const startCropping = (url, callback, aspect = 3 / 4.2) => {
        if (!url || isDataUrl(url)) {
            callback(url);
            return;
        }
        setCropState({ src: url, callback, aspect });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Check for duplicate group name
            if (!formData.id) { // Only check for duplicates if creating a new group
                const q = query(collection(db, 'groups'), where('name', '==', formData.name));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    alert('Group name already exists!');
                    setLoading(false);
                    return;
                }
            }

            await onSave({
                ...formData,
                members: selectedMembers.map(m => m.id)
            });
            toast.success(`Group "${formData.name}" created successfully!`);
            onClose();
        } catch (error) {
            console.error("Error creating group:", error);
            toast.error(error.message || "Failed to create group. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (value) => {
        startCropping(value, async (newUrl) => {
            if (newUrl && newUrl.startsWith('data:')) {
                // If it's a base64 string (from cropper), upload it
                setIsUploading(true);
                try {
                    const file = dataURLtoFile(newUrl, `group_cropped_${Date.now()}.jpg`);
                    const compressedFile = await compressImage(file);
                    const uploadedUrl = await uploadImage(compressedFile, 'groups');
                    setFormData(prev => ({ ...prev, image: uploadedUrl }));
                } catch (error) {
                    console.error("Failed to upload cropped image", error);
                } finally {
                    setIsUploading(false);
                }
            } else {
                setFormData(prev => ({ ...prev, image: newUrl || '' }));
            }
        }, 3 / 4.2);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            validateFile(file, 5);
        } catch (error) {
            alert(error.message);
            return;
        }

        // Preview
        const objectUrl = URL.createObjectURL(file);
        handleImageChange(objectUrl); // This sets formData.image and calls startCropping

        setIsUploading(true);
        setUploadProgress(0);
        try {
            const compressedFile = await compressImage(file);
            if (formData.image && formData.image.includes('firebasestorage')) {
                await deleteImage(formData.image);
            }
            const url = await uploadImage(compressedFile, 'groups', (progress) => setUploadProgress(progress));
            handleImageChange(url);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        for (const file of files) {
            try {
                validateFile(file, 5);
            } catch (error) {
                alert(`File ${file.name} is too large. Max 5MB.`);
                return;
            }
        }

        setIsUploading(true);
        try {
            const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
            const uploadPromises = compressedFiles.map(file => uploadImage(file, 'groups/gallery'));
            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), ...urls] }));
        } catch (error) {
            console.error("Gallery upload error", error);
        } finally {
            setIsUploading(false);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
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

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-90 flex items-center justify-center md:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className={cn(
                        "absolute inset-0 backdrop-blur-md touch-none",
                        theme === 'dark' ? "bg-slate-950/80" : "bg-slate-900/40"
                    )}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={cn(
                        // Mobile: Full-screen
                        "fixed inset-0 md:relative md:inset-auto",
                        "w-full md:max-w-2xl",
                        "h-full md:h-auto md:max-h-[85dvh]",
                        "rounded-none md:rounded-[32px]",
                        "shadow-2xl border-0 md:border",
                        "overflow-hidden flex flex-col",
                        theme === 'dark' ? "bg-slate-900 md:border-white/10" : "bg-white md:border-slate-200"
                    )}
                >
                    {/* Sticky Header */}
                    <div className={cn(
                        "sticky top-0 z-10 p-4 md:p-6 border-b shrink-0",
                        theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
                    )}>
                        <div className="flex justify-between items-center">
                            <h2 className={cn("text-lg md:text-xl lg:text-2xl font-black wrap-break-word", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                Add New Group
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
                                aria-label="Close modal"
                            >
                                <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <InputGroup label="Group Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} theme={theme} icon={Users} placeholder="e.g. BLACKPINK" required />
                                <InputGroup label="Korean Name" value={formData.koreanName} onChange={e => setFormData({ ...formData, koreanName: e.target.value })} theme={theme} icon={Globe} placeholder="e.g. 블랙핑크" />

                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                            <ImageIcon size={12} /> Image URL
                                        </label>
                                        <div className="flex gap-3">
                                            {formData.image && (
                                                <button type="button" onClick={() => handleImageChange(formData.image)} className="flex items-center gap-1 text-xs text-brand-purple font-black uppercase tracking-wider hover:underline">
                                                    <CropIcon size={12} /> Re-frame
                                                </button>
                                            )}
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1 text-xs text-brand-pink font-black uppercase tracking-wider hover:underline disabled:opacity-50">
                                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                {isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload File'}
                                            </button>
                                        </div>
                                    </div>
                                    {formData.image && (
                                        <div className="mb-4 flex justify-center">
                                            <div className="relative w-32 aspect-[3/4.2] rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
                                                <img
                                                    src={convertDriveLink(formData.image)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <input value={formData.image || ''} onChange={e => handleImageChange(e.target.value)} className={cn("w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-sm font-bold", theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900")} placeholder="https://..." />
                                </div>

                                <InputGroup label="Company" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} theme={theme} icon={Building2} placeholder="e.g. YG Entertainment" />
                                <DateSelect label="Debut Date" value={formData.debutDate} onChange={val => setFormData({ ...formData, debutDate: val })} theme={theme} />
                                <InputGroup label="Fanclub Name" value={formData.fanclub} onChange={e => setFormData({ ...formData, fanclub: e.target.value })} theme={theme} icon={Users} placeholder="e.g. BLINK" />

                                <div className="space-y-2">
                                    <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <Heart size={12} /> Status
                                    </label>
                                    <select
                                        value={formData.status || 'Active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className={cn(
                                            "w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-sm font-bold appearance-none cursor-pointer",
                                            theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white [&>option]:bg-slate-900" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 [&>option]:bg-white"
                                        )}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                {formData.status === 'Inactive' && (
                                    <DateSelect value={formData.disbandDate} onChange={val => setFormData({ ...formData, disbandDate: val })} theme={theme} label="Disband Date" />
                                )}

                                <div className="md:col-span-2 space-y-2">
                                    <label className={cn("text-xs font-black uppercase tracking-widest ml-1", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Description</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                                    <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <Trophy size={12} /> Awards (Comma separated)
                                    </label>

                                    <div className={cn("p-4 rounded-2xl border-2 space-y-4", theme === 'dark' ? "bg-slate-800/30 border-white/5" : "bg-slate-50 border-slate-100")}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <select
                                                value={newAward.category}
                                                onChange={e => setNewAward({ ...newAward, category: e.target.value, show: '', award: '' })}
                                                className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                            >
                                                {Object.keys(awardData).map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                                                {newAward.category && awardData[newAward.category] && Object.keys(awardData[newAward.category]).map(show => <option key={show} value={show}>{show}</option>)}
                                            </select>
                                            <select
                                                value={newAward.award}
                                                onChange={e => setNewAward({ ...newAward, award: e.target.value })}
                                                disabled={!newAward.show}
                                                className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                            >
                                                <option value="">Select Award</option>
                                                {newAward.show && awardData[newAward.category] && awardData[newAward.category][newAward.show] && awardData[newAward.category][newAward.show].map(award => <option key={award} value={award}>{award}</option>)}
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
                                                        <div className="text-xs text-slate-500 font-medium">{item.award}</div>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveAward(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-3 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                                    <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <Users size={12} /> Add Members
                                    </label>

                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            ref={searchInputRef}
                                            value={memberSearch}
                                            onChange={e => setMemberSearch(e.target.value)}
                                            className={cn(
                                                "w-full rounded-2xl py-3 pl-12 pr-4 border-2 focus:outline-none transition-all text-sm font-bold",
                                                theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                            )}
                                            placeholder="Search idols to add..."
                                        />
                                        {memberSearch && (
                                            <div
                                                ref={dropdownRef}
                                                className={cn(
                                                    "absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto",
                                                    theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                                                )}>
                                                {idols.filter(i =>
                                                    !selectedMembers.find(m => m.id === i.id) &&
                                                    (i.name.toLowerCase().includes(memberSearch.toLowerCase()) || (i.koreanName && i.koreanName.includes(memberSearch)))
                                                ).map(idol => (
                                                    <button
                                                        key={idol.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (idol.groupId) {
                                                                if (!window.confirm(`${idol.name} is already in "${idol.group}". Do you want to move them to this new group?`)) {
                                                                    return;
                                                                }
                                                            }
                                                            setSelectedMembers([...selectedMembers, idol]);
                                                            searchInputRef.current?.focus();
                                                        }}
                                                        className={cn(
                                                            "w-full p-3 flex items-center gap-3 hover:bg-brand-pink/10 transition-colors text-left",
                                                            theme === 'dark' ? "text-white" : "text-slate-900"
                                                        )}
                                                    >
                                                        <img src={convertDriveLink(idol.image)} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                        <div>
                                                            <p className="text-sm font-bold">{idol.name}</p>
                                                            <p className="text-xs text-slate-500">{idol.group || 'Soloist'}</p>
                                                        </div>
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => onAddIdol && onAddIdol({ name: memberSearch })}
                                                    className={cn(
                                                        "w-full p-3 flex items-center gap-3 hover:bg-brand-pink/10 transition-colors text-left border-t",
                                                        theme === 'dark' ? "text-brand-pink border-white/10" : "text-brand-pink border-slate-100"
                                                    )}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-brand-pink/20 flex items-center justify-center shrink-0">
                                                        <Plus size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">Create "{memberSearch}"</p>
                                                        <p className="text-xs opacity-70">Add a new idol to the database</p>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedMembers.length > 0 && (
                                        <Reorder.Group axis="y" values={selectedMembers} onReorder={setSelectedMembers} className="space-y-2">
                                            <AnimatePresence mode="popLayout">
                                                {selectedMembers.map(member => (
                                                    <Reorder.Item
                                                        value={member}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        key={member.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2 rounded-2xl border cursor-grab active:cursor-grabbing",
                                                            theme === 'dark' ? "bg-slate-800/50 border-white/10" : "bg-white border-slate-200"
                                                        )}>
                                                        <GripVertical size={16} className="text-slate-400" />
                                                        <img src={convertDriveLink(member.image)} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className={cn("text-xs font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{member.fullEnglishName || member.name}</span>
                                                            {member.positions && member.positions.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {member.positions.map((pos, i) => (
                                                                        <span key={i} className="text-[8px] font-bold uppercase tracking-wider text-brand-purple bg-brand-purple/10 px-1.5 py-0.5 rounded-md">{pos}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedMembers(selectedMembers.filter(m => m.id !== member.id))}
                                                            className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </Reorder.Item>
                                                ))}
                                            </AnimatePresence>
                                        </Reorder.Group>
                                    )}
                                </div>

                                <div className="md:col-span-2 space-y-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                            <ImageIcon size={12} /> Gallery Images
                                        </label>
                                        <div className="flex gap-3">
                                            <input type="file" multiple ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload} accept="image/*" />
                                            <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1 text-xs text-brand-pink font-black uppercase tracking-wider hover:underline disabled:opacity-50">
                                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                Upload
                                            </button>
                                        </div>
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

                        </div>

                        {/* Sticky Footer */}
                        <div className={cn(
                            "sticky bottom-0 z-10 p-4 md:p-6 border-t shrink-0",
                            theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
                        )}>
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        "w-full sm:w-auto px-6 py-4 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                        theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto px-8 py-4 sm:py-3 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Create Group</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>

            {cropState.src && (
                <ImageCropper
                    imageSrc={cropState.src}
                    aspect={cropState.aspect}
                    onCropComplete={(croppedUrl) => {
                        cropState.callback(croppedUrl);
                        setCropState({ src: null, callback: null, aspect: 3 / 4.2 });
                    }}
                    onCancel={() => {
                        cropState.callback(cropState.src);
                        setCropState({ src: null, callback: null, aspect: 3 / 4.2 });
                    }}
                />
            )}
        </AnimatePresence>,
        document.body
    );
}

function InputGroup({ label, value, onChange, theme, icon: Icon, type = "text", placeholder, required }) {
    return (
        <div className="space-y-2">
            <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                <Icon size={12} /> {label}
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                className={cn("w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-sm font-bold", theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900")}
            />
        </div>
    );
}