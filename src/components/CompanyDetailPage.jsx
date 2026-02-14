import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Edit2, Globe, Calendar, Users, MapPin, Building2, Share2, Check, Maximize2, Music, User, Search, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { logAudit } from '../lib/audit';
import { CompanyModal } from './CompanyModal';
import { BackgroundShapes } from './BackgroundShapes';
import { ConfirmationModal } from './ConfirmationModal';

export function CompanyDetailPage() {
    const { companyName } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { theme } = useTheme();

    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subsidiaries, setSubsidiaries] = useState([]);
    const [editingCompany, setEditingCompany] = useState(null);
    const [affiliatedArtists, setAffiliatedArtists] = useState({ groups: [], idols: [] });
    const [modalOpen, setModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Link Existing Subsidiary States
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [allCompanies, setAllCompanies] = useState([]);
    const [selectedCompanyToLink, setSelectedCompanyToLink] = useState('');

    // Filter states
    const [groupSearchText, setGroupSearchText] = useState('');
    const [groupYearFilter, setGroupYearFilter] = useState('');
    const [idolSearchText, setIdolSearchText] = useState('');

    const fetchAllCompanies = async () => {
        if (allCompanies.length > 0) return;
        try {
            const snap = await getDocs(collection(db, 'companies'));
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter out current company and already linked companies
            // Note: Current logic filters only exact match, more strict filtering happens in render
            setAllCompanies(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error fetching all companies:", error);
        }
    };

    useEffect(() => {
        const fetchCompany = async () => {
            setLoading(true);
            try {
                const name = decodeURIComponent(companyName);
                const q = query(collection(db, 'companies'), where('name', '==', name));
                const snap = await getDocs(q);

                if (snap.empty) {
                    setError('Company not found');
                    if (isAdmin) {
                        setCompany({ name: name, isNew: true });
                    }
                } else {
                    const data = snap.docs[0].data();
                    setCompany({ id: snap.docs[0].id, ...data });

                    // Fetch Groups
                    const qGroups = query(collection(db, 'groups'), where('company', '==', name));
                    const groupSnap = await getDocs(qGroups);
                    const groups = groupSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Fetch Idols
                    const qIdols = query(collection(db, 'idols'), where('company', '==', name));
                    const idolSnap = await getDocs(qIdols);
                    const idols = idolSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Fetch Subsidiaries (Sub-companies)
                    // Support both legacy single parent and multiple parent arrays
                    const qSubsLegacy = query(collection(db, 'companies'), where('parentCompany', '==', name));
                    const qSubsNew = query(collection(db, 'companies'), where('parentCompanies', 'array-contains', name));

                    const [subSnapLegacy, subSnapNew] = await Promise.all([getDocs(qSubsLegacy), getDocs(qSubsNew)]);

                    const subsMap = new Map();
                    subSnapLegacy.docs.forEach(d => subsMap.set(d.id, { id: d.id, ...d.data() }));
                    subSnapNew.docs.forEach(d => subsMap.set(d.id, { id: d.id, ...d.data() }));

                    const subs = Array.from(subsMap.values());

                    setAffiliatedArtists({ groups, idols });
                    setSubsidiaries(subs);
                }
            } catch (err) {
                console.error("Error fetching company:", err);
                setError('Failed to load company details');
            } finally {
                setLoading(false);
            }
        };

        if (companyName) fetchCompany();
    }, [companyName, isAdmin]);

    const handleSave = async () => {
        window.location.reload();
    };

    const handleLinkSubsidiary = async () => {
        if (!selectedCompanyToLink) return;

        try {
            const companyToLink = allCompanies.find(c => c.id === selectedCompanyToLink);
            if (!companyToLink) return;

            // Check if already linked
            if (companyToLink.parentCompanies?.includes(company.name) || companyToLink.parentCompany === company.name) {
                alert('This company is already a subsidiary.');
                return;
            }

            const docRef = doc(db, 'companies', selectedCompanyToLink);

            // Build new parentCompanies array
            const existingParents = companyToLink.parentCompanies || (companyToLink.parentCompany ? [companyToLink.parentCompany] : []);

            await updateDoc(docRef, {
                parentCompanies: [...existingParents, company.name],
                // Update legacy field
                parentCompany: companyToLink.parentCompany || company.name
            });

            await logAudit({
                action: 'link_subsidiary',
                targetType: 'company',
                targetId: companyToLink.id,
                user: user,
                details: {
                    company: companyToLink.name,
                    child: company.name
                }
            });

            window.location.reload();
        } catch (error) {
            console.error("Error linking subsidiary:", error);
            alert('Failed to link company.');
        }
    };

    const handleDeleteCompany = async () => {
        if (!isAdmin || !company?.id) return;

        setDeleteConfirmModal({
            isOpen: true,
            title: 'Delete Company',
            message: `Are you sure you want to delete ${company.name}? This action cannot be undone and will remove all associated data.`,
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'companies', company.id));
                    await logAudit({
                        action: 'delete',
                        targetType: 'company',
                        targetId: company.id,
                        user: user,
                        details: { name: company.name }
                    });
                    navigate('/admin/companies');
                } catch (err) {
                    console.error('Error deleting company:', err);
                    setDeleteConfirmModal({
                        isOpen: true,
                        title: 'Delete Failed',
                        message: 'Failed to delete company. Please try again.',
                        type: 'danger',
                        singleButton: true,
                        confirmText: 'Close',
                        onConfirm: () => { }
                    });
                }
            }
        });
    };

    // Filter and sort groups
    const filteredGroups = React.useMemo(() => {
        let filtered = [...affiliatedArtists.groups];

        // Apply search filter
        if (groupSearchText) {
            filtered = filtered.filter(group =>
                group.name.toLowerCase().includes(groupSearchText.toLowerCase())
            );
        }

        // Apply year filter
        if (groupYearFilter) {
            filtered = filtered.filter(group => {
                if (!group.debutDate) return false;
                const year = new Date(group.debutDate).getFullYear().toString();
                return year === groupYearFilter;
            });
        }

        // Sort alphabetically by name
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));

        return filtered;
    }, [affiliatedArtists.groups, groupSearchText, groupYearFilter]);

    // Filter and sort idols
    const filteredIdols = React.useMemo(() => {
        let filtered = [...affiliatedArtists.idols];

        // Apply search filter
        if (idolSearchText) {
            filtered = filtered.filter(idol =>
                idol.name.toLowerCase().includes(idolSearchText.toLowerCase())
            );
        }

        // Sort alphabetically by name
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));

        return filtered;
    }, [affiliatedArtists.idols, idolSearchText]);

    // Get unique debut years from groups for filter dropdown
    const debutYears = React.useMemo(() => {
        const years = affiliatedArtists.groups
            .map(group => group.debutDate ? new Date(group.debutDate).getFullYear() : null)
            .filter(year => year !== null);
        return [...new Set(years)].sort((a, b) => b - a);
    }, [affiliatedArtists.groups]);

    if (loading) {
        return (
            <div className={cn('min-h-[60vh] flex items-center justify-center', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                <div className={cn('px-6 py-4 rounded-2xl border', theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white')}>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Loading</span>
                </div>
            </div>
        );
    }

    if (error || company?.isNew) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors mb-8',
                        theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                    )}
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <div className={cn(
                    'rounded-[40px] p-10 border flex flex-col items-center gap-6',
                    theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                )}>
                    <Building2 size={64} className="opacity-20" />
                    <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                        Company Not Found
                    </p>
                    {isAdmin && (
                        <button
                            onClick={() => { setCompany({ name: decodeURIComponent(companyName), isNew: true }); setModalOpen(true); }}
                            className="px-6 py-3 bg-brand-pink text-white rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            Create Page for {decodeURIComponent(companyName)}
                        </button>
                    )}
                </div>
                <CompanyModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    initialData={{ name: decodeURIComponent(companyName), isNew: true }}
                    onSave={handleSave}
                />
            </div>
        );
    }

    // if (company?.isNew) return null; // Removed to show Not Found view

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 md:space-y-10">
            <BackgroundShapes image={company.image} />

            {/* Navigation & Controls */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className={cn(
                            'p-3 rounded-2xl transition-all active:scale-95 shadow-sm border',
                            theme === 'dark'
                                ? 'bg-slate-800 border-white/5 hover:bg-slate-700 text-white'
                                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-900'
                        )}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className={cn(
                            'p-3 rounded-2xl transition-all active:scale-95 shadow-sm border',
                            theme === 'dark'
                                ? 'bg-slate-800 border-white/5 hover:bg-slate-700 text-white'
                                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-900'
                        )}
                        title="Copy Link"
                    >
                        {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                    </button>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setEditingCompany(company);
                                setModalOpen(true);
                            }}
                            className={cn(
                                'inline-flex items-center gap-2 px-3 py-2 md:px-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-colors',
                                'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90'
                            )}
                        >
                            <Edit2 size={14} /> Edit Company
                        </button>
                        <button
                            onClick={handleDeleteCompany}
                            className={cn(
                                'inline-flex items-center gap-2 px-3 py-2 md:px-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-colors',
                                'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20',
                                theme === 'dark' ? 'hover:border-red-500/30' : 'hover:border-red-500/30'
                            )}
                            title="Delete Company"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content Card */}
            <div className="space-y-6">
                {/* Header Section with Detailed Info */}
                <div className={cn(
                    'rounded-[40px] border p-8 md:p-10',
                    theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
                )}>
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                        {/* Company Logo/Image - Smaller Size */}
                        <div
                            className="shrink-0 relative group cursor-zoom-in"
                            onClick={() => setLightboxImage(company.image)}
                        >
                            <div className={cn(
                                "w-full md:w-48 lg:w-56 aspect-square rounded-3xl overflow-hidden border transition-all duration-300 group-hover:shadow-2xl",
                                theme === 'dark' ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'
                            )}>
                                {company.image ? (
                                    <img
                                        src={convertDriveLink(company.image)}
                                        alt={company.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Building2 size={64} className={cn(theme === 'dark' ? 'text-slate-600' : 'text-slate-300')} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="p-3 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                                        <Maximize2 size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Info */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <p className={cn('text-xs font-black uppercase tracking-[0.25em] mb-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                                    Company / Agency
                                </p>
                                <h1 className={cn('text-4xl md:text-5xl lg:text-6xl font-black tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    {company.name}
                                </h1>
                            </div>

                            {/* Quick Info Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                {company.founded && (
                                    <div className={cn(
                                        'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border',
                                        theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                                    )}>
                                        <Calendar size={14} className="text-brand-purple" />
                                        <span>Est. {new Date(company.founded).getFullYear()}</span>
                                    </div>
                                )}
                                {company.headquarters && (
                                    <div className={cn(
                                        'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border',
                                        theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                                    )}>
                                        <MapPin size={14} className="text-brand-pink" />
                                        <span>{company.headquarters}</span>
                                    </div>
                                )}
                                {company.website && (
                                    <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border hover:scale-105 transition-transform',
                                            theme === 'dark' ? 'border-white/10 text-sky-400 bg-slate-950/40 hover:bg-slate-950/60' : 'border-slate-200 text-sky-600 bg-slate-50 hover:bg-slate-100'
                                        )}
                                    >
                                        <Globe size={14} />
                                        Website
                                    </a>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className={cn('h-px my-8', theme === 'dark' ? 'bg-white/5' : 'bg-slate-200')} />

                    {/* Detailed Information Section */}
                    <div>
                        <h3 className={cn(
                            'text-xs font-black uppercase tracking-[0.25em] mb-6',
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        )}>
                            Detailed Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className={cn(
                                'p-5 rounded-2xl border',
                                theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                            )}>
                                <span className={cn('text-xs font-black uppercase tracking-widest block mb-2', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                    Founded Date
                                </span>
                                <div className={cn('text-base font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    {company.founded ? new Date(company.founded).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </div>
                            </div>

                            <div className={cn(
                                'p-5 rounded-2xl border',
                                theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                            )}>
                                <span className={cn('text-xs font-black uppercase tracking-widest block mb-2', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                    Founders / CEO
                                </span>
                                <div className={cn('text-base font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    {company.founders || '-'}
                                </div>
                            </div>

                            <div className={cn(
                                'p-5 rounded-2xl border',
                                theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                            )}>
                                <span className={cn('text-xs font-black uppercase tracking-widest block mb-2', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                    Headquarters
                                </span>
                                <div className={cn('text-base font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    {company.headquarters || '-'}
                                </div>
                            </div>

                            {company.description && (
                                <div className={cn(
                                    'p-6 md:p-8 rounded-2xl border md:col-span-2 lg:col-span-3',
                                    theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                                )}>
                                    <span className={cn('text-xs font-black uppercase tracking-widest block mb-4', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                        About
                                    </span>
                                    <div className={cn(
                                        'text-base md:text-lg leading-[1.8] whitespace-pre-line text-justify',
                                        theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                                    )}>
                                        {company.description}
                                    </div>
                                </div>
                            )}

                            {/* Subsidiaries Section */}
                            {subsidiaries.length > 0 && (
                                <div className={cn(
                                    'p-6 md:p-8 rounded-2xl border md:col-span-2 lg:col-span-3',
                                    theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                                )}>
                                    <div className="flex justify-between items-center mb-6">
                                        <span className={cn('text-xs font-black uppercase tracking-widest block', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                            Subsidiary Labels
                                        </span>

                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {subsidiaries.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => navigate(`/company/${encodeURIComponent(sub.name)}`)}
                                                className={cn(
                                                    'p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 group',
                                                    theme === 'dark'
                                                        ? 'bg-slate-900 border-white/5 hover:border-brand-pink/50 hover:shadow-lg hover:shadow-brand-pink/10'
                                                        : 'bg-white border-slate-200 hover:border-brand-pink/50 hover:shadow-lg hover:shadow-brand-pink/10'
                                                )}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={cn(
                                                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                                                    )}>
                                                        {sub.image ? (
                                                            <img src={convertDriveLink(sub.image)} alt={sub.name} className="w-full h-full object-cover rounded-lg" />
                                                        ) : (
                                                            <Building2 size={14} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
                                                        )}
                                                    </div>
                                                    <h4 className={cn('font-bold truncate text-sm', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                                        {sub.name}
                                                    </h4>
                                                </div>
                                                {sub.founded && (
                                                    <p className={cn('text-[10px] uppercase font-bold tracking-wider pl-11', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                                        Est. {new Date(sub.founded).getFullYear()}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Affiliated Artists Section */}
            <div className="space-y-8">
                {/* Groups */}
                {affiliatedArtists.groups.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <h2 className={cn("text-2xl font-black tracking-tight flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                <Users size={24} className="text-brand-pink" />
                                Affiliated Groups
                                <span className={cn("text-sm font-medium px-3 py-1 rounded-full", theme === 'dark' ? "bg-brand-pink/20 text-brand-pink" : "bg-brand-pink/10 text-brand-pink")}>
                                    {filteredGroups.length}
                                </span>
                            </h2>
                        </div>

                        {/* Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search group name..."
                                    value={groupSearchText}
                                    onChange={(e) => setGroupSearchText(e.target.value)}
                                    className={cn(
                                        "w-full px-4 py-3 rounded-2xl text-sm font-medium border transition-colors outline-none",
                                        theme === 'dark'
                                            ? "bg-slate-900/40 border-white/10 text-white placeholder:text-slate-500 focus:border-brand-pink/50"
                                            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand-pink/50"
                                    )}
                                />
                            </div>
                            <select
                                value={groupYearFilter}
                                onChange={(e) => setGroupYearFilter(e.target.value)}
                                className={cn(
                                    "px-4 py-3 rounded-2xl text-sm font-medium border transition-colors outline-none cursor-pointer min-w-[160px]",
                                    theme === 'dark'
                                        ? "bg-slate-900/40 border-white/10 text-white focus:border-brand-pink/50"
                                        : "bg-white border-slate-200 text-slate-900 focus:border-brand-pink/50"
                                )}
                            >
                                <option value="">All Debut Years</option>
                                {debutYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            {(groupSearchText || groupYearFilter) && (
                                <button
                                    onClick={() => {
                                        setGroupSearchText('');
                                        setGroupYearFilter('');
                                    }}
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors whitespace-nowrap",
                                        theme === 'dark'
                                            ? "border-white/10 text-white hover:bg-white/5"
                                            : "border-slate-200 text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>

                        {filteredGroups.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredGroups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => navigate(`/group/${group.id}`)}
                                        className={cn(
                                            "group relative aspect-square rounded-3xl overflow-hidden cursor-pointer border transition-transform hover:-translate-y-1 hover:shadow-xl",
                                            theme === 'dark' ? "border-white/10" : "border-slate-200"
                                        )}
                                    >
                                        <img
                                            src={convertDriveLink(group.image)}
                                            alt={group.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                            <h3 className="text-white font-black text-lg leading-tight">{group.name}</h3>
                                            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">{group.members?.length || 0} Members</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={cn(
                                "p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center",
                                theme === 'dark' ? "border-white/10 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                            )}>
                                <Music size={32} className={cn("mb-2 opacity-50", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                                <p className={cn("font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>No groups match the criteria</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Idols/Soloists */}
                {affiliatedArtists.idols.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <h2 className={cn("text-2xl font-black tracking-tight flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                <User size={24} className="text-brand-purple" />
                                Affiliated Idols
                                <span className={cn("text-sm font-medium px-3 py-1 rounded-full", theme === 'dark' ? "bg-brand-purple/20 text-brand-purple" : "bg-brand-purple/10 text-brand-purple")}>
                                    {filteredIdols.length}
                                </span>
                            </h2>
                        </div>

                        {/* Search Control */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search idol name..."
                                    value={idolSearchText}
                                    onChange={(e) => setIdolSearchText(e.target.value)}
                                    className={cn(
                                        "w-full px-4 py-3 rounded-2xl text-sm font-medium border transition-colors outline-none",
                                        theme === 'dark'
                                            ? "bg-slate-900/40 border-white/10 text-white placeholder:text-slate-500 focus:border-brand-purple/50"
                                            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand-purple/50"
                                    )}
                                />
                            </div>
                            {idolSearchText && (
                                <button
                                    onClick={() => setIdolSearchText('')}
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors whitespace-nowrap",
                                        theme === 'dark'
                                            ? "border-white/10 text-white hover:bg-white/5"
                                            : "border-slate-200 text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>

                        {filteredIdols.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredIdols.map(idol => (
                                    <div
                                        key={idol.id}
                                        onClick={() => navigate(`/idol/${idol.id}`)}
                                        className={cn(
                                            "group relative aspect-3/4 rounded-3xl overflow-hidden cursor-pointer border transition-transform hover:-translate-y-1 hover:shadow-xl",
                                            theme === 'dark' ? "border-white/10" : "border-slate-200"
                                        )}
                                    >
                                        <img
                                            src={convertDriveLink(idol.image)}
                                            alt={idol.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                            <h3 className="text-white font-black text-lg leading-tight">{idol.name}</h3>
                                            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">{idol.group || 'Soloist'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={cn(
                                "p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center",
                                theme === 'dark' ? "border-white/10 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                            )}>
                                <User size={32} className={cn("mb-2 opacity-50", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                                <p className={cn("font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>No idols match the criteria</p>
                            </div>
                        )}
                    </div>
                )}

                {affiliatedArtists.groups.length === 0 && affiliatedArtists.idols.length === 0 && (
                    <div className={cn(
                        "p-12 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center",
                        theme === 'dark' ? "border-white/10 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                    )}>
                        <Music size={48} className={cn("mb-4 opacity-50", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                        <p className={cn("font-bold text-lg", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>No affiliated artists found</p>
                    </div>
                )}
            </div>

            <CompanyModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingCompany(null);
                }}
                initialData={editingCompany || company}
                onSave={handleSave}
            />

            {/* Link Subsidiary Modal */}
            {linkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={cn(
                        "w-full max-w-md p-6 rounded-2xl shadow-xl border",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}>
                        <h3 className={cn("text-lg font-black mb-1", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            Link Existing Company
                        </h3>
                        <p className={cn("text-xs font-bold uppercase tracking-wider mb-6", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                            Select a company to add as a subsidiary
                        </p>

                        <div className="space-y-4">
                            <select
                                value={selectedCompanyToLink}
                                onChange={(e) => setSelectedCompanyToLink(e.target.value)}
                                className={cn(
                                    "w-full p-3 rounded-xl border text-sm font-bold outline-none appearance-none cursor-pointer",
                                    theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                )}
                            >
                                <option value="">Select a company...</option>
                                {allCompanies
                                    .filter(c => c.name !== company.name && !subsidiaries.some(s => s.id === c.id))
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                            </select>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setLinkModalOpen(false);
                                        setSelectedCompanyToLink('');
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors",
                                        theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLinkSubsidiary}
                                    disabled={!selectedCompanyToLink}
                                    className="px-4 py-2 bg-brand-pink text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
                        onClick={() => setLightboxImage(null)}
                    >
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={convertDriveLink(lightboxImage)}
                            alt="Full View"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false })}
                onConfirm={deleteConfirmModal.onConfirm}
                title={deleteConfirmModal.title}
                message={deleteConfirmModal.message}
                type={deleteConfirmModal.type || 'danger'}
                confirmText={deleteConfirmModal.confirmText || 'Confirm'}
                singleButton={deleteConfirmModal.singleButton || false}
            />
        </div>
    );
}

export default CompanyDetailPage;
