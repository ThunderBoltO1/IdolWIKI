import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, MapPin, Calendar, Globe, Users, Edit2, Save, Upload, Info, Loader2, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useToast } from './Toast';

import { logAudit } from '../lib/audit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CompanyModal({ isOpen, onClose, initialData, onSave }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        founded: '',
        founders: '',
        headquarters: '',
        website: '',
        image: '',
        parentCompanies: [], // New field for Parent Company
        subsidiaries: [] // New field for Subsidiary Companies
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [allCompanies, setAllCompanies] = useState([]); // List for dropdown
    const [initialSubs, setInitialSubs] = useState([]); // To track initial subsidiaries for diffing

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
                    founders: initialData.founders || '',
                    headquarters: initialData.headquarters || '',
                    website: initialData.website || '',
                    image: initialData.image || '',
                    // Support multiple parent companies, backward compatible with single string
                    parentCompanies: initialData.parentCompanies || (initialData.parentCompany ? [initialData.parentCompany] : []),
                    subsidiaries: []
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
                    founders: '',
                    headquarters: '',
                    website: '',
                    image: '',
                    parentCompanies: initialData?.parentCompany ? [initialData.parentCompany] : [],
                    subsidiaries: []
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

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Create a unique filename
            const timestamp = Date.now();
            const sanitizedName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'company';
            const filename = `${sanitizedName}_${timestamp}.${file.name.split('.').pop()}`;

            // Upload to Firebase Storage
            const storageRef = ref(storage, `companies/${filename}`);
            await uploadBytes(storageRef, file);

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
        }
    };

    const handleAddParent = (e) => {
        const value = e.target.value;
        if (value && !formData.parentCompanies?.includes(value)) {
            setFormData(prev => ({
                ...prev,
                parentCompanies: [...(prev.parentCompanies || []), value]
            }));
        }
    };

    const handleRemoveParent = (companyToRemove) => {
        setFormData(prev => ({
            ...prev,
            parentCompanies: (prev.parentCompanies || []).filter(c => c !== companyToRemove)
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
                parentCompany: formData.parentCompanies?.[0] || null, // Primary parent (legacy support)
                updatedAt: serverTimestamp()
            };

            let companyId;

            if (initialData?.id && !initialData.isNew) {
                // Update
                const ref = doc(db, 'companies', initialData.id);
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
                const q = query(collection(db, 'companies'), where('name', '==', formData.name));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    throw new Error("A company with this name already exists.");
                }

                const docRef = await addDoc(collection(db, 'companies'), {
                    ...companyData,
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
                const newSubs = formData.subsidiaries || [];
                const oldSubs = initialSubs || [];

                const addedSubs = newSubs.filter(s => !oldSubs.includes(s));
                const removedSubs = oldSubs.filter(s => !newSubs.includes(s));

                // Add relations
                for (const subName of addedSubs) {
                    const sub = allCompanies.find(c => c.name === subName);
                    if (sub) {
                        const subRef = doc(db, 'companies', sub.id);
                        await updateDoc(subRef, {
                            parentCompanies: arrayUnion(formData.name)
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
                    if (sub) {
                        const subRef = doc(db, 'companies', sub.id);
                        await updateDoc(subRef, {
                            parentCompanies: arrayRemove(formData.name)
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
                                    <span className="sm:hidden">{initialData?.isNew || !initialData?.id ? 'Create' : 'Edit'}</span>ฟ
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
                                            <img src={convertDriveLink(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="e.g. EDAM Entertainment"
                                            className={cn(
                                                "w-full pl-14 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Founded Date</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="relative">
                                            <select
                                                value={formData.founded ? new Date(formData.founded).getDate() : ''}
                                                onChange={(e) => {
                                                    const d = new Date(formData.founded || Date.now());
                                                    d.setDate(parseInt(e.target.value));
                                                    handleChange({ target: { name: 'founded', value: d.toISOString().split('T')[0] } });
                                                }}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all appearance-none",
                                                    theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                                )}
                                            >
                                                <option value="">Day</option>
                                                {[...Array(31)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={formData.founded ? new Date(formData.founded).getMonth() : ''}
                                                onChange={(e) => {
                                                    const d = new Date(formData.founded || Date.now());
                                                    d.setMonth(parseInt(e.target.value));
                                                    handleChange({ target: { name: 'founded', value: d.toISOString().split('T')[0] } });
                                                }}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all appearance-none",
                                                    theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                                )}
                                            >
                                                <option value="">Month</option>
                                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                    <option key={i} value={i}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={formData.founded ? new Date(formData.founded).getFullYear() : ''}
                                                onChange={(e) => {
                                                    const d = new Date(formData.founded || Date.now());
                                                    d.setFullYear(parseInt(e.target.value));
                                                    handleChange({ target: { name: 'founded', value: d.toISOString().split('T')[0] } });
                                                }}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all appearance-none",
                                                    theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                                )}
                                            >
                                                <option value="">Year</option>
                                                {[...Array(100)].map((_, i) => {
                                                    const y = new Date().getFullYear() - i;
                                                    return <option key={y} value={y}>{y}</option>;
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Headquarters</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            name="headquarters"
                                            value={formData.headquarters}
                                            onChange={handleChange}
                                            placeholder="e.g. Seoul, South Korea"
                                            className={cn(
                                                "w-full pl-14 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Founders/CEO</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            name="founders"
                                            value={formData.founders}
                                            onChange={handleChange}
                                            placeholder="e.g. Bae Jong-han"
                                            className={cn(
                                                "w-full pl-14 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Parent Companies (Optional)</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value=""
                                            onChange={handleAddParent}
                                            className={cn(
                                                "w-full pl-10 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all appearance-none cursor-pointer",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                                            )}
                                        >
                                            <option value="" disabled>Select parent companies...</option>
                                            {allCompanies
                                                .filter(c => c.name !== formData.name && !formData.parentCompanies?.includes(c.name))
                                                .map(company => (
                                                    <option key={company.id} value={company.name}>
                                                        {company.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Selected Parents Tags */}
                                    {formData.parentCompanies?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.parentCompanies.map(parent => (
                                                <div key={parent} className={cn(
                                                    "flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-xs font-bold border",
                                                    theme === 'dark' ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple" : "bg-brand-purple/5 border-brand-purple/20 text-brand-purple"
                                                )}>
                                                    <span>{parent}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveParent(parent)}
                                                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subsidiaries (Child Companies)</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value=""
                                            onChange={handleAddSubsidiary}
                                            className={cn(
                                                "w-full pl-10 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all appearance-none cursor-pointer",
                                                theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
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
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            className={cn(
                                                "w-full pl-14 p-3 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-brand-pink focus:border-transparent outline-none transition-all",
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
                            "sticky bottom-0 z-10 p-4 md:p-6 border-t shrink-0",
                            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                        )}>
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        "w-full sm:w-auto px-6 py-4 sm:py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-colors",
                                        theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto px-6 py-4 sm:py-3 rounded-xl bg-brand-pink text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-brand-pink/20 hover:bg-brand-pink/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {loading ? 'Saving...' : 'Save Company'}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
