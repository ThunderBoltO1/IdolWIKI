import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, MapPin, Calendar, Globe, Users, UserCircle, Edit2, Save, Upload, Info, Loader2, Image as ImageIcon, Facebook, Youtube, Instagram } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage, validateFile } from '../lib/upload';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn, restorePageScroll } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useToast } from './Toast';
import { DateSelect } from './DateSelect';

import { logAudit } from '../lib/audit';

const TiktokIcon = ({ size = 24, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

const XIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);



export function CompanyModal({ isOpen, onClose, initialData, onSave }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        founded: '',
        founders: [],
        ceos: [],
        headquarters: '',
        website: '',
        facebook: '',
        youtube: '',
        tiktok: '',
        image: '',
        parentCompanyIds: [], // Changed to store IDs
        subsidiaryIds: [], // Changed to store IDs
        instagram: '',
        twitter: ''
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [allCompanies, setAllCompanies] = useState([]); // List for dropdown
    const [initialSubs, setInitialSubs] = useState([]); // To track initial subsidiaries for diffing
    const [newFounderInput, setNewFounderInput] = useState('');
    const [newCeoInput, setNewCeoInput] = useState('');

    // Fetch all companies for parent selector
    useEffect(() => {
        if (isOpen) {
            const fetchCompanies = async () => {
                try {
                    const q = query(collection(db, 'companies'));
                    const snap = await getDocs(q);
                    const companies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Exclude current company if editing to prevent self-parenting
                    const filtered = companies.filter(c => c.name !== initialData?.name);
                    setAllCompanies(filtered);
                } catch (err) {
                    console.error("Failed to fetch companies list", err);
                }
            };
            fetchCompanies();
        }
    }, [isOpen, initialData?.name]);

    useEffect(() => {
        if (isOpen) {
            if (initialData && !initialData.isNew) {
                setFormData({
                    name: initialData.name || '',
                    description: initialData.description || '',
                    founded: initialData.founded || '',
                    founders: Array.isArray(initialData.founders) ? initialData.founders : (initialData.founder ? [initialData.founder] : (typeof initialData.founders === 'string' && initialData.founders.trim() ? initialData.founders.split(/,|;|\/|และ|and/i).map(s => s.trim()).filter(Boolean) : [])),
                    ceos: Array.isArray(initialData.ceos) ? initialData.ceos : (initialData.ceo ? [initialData.ceo] : (typeof initialData.ceo === 'string' && initialData.ceo.trim() ? [initialData.ceo.trim()] : [])),
                    headquarters: initialData.headquarters || '',
                    website: initialData.website || '',
                    facebook: initialData.facebook || '',
                    youtube: initialData.youtube || '',
                    tiktok: initialData.tiktok || '',
                    image: initialData.image || '',
                    // This would now be populated with IDs instead of names
                    parentCompanyIds: initialData.parentCompanyIds || [],
                    subsidiaryIds: [], // This would also be populated by IDs
                    instagram: initialData.instagram || '',
                    twitter: initialData.twitter || ''
                });

                // Fetch subsidiaries
                const fetchSubs = async () => {
                    if (!initialData.name) return;
                    try {
                        const q1 = query(collection(db, 'companies'), where('parentCompanies', 'array-contains', initialData.name));
                        const q2 = query(collection(db, 'companies'), where('parentCompany', '==', initialData.name));

                        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                        const subsSet = new Set();
                        snap1.docs.forEach(d => subsSet.add(d.data().name));
                        snap2.docs.forEach(d => subsSet.add(d.data().name));

                        const subs = Array.from(subsSet);
                        setFormData(prev => ({ ...prev, subsidiaries: subs }));
                        setInitialSubs(subs);
                    } catch (err) {
                        console.error("Failed to fetch subsidiaries", err);
                    }
                };
                fetchSubs();

            } else {
                setFormData({
                    name: initialData?.name || '',
                    description: '',
                    founded: '',
                    founders: [],
                    ceos: [],
                    headquarters: '',
                    website: '',
                    image: '',
                    parentCompanies: initialData?.parentCompany ? [initialData.parentCompany] : [],
                    subsidiaries: [],
                    instagram: '',
                    twitter: ''
                });
                setInitialSubs([]);
            }
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        try {
            validateFile(file, 5);
        } catch (e) {
            toast.error(e.message);
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const compressed = await compressImage(file);
            const timestamp = Date.now();
            const sanitizedName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'company';
            const filename = `${sanitizedName}_${timestamp}.webp`;

            // Upload compressed WebP
            const storageRef = ref(storage, `companies/${filename}`);
            await uploadBytes(storageRef, compressed);

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update form data
            setFormData(prev => ({ ...prev, image: downloadURL }));
            toast.success('Image uploaded successfully!');
        } catch (err) {
            console.error('Error uploading image:', err);
            setError('Failed to upload image. Please try again.');
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
            restorePageScroll();
        }
    };

    const handleAddParent = (e) => {
        const value = e.target.value;
        if (value && !formData.parentCompanyIds?.includes(value)) {
            setFormData(prev => ({
                ...prev,
                parentCompanyIds: [...(prev.parentCompanyIds || []), value]
            }));
        }
    };

    const handleRemoveParent = (companyIdToRemove) => {
        setFormData(prev => ({
            ...prev,
            parentCompanyIds: (prev.parentCompanyIds || []).filter(id => id !== companyIdToRemove)
        }));
    };

    const handleAddSubsidiary = (e) => {
        const value = e.target.value;
        if (value && !formData.subsidiaries?.includes(value)) {
            setFormData(prev => ({
                ...prev,
                subsidiaries: [...(prev.subsidiaries || []), value]
            }));
        }
    };

    const handleRemoveSubsidiary = (companyToRemove) => {
        setFormData(prev => ({
            ...prev,
            subsidiaries: (prev.subsidiaries || []).filter(c => c !== companyToRemove)
        }));
    };

    const handleAddFounder = (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        setFormData(prev => ({
            ...prev,
            founders: [...(prev.founders || []), trimmed]
        }));
    };

    const handleRemoveFounder = (index) => {
        setFormData(prev => ({
            ...prev,
            founders: (prev.founders || []).filter((_, i) => i !== index)
        }));
    };

    const handleAddCeo = (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        setFormData(prev => ({
            ...prev,
            ceos: [...(prev.ceos || []), trimmed]
        }));
    };

    const handleRemoveCeo = (index) => {
        setFormData(prev => ({
            ...prev,
            ceos: (prev.ceos || []).filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        setLoading(true);
        setError(null);

        try {
            // Basic Validation
            if (!formData.name.trim()) throw new Error("Company name is required");

            const companyData = {
                ...formData,
                founders: formData.founders || [],
                ceos: formData.ceos || [],
                parentCompanyIds: formData.parentCompanyIds || [], // Save IDs
                updatedAt: serverTimestamp()
            };
            delete companyData.parentCompany; // Remove legacy field if it exists
            delete companyData.founder; // Use founders array only
            delete companyData.ceo;    // Use ceos array only
            let companyId;

            if (initialData?.id && !initialData.isNew) {
                // Update
                const ref = doc(db, 'companies', initialData.id);
                companyData.nameLower = (companyData.name || '').trim().toLowerCase();
                await updateDoc(ref, companyData);
                companyId = initialData.id;

                await logAudit({
                    action: 'update',
                    targetType: 'company',
                    targetId: companyId,
                    user: user,
                    details: companyData
                });
            } else {
                // Create New
                // Check if exists first (only for new, separate logic to avoid name collision)
                const nameLower = formData.name.trim().toLowerCase();
                const qLower = query(collection(db, 'companies'), where('nameLower', '==', nameLower));
                const snapLower = await getDocs(qLower);
                const qExact = query(collection(db, 'companies'), where('name', '==', formData.name));
                const snapExact = await getDocs(qExact);
                if (!snapLower.empty || !snapExact.empty) {
                    throw new Error("A company with this name already exists.");
                }

                const docRef = await addDoc(collection(db, 'companies'), {
                    ...companyData,
                    nameLower,
                    createdAt: serverTimestamp()
                });
                companyId = docRef.id;

                await logAudit({
                    action: 'create',
                    targetType: 'company',
                    targetId: companyId,
                    user: user,
                    details: companyData
                });
            }

            // Handle Subsidiaries Updates
            if (formData.name) {
                const newSubs = formData.subsidiaryIds || [];
                const oldSubs = initialSubs.map(sub => allCompanies.find(c => c.name === sub)?.id).filter(Boolean) || [];

                const addedSubs = newSubs.filter(s => !oldSubs.includes(s));
                const removedSubs = oldSubs.filter(s => !newSubs.includes(s));

                // Add relations
                for (const subName of addedSubs) {
                    const sub = allCompanies.find(c => c.name === subName);
                    if (sub?.id) {
                        const subRef = doc(db, 'companies', sub.id);
                        await updateDoc(subRef, {
                            parentCompanyIds: arrayUnion(company.id)
                        });
                        // Log
                        await logAudit({
                            action: 'link_subsidiary',
                            targetType: 'company',
                            targetId: sub.id,
                            user: user,
                            details: { parent: formData.name, child: subName }
                        });
                    }
                }

                // Remove relations
                for (const subName of removedSubs) {
                    const sub = allCompanies.find(c => c.name === subName);
                    if (sub?.id) {
                        const subRef = doc(db, 'companies', sub.id);
                        await updateDoc(subRef, {
                            parentCompanyIds: arrayRemove(company.id)
                        });
                        // Log
                        await logAudit({
                            action: 'unlink_subsidiary',
                            targetType: 'company',
                            targetId: sub.id,
                            user: user,
                            details: { parent: formData.name, child: subName }
                        });
                    }
                }
            }

            if (onSave) onSave({ id: companyId, ...companyData });
            toast.success(`Company "${formData.name}" ${initialData?.id && !initialData.isNew ? 'updated' : 'created'} successfully!`);
            onClose();
        } catch (err) {
            console.error("Error saving company:", err);
            if (err.code === 'permission-denied') {
                setError("Permission denied. Check your Firestore Security Rules for the 'companies' collection.");
                toast.error("Permission denied. Please contact an administrator.");
            } else {
                setError(err.message);
                toast.error(err.message || "Failed to save company. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-200 flex items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={cn(
                        // Mobile: Full-screen
                        "fixed inset-0 md:relative md:inset-auto",
                        "w-full md:max-w-2xl",
                        "h-full md:h-auto md:max-h-[90vh]",
                        "overflow-y-auto",
                        "rounded-none md:rounded-3xl",
                        "shadow-2xl border-0 md:border",
                        "flex flex-col",
                        theme === 'dark' ? "bg-slate-900 md:border-white/10 text-white" : "bg-white md:border-slate-200 text-slate-900"
                    )}
                >

                    {/* Sticky Header */}
                    <div className={cn(
                        "sticky top-0 z-10 p-4 md:p-6 border-b shrink-0",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Building2 className="text-brand-pink" size={20} />
                                    <span className="hidden sm:inline">{initialData?.isNew || !initialData?.id ? 'Create Company' : 'Edit Company'}</span>
                                    <span className="sm:hidden">{initialData?.isNew || !initialData?.id ? 'Create' : 'Edit'}</span>
                                </h2>
                                <p className="text-xs md:text-sm text-slate-500 font-bold mt-1 hidden sm:block">Manage company details and information.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                                aria-label="Close modal"
                            >
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>


                    {/* Scrollable Content */}
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
                        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                            {error && (
                                <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs md:text-sm font-bold flex items-center gap-2">
                                    <Info size={16} className="shrink-0" />
                                    <span className="flex-1">{error}</span>
                                </div>
                            )}
                            {/* Image Preview & Input */}
                            <div className="flex flex-col items-center gap-3 md:gap-4">
                                <input
                                    type="file"
                                    id="company-image-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="company-image-upload"
                                    className={cn(
                                        "w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-dashed relative flex items-center justify-center cursor-pointer transition-all group",
                                        uploading ? "border-brand-pink bg-brand-pink/5" : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-brand-pink hover:bg-brand-pink/5"
                                    )}
                                >
                                    {uploading ? (
                                        <Loader2 className="text-brand-pink animate-spin" size={24} />
                                    ) : formData.image ? (
                                        <>
                                            <img
                                                src={convertDriveLink(formData.image)}
                                                alt="Company"
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <ImageIcon className="text-white" size={24} />
                                            </div>
                                        </>
                                    ) : (
                                        <Upload className={cn("transition-colors", uploading ? "text-brand-pink" : "text-slate-400 group-hover:text-brand-pink")} size={20} />
                                    )}
                                </label>

                                <div className="w-full flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('company-image-upload').click()}
                                        disabled={uploading}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                            theme === 'dark'
                                                ? "bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 border border-brand-pink/20"
                                                : "bg-brand-pink/5 text-brand-pink hover:bg-brand-pink/10 border border-brand-pink/20"
                                        )}
                                    >
                                        <Upload size={14} />
                                        {uploading ? 'Uploading...' : 'Upload Image'}
                                    </button>
                                </div>

                                <div className={cn("w-full text-center text-xs font-bold uppercase tracking-wider", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                    or paste URL below
                                </div>

                                <input
                                    type="text"
                                    name="image"
                                    placeholder="Image URL (Google Drive or Direct Link)"
                                    value={formData.image}
                                    onChange={handleChange}
                                    className={cn(
                                        "w-full p-3 md:p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                        theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Company Name</label>
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><Building2 size={16} /></div>
                                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Company name"
                                            className={cn("flex-1 min-w-0 py-3 pr-4 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none", theme === 'dark' ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400")}
                                        />
                                    </div>
                                </div>

                                <DateSelect
                                    label="Founded Date"
                                    value={formData.founded}
                                    onChange={val => handleChange({ target: { name: 'founded', value: val } })}
                                    theme={theme}
                                />

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Headquarters</label>
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><MapPin size={16} /></div>
                                        <input name="headquarters" value={formData.headquarters} onChange={handleChange} placeholder="e.g. City, Country"
                                            className={cn("flex-1 min-w-0 py-3 pr-4 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none", theme === 'dark' ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Founder(s) / Co-founder(s)</label>
                                    {(formData.founders || []).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(formData.founders || []).map((name, i) => (
                                                <div key={i} className={cn("flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border", theme === 'dark' ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple" : "bg-brand-purple/5 border-brand-purple/20 text-brand-purple")}>
                                                    <span>{name}</span>
                                                    <button type="button" onClick={() => handleRemoveFounder(i)} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><Users size={16} /></div>
                                        <input
                                            value={newFounderInput}
                                            onChange={e => setNewFounderInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFounder(newFounderInput); setNewFounderInput(''); } }}
                                            placeholder="Founder / Co-founder name"
                                            className={cn("flex-1 min-w-0 py-3 pr-4 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none", theme === 'dark' ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400")}
                                        />
                                        <button type="button" onClick={() => { handleAddFounder(newFounderInput); setNewFounderInput(''); }} className="shrink-0 pr-3 py-2 text-brand-purple font-black text-xs uppercase hover:opacity-80">Add</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">CEO</label>
                                    {(formData.ceos || []).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(formData.ceos || []).map((name, i) => (
                                                <div key={i} className={cn("flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border", theme === 'dark' ? "bg-brand-pink/10 border-brand-pink/20 text-brand-pink" : "bg-brand-pink/5 border-brand-pink/20 text-brand-pink")}>
                                                    <span>{name}</span>
                                                    <button type="button" onClick={() => handleRemoveCeo(i)} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><UserCircle size={16} /></div>
                                        <input
                                            value={newCeoInput}
                                            onChange={e => setNewCeoInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCeo(newCeoInput); setNewCeoInput(''); } }}
                                            placeholder="CEO name"
                                            className={cn("flex-1 min-w-0 py-3 pr-4 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none", theme === 'dark' ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400")}
                                        />
                                        <button type="button" onClick={() => { handleAddCeo(newCeoInput); setNewCeoInput(''); }} className="shrink-0 pr-3 py-2 text-brand-pink font-black text-xs uppercase hover:opacity-80">Add</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Parent Companies (Optional)</label>
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><Building2 size={16} /></div>
                                        <select
                                            value="" // Reset after selection
                                            onChange={handleAddParent}
                                            className={cn(
                                                "flex-1 min-w-0 py-3 pr-4 pl-0 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none appearance-none cursor-pointer",
                                                theme === 'dark' ? "text-white [&>option]:bg-slate-800" : "text-slate-900 [&>option]:bg-slate-50"
                                            )}
                                        >
                                            <option value="" disabled>Select parent companies...</option>
                                            {allCompanies
                                                .filter(c => c.id !== initialData?.id && !formData.parentCompanyIds?.includes(c.id))
                                                .map(company => (
                                                    <option key={company.id} value={company.id}>
                                                        {company.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Selected Parents Tags */}
                                    {formData.parentCompanyIds?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.parentCompanyIds.map(parentId => {
                                                const parentCompany = allCompanies.find(c => c.id === parentId);
                                                if (!parentCompany) return null;
                                                return (<div key={parentId} className={cn(
                                                    "flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-xs font-bold border",
                                                    theme === 'dark' ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple" : "bg-brand-purple/5 border-brand-purple/20 text-brand-purple"
                                                )}>
                                                    <span>{parentCompany.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveParent(parentId)}
                                                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )})}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subsidiaries (Child Companies)</label>
                                    <div className={cn("flex items-center gap-2 rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                        <div className="pl-3 shrink-0 text-slate-400"><Building2 size={16} /></div>
                                        <select
                                            value=""
                                            onChange={handleAddSubsidiary}
                                            className={cn(
                                                "flex-1 min-w-0 py-3 pr-4 pl-0 bg-transparent border-0 text-sm font-bold focus:ring-0 focus:outline-none appearance-none cursor-pointer",
                                                theme === 'dark' ? "text-white [&>option]:bg-slate-800" : "text-slate-900 [&>option]:bg-slate-50"
                                            )}
                                        >
                                            <option value="" disabled>Add subsidiary company...</option>
                                            {allCompanies
                                                .filter(c =>
                                                    c.name !== formData.name &&
                                                    !formData.parentCompanies?.includes(c.name) &&
                                                    !formData.subsidiaries?.includes(c.name)
                                                )
                                                .map(company => (
                                                    <option key={company.id} value={company.name}>
                                                        {company.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Selected Subsidiaries Tags */}
                                    {formData.subsidiaries?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.subsidiaries.map(sub => (
                                                <div key={sub} className={cn(
                                                    "flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-xs font-bold border",
                                                    theme === 'dark' ? "bg-brand-pink/10 border-brand-pink/20 text-brand-pink" : "bg-brand-pink/5 border-brand-pink/20 text-brand-pink"
                                                )}>
                                                    <span>{sub}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSubsidiary(sub)}
                                                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Facebook</label>
                                    <div className="relative">
                                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="facebook"
                                            value={formData.facebook}
                                            onChange={handleChange}
                                            placeholder="https://facebook.com/..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Instagram</label>
                                    <div className="relative">
                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="instagram"
                                            value={formData.instagram}
                                            onChange={handleChange}
                                            placeholder="https://instagram.com/..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">X (Twitter)</label>
                                    <div className="relative">
                                        <XIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="twitter"
                                            value={formData.twitter}
                                            onChange={handleChange}
                                            placeholder="https://x.com/..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">YouTube</label>
                                    <div className="relative">
                                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="youtube"
                                            value={formData.youtube}
                                            onChange={handleChange}
                                            placeholder="https://youtube.com/..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">TikTok</label>
                                    <div className="relative">
                                        <TiktokIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none" size={16} />
                                        <input
                                            name="tiktok"
                                            value={formData.tiktok}
                                            onChange={handleChange}
                                            placeholder="https://tiktok.com/@..."
                                            className={cn(
                                                "w-full pl-14 pr-4 py-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Company history and description..."
                                        rows={5}
                                        className={cn(
                                            "w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                            theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className={cn(
                            "sticky bottom-0 z-30 pt-6 pb-6 mt-8 p-6 md:px-10 border-t backdrop-blur-xl transition-all duration-300",
                            theme === 'dark' 
                                ? "border-white/5 bg-slate-900/90 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]" 
                                : "border-slate-100 bg-white/90 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)]"
                        )}>
                            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        "w-full sm:w-auto px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2",
                                        theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    <X size={16} />
                                    Discard Changes
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-purple text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-pink/20 hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {loading ? 'Processing...' : 'Save Company Details'}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div >
            </div >
        </AnimatePresence >
    );
}
