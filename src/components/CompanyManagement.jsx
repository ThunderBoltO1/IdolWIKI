import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { Building2, Plus, Search, Edit2, Trash2, Calendar, MapPin, Users, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CompanyModal } from './CompanyModal';
import { ConfirmationModal } from './ConfirmationModal';

export function CompanyManagement() {
    const { theme } = useTheme();
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'companies'), orderBy('name'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanies(data);
        } catch (error) {
            console.error("Error fetching companies:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.koreanName && company.koreanName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDeleteClick = (company) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Company',
            message: `Are you sure you want to delete "${company.name}"? This action cannot be undone.`,
            onConfirm: () => deleteCompany(company.id),
            type: 'danger',
            confirmText: 'Delete'
        });
    };

    const deleteCompany = async (id) => {
        try {
            await deleteDoc(doc(db, 'companies', id));
            setCompanies(prev => prev.filter(c => c.id !== id));
            setConfirmModal({ isOpen: false });
        } catch (error) {
            console.error("Error deleting company:", error);
        }
    };

    const handleEditClick = (company) => {
        setSelectedCompany(company);
        setModalOpen(true);
    };

    const handleCreateClick = () => {
        setSelectedCompany({ isNew: true });
        setModalOpen(true);
    };

    const handleSave = () => {
        // Optimistic update or refresh
        fetchCompanies();
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl font-bold text-slate-500">Access Denied</p>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen p-4 md:p-8 pt-24", theme === 'dark' ? "text-white" : "text-slate-900")}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Company Management</h1>
                        <p className="text-slate-500 font-medium">Manage all entertainment companies and agencies.</p>
                    </div>
                    <button
                        onClick={handleCreateClick}
                        className="px-6 py-3 rounded-2xl bg-brand-pink text-white font-bold shadow-lg shadow-brand-pink/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 self-start md:self-auto"
                    >
                        <Plus size={20} />
                        Add New Company
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className={cn(
                            "w-full pl-12 pr-4 py-4 rounded-2xl border font-bold outline-none transition-all",
                            theme === 'dark' ? "bg-slate-900 border-white/10 focus:border-brand-pink" : "bg-white border-slate-200 focus:border-brand-pink"
                        )}
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-pink"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCompanies.map(company => (
                            <div
                                key={company.id}
                                className={cn(
                                    "p-4 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden",
                                    theme === 'dark' ? "bg-slate-900 border-white/5 hover:border-white/20" : "bg-white border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(company); }}
                                        className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-brand-pink hover:text-white transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(company); }}
                                        className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div onClick={() => navigate(`/company/${encodeURIComponent(company.name)}`)} className="cursor-pointer space-y-4">
                                    <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                                        {company.image ? (
                                            <img
                                                src={convertDriveLink(company.image)}
                                                alt={company.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Building2 size={48} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black tracking-tight truncate pr-8">{company.name}</h3>
                                        <div className="flex flex-col gap-1 mt-2 text-xs font-medium text-slate-500">
                                            {company.founded && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} />
                                                    <span>Est. {new Date(company.founded).getFullYear()}</span>
                                                </div>
                                            )}
                                            {company.headquarters && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={12} />
                                                    <span className="truncate">{company.headquarters}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredCompanies.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-bold">No companies found.</p>
                        <button onClick={handleCreateClick} className="mt-4 text-brand-pink font-bold hover:underline">
                            Create First Company
                        </button>
                    </div>
                )}
            </div>

            <CompanyModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialData={selectedCompany}
                onSave={handleSave}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
            />
        </div>
    );
}

export default CompanyManagement;
