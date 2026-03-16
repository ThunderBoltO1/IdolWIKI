import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, User, FileText, AlertCircle, ChevronRight, Eye, ArrowLeft, FileCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    approvePendingIdol,
    approvePendingGroup,
    approveEditRequest,
    rejectPendingSubmission,
    approveDeleteRequest,
    rejectDeleteRequest,
    notifyUser
} from '../lib/pendingSubmissions';
import { useToast } from './Toast';
import { useTranslation } from '../context/LanguageContext';
import { IdolCard } from './IdolCard';
import { IdolModal } from './IdolModal';
import { GroupCard } from './GroupCard';
import { diffChars } from 'diff';
import { convertDriveLink } from '../lib/storage';
import { BackgroundShapes } from './BackgroundShapes';

const DiffViewer = ({ oldStr, newStr }) => {
    const differences = diffChars(oldStr, newStr);
    return (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs p-2 rounded-lg bg-black/20">
            {differences.map((part, index) => {
                const color = part.added ? 'bg-green-500/20 text-green-300' :
                    part.removed ? 'bg-red-500/20 text-red-300 line-through' :
                        'text-slate-400';
                return (
                    <span key={index} className={cn(color, 'transition-colors')}>
                        {part.value}
                    </span>
                );
            })}
        </pre>
    );
};

export function AdminSubmissionDashboard({ onBack, initialTab = 'idols' }) {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { user, isAdmin, verifyAdminPassword } = useAuth();
    const toast = useToast();
    const t = useTranslation();
    const [activeTab, setActiveTab] = useState(initialTab); // idols, groups, edits, deletions
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [error, setError] = useState(null);
    const [indexWarning, setIndexWarning] = useState(null);
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyToItem, setReplyToItem] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [previewItem, setPreviewItem] = useState(null);
    const [previewChanges, setPreviewChanges] = useState(null);
    const [deletePasswordModalOpen, setDeletePasswordModalOpen] = useState(false);
    const [deletePasswordItem, setDeletePasswordItem] = useState(null);
    const [deletePasswordValue, setDeletePasswordValue] = useState('');

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (user) {
            fetchPendingItems();
        }
    }, [activeTab, user]);

    const fetchPendingItems = async () => {
        setLoading(true);
        setError(null);
        setIndexWarning(null);

        let collectionName = '';
        if (activeTab === 'idols') collectionName = 'pendingIdols';
        else if (activeTab === 'groups') collectionName = 'pendingGroups';
        else if (activeTab === 'edits') collectionName = 'editRequests';
        else if (activeTab === 'deletions') collectionName = 'deleteRequests';

        if (!collectionName) {
            setPendingItems([]);
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, collectionName),
                where('status', '==', 'pending'),
                orderBy('submittedAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPendingItems(items);
        } catch (error) {
            if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
                console.warn("Firestore index missing. Using fallback query.");
                const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                if (match) {
                    setIndexWarning(match[0]);
                }

                // Fallback for older data or index issues
                try {
                    const q = query(
                        collection(db, collectionName),
                        where('status', '==', 'pending')
                    );
                    const snapshot = await getDocs(q);
                    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    items.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
                    setPendingItems(items);
                } catch (err) {
                    console.error("Fallback fetch failed", err);
                    setError("Access denied. Missing permissions to view submissions.");
                }
            } else {
                console.error("Error fetching pending items:", error);
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item) => {
        if (activeTab === 'deletions') {
            setDeletePasswordItem(item);
            setDeletePasswordValue('');
            setDeletePasswordModalOpen(true);
            return;
        }
        if (!confirm('Are you sure you want to approve this submission?')) return;

        setProcessingId(item.id);
        let result;

        if (activeTab === 'idols') {
            result = await approvePendingIdol(item.id, user);
        } else if (activeTab === 'groups') {
            result = await approvePendingGroup(item.id, user);
        } else if (activeTab === 'edits') {
            result = await approveEditRequest(item.id, user);
        }

        if (result.success) {
            setPendingItems(prev => prev.filter(i => i.id !== item.id));

            // Create notification for approval
            const recipientId = item.submittedBy || item.submitterId;
            if (recipientId) {
                try {
                    let targetId = item.id;
                    let targetType = 'idol';
                    let title = 'Submission Approved';
                    let message = 'Your submission has been approved.';

                    if (activeTab === 'idols') {
                        targetId = result.idolId;
                        targetType = 'idol';
                        title = 'Idol Approved';
                        message = `Your submission for ${item.name} has been approved!`;
                    } else if (activeTab === 'groups') {
                        targetId = result.groupId;
                        targetType = 'group';
                        title = 'Group Approved';
                        message = `Your submission for ${item.name} has been approved!`;
                    } else if (activeTab === 'edits') {
                        targetId = item.targetId;
                        targetType = item.targetType;
                        title = 'Edit Request Approved';
                        message = `Your edit request for ${item.targetName || 'Group/Idol'} has been approved.`;
                    }

                    await addDoc(collection(db, 'notifications'), {
                        recipientId: recipientId,
                        type: 'system',
                        title: title,
                        message: message,
                        targetId: targetId,
                        targetType: targetType,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                } catch (error) {
                    console.error("Error creating notification:", error);
                }
            }
            alert('Approved successfully!');
        } else {
            alert('Error approving: ' + result.error);
        }
        setProcessingId(null);
    };

    const handleRejectClick = (item) => {
        setSelectedItem(item);
        setRejectReason('');
        setRejectModalOpen(true);
    };

    const handleApproveDeleteConfirm = async () => {
        if (!deletePasswordItem || !deletePasswordValue.trim()) {
            toast.error('กรุณาใส่รหัสผ่านของแอดมิน');
            return;
        }
        setProcessingId(deletePasswordItem.id);
        try {
            await verifyAdminPassword(deletePasswordValue);
            const result = await approveDeleteRequest(deletePasswordItem.id, user);
            if (result.success) {
                setPendingItems(prev => prev.filter(i => i.id !== deletePasswordItem.id));
                setDeletePasswordModalOpen(false);
                setDeletePasswordItem(null);
                setDeletePasswordValue('');
                toast.success('อนุมัติการลบแล้ว');
            } else {
                toast.error(result.error || 'อนุมัติการลบไม่สำเร็จ');
            }
        } catch (err) {
            toast.error(err?.message || 'รหัสผ่านไม่ถูกต้อง หรือบัญชีไม่มีอีเมล');
        }
        setProcessingId(null);
    };

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim() && activeTab !== 'deletions') return alert('Please provide a reason');

        setProcessingId(selectedItem.id);
        let collectionName = '';
        if (activeTab === 'idols') collectionName = 'pendingIdols';
        else if (activeTab === 'groups') collectionName = 'pendingGroups';
        else if (activeTab === 'edits') collectionName = 'editRequests';
        else if (activeTab === 'deletions') collectionName = 'deleteRequests';

        const result = activeTab === 'deletions'
            ? await rejectDeleteRequest(selectedItem.id, user, rejectReason)
            : await rejectPendingSubmission(collectionName, selectedItem.id, user, rejectReason);

        if (result.success) {
            setPendingItems(prev => prev.filter(i => i.id !== selectedItem.id));

            // Create notification for rejection
            const recipientId = selectedItem.submittedBy || selectedItem.submitterId;
            if (recipientId) {
                try {
                    await addDoc(collection(db, 'notifications'), {
                        recipientId: recipientId,
                        type: 'system',
                        title: 'Edit Request Rejected',
                        message: `Your edit request for ${selectedItem.targetName || 'Group/Idol'} was rejected. Reason: ${rejectReason}`,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                } catch (error) {
                    console.error("Error creating notification:", error);
                }
            }
            setRejectModalOpen(false);
            setSelectedItem(null);
        } else {
            alert('Error rejecting: ' + result.error);
        }
        setProcessingId(null);
    };

    const handlePreviewSave = async (updatedData) => {
        try {
            if (activeTab === 'idols' && previewItem) {
                await updateDoc(doc(db, 'pendingIdols', previewItem.id), updatedData);
                setPendingItems(prev => prev.map(item => item.id === previewItem.id ? { ...item, ...updatedData } : item));
                setPreviewItem(null);
                setPreviewChanges(null);
                alert('Pending submission updated.');
            }
        } catch (error) {
            console.error("Error updating pending submission:", error);
            alert("Failed to update.");
        }
    };

    const handleViewDetails = async (item) => {
        if (activeTab === 'idols') {
            setPreviewItem(item);
            setPreviewChanges(null);
        } else if (activeTab === 'edits' && item.targetType === 'idol') {
            setLoading(true);
            try {
                const docRef = doc(db, 'idols', item.targetId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const originalData = { id: docSnap.id, ...docSnap.data() };
                    const mergedData = { ...originalData };

                    // Apply changes for preview
                    if (item.changes) {
                        Object.keys(item.changes).forEach(key => {
                            if (item.changes[key] && item.changes[key].new !== undefined) {
                                mergedData[key] = item.changes[key].new;
                            }
                        });
                    }

                    setPreviewItem(mergedData);
                    setPreviewChanges(item.changes);
                } else {
                    alert("Original idol not found");
                }
            } catch (error) {
                console.error("Error fetching original idol:", error);
                alert("Failed to load details");
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Access Denied: Admin privileges required.</div>;

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
            <BackgroundShapes />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={cn(
                            "p-3 rounded-2xl transition-all active:scale-95 shadow-sm border",
                            theme === 'dark'
                                ? "bg-slate-800 border-white/5 hover:bg-slate-700 text-white"
                                : "bg-white border-slate-100 hover:bg-slate-50 text-slate-900"
                        )}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={cn(
                            "text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <FileCheck className="text-brand-pink" size={32} />
                            {t('submissions.pageTitle')}
                        </h1>
                        <p className={cn(
                            "text-sm font-medium mt-1",
                            theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                            {t('submissions.pageSubtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={cn(
                "rounded-3xl border overflow-hidden mb-6",
                theme === 'dark' ? "border-white/5 bg-slate-900/40" : "border-slate-200 bg-white"
            )}>
                <div className={cn("flex border-b", theme === 'dark' ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50")}>
                    {[
                        { id: 'idols', label: t('submissions.pendingIdols') },
                        { id: 'groups', label: t('submissions.pendingGroups') },
                        { id: 'edits', label: t('submissions.editRequests') },
                        { id: 'deletions', label: t('deleteRequest.tabLabel') }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold uppercase tracking-wider relative transition-colors",
                                activeTab === tab.id
                                    ? "text-brand-pink"
                                    : theme === 'dark' ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-pink"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full"
                            />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-500 gap-4">
                            <AlertCircle size={48} className="opacity-50" />
                            <p className="font-bold">{error}</p>
                            <p className="text-sm text-slate-500">{t('submissions.checkSecurityRules')}</p>
                        </div>
                    ) : (
                        <>
                            {indexWarning && (
                                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3 text-yellow-600 dark:text-yellow-400">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{t('submissions.missingIndex')}</p>
                                        <p className="text-xs mt-1 opacity-80">
                                            {t('submissions.missingIndexHint')}{' '}
                                            <a href={indexWarning} target="_blank" rel="noopener noreferrer" className="underline ml-1 hover:text-yellow-500">
                                                {t('submissions.clickHereToCreate')}
                                            </a>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {pendingItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                    <Check size={48} className="opacity-20" />
                                    <p className="font-medium">{t('submissions.allCaughtUp')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingItems.map(item => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "rounded-2xl overflow-hidden border relative flex flex-col",
                                                theme === 'dark' ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200"
                                            )}
                                        >
                                            {/* Item Preview */}
                                            {activeTab === 'deletions' ? (
                                                <div
                                                    className={cn(
                                                        "border-b border-white/5 bg-red-500/5 cursor-pointer transition-opacity hover:opacity-90",
                                                        "flex gap-4 p-4"
                                                    )}
                                                    onClick={() => {
                                                        if (item.targetType === 'idol') navigate(`/idol/${item.targetId}`);
                                                        else if (item.targetType === 'group') navigate(`/group/${item.targetId}`);
                                                        else if (item.targetType === 'company') navigate(`/company/${encodeURIComponent(item.targetName || '')}`);
                                                    }}
                                                >
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                                                        {item.targetImage ? (
                                                            <img src={convertDriveLink(item.targetImage)} alt={item.targetName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <AlertCircle size={24} className="text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                                                            <span className="text-xs font-bold uppercase tracking-widest text-red-500">{t('deleteRequest.cardLabel')}</span>
                                                        </div>
                                                        <h3 className={cn("font-bold text-lg truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                            {item.targetName || 'Unknown'}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 uppercase">
                                                            {item.targetType === 'idol' ? t('deleteRequest.typeIdol') : item.targetType === 'group' ? t('deleteRequest.typeGroup') : t('deleteRequest.typeCompany')}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                                            <ExternalLink size={10} /> {t('deleteRequest.clickToView')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : activeTab === 'edits' ? (
                                                <div className="p-4 border-b border-white/5 bg-brand-purple/5">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertCircle size={16} className="text-brand-pink" />
                                                        <span className="text-xs font-bold uppercase tracking-widest text-brand-pink">Edit Request</span>
                                                    </div>
                                                    <h3 className={cn("font-bold text-lg", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                        {item.targetName || 'Unknown Target'}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1 uppercase">Target: {item.targetType}</p>
                                                </div>
                                            ) : (
                                                <div className="aspect-video relative overflow-hidden bg-slate-800">
                                                    {item.image || item.coverImage ? (
                                                        <img
                                                            src={convertDriveLink(item.image || item.coverImage)}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                            No Image
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/80 to-transparent">
                                                        <h3 className="text-white font-bold text-lg truncate">{item.name}</h3>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Details */}
                                            <div className="p-4 flex-1 space-y-4">
                                                {/* Submitter Info */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-pink/20 flex items-center justify-center text-brand-pink overflow-hidden">
                                                        {item.submitterAvatar ? (
                                                            <img
                                                                src={convertDriveLink(item.submitterAvatar)}
                                                                alt={item.submitterName}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <User size={14} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                            {item.submitterName || 'Unknown User'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">{item.submitterEmail}</p>
                                                    </div>
                                                </div>

                                                {/* Edit Details (Diff) */}
                                                {activeTab === 'deletions' && (
                                                    <>
                                                        {item.reason && (
                                                            <div className={cn("text-xs rounded-xl p-3 border", theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")}>
                                                                <span className="font-bold text-slate-500 uppercase text-[10px]">{t('deleteRequest.reasonLabel')}: </span>
                                                                <p className="mt-1 whitespace-pre-wrap">{item.reason}</p>
                                                            </div>
                                                        )}
                                                        <p className={cn("text-xs", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                                            {t('deleteRequest.confirmPasswordHint')}
                                                        </p>
                                                    </>
                                                )}
                                                {activeTab === 'edits' && (
                                                    <div className="bg-black/20 rounded-lg p-3 text-xs space-y-2">
                                                        <p className="text-slate-400 font-mono">Reason: <span className="text-white">{item.reason}</span></p>
                                                        <div className="border-t border-white/10 pt-2 mt-2">
                                                            <p className="text-brand-pink font-bold mb-2">Changes:</p>
                                                            {Object.entries(item.changes || {}).map(([key, val]) => (
                                                                <div key={key} className="flex flex-col gap-1 mb-2">
                                                                    <span className="text-slate-500 uppercase text-[10px]">{key}</span>
                                                                    {key === 'description' ? (
                                                                        <DiffViewer oldStr={val.old?.toString() || ''} newStr={val.new?.toString() || ''} />
                                                                    ) : (
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="bg-red-500/10 text-red-400 p-2 rounded line-through opacity-70 break-words text-xs">
                                                                                {val.old?.toString() || 'None'}
                                                                            </div>
                                                                            <div className="bg-green-500/10 text-green-400 p-2 rounded break-words text-xs">{val.new?.toString() || 'None'}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Timestamp */}
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <Clock size={12} />
                                                    <span>Submitted {item.submittedAt?.toDate().toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-3">
                                                {activeTab === 'deletions' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setReplyToItem(item); setReplyMessage(''); setReplyModalOpen(true); }}
                                                        className="col-span-2 py-2.5 rounded-xl border border-brand-pink/30 text-brand-pink hover:bg-brand-pink/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <MessageCircle size={14} /> {t('deleteRequest.replyToRequester')}
                                                    </button>
                                                )}
                                                {(activeTab === 'idols' || (activeTab === 'edits' && item.targetType === 'idol')) && activeTab !== 'deletions' && (
                                                    <button
                                                        onClick={() => handleViewDetails(item)}
                                                        className="col-span-2 py-2.5 rounded-xl border border-slate-500/30 text-slate-500 hover:bg-slate-500/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Eye size={14} /> {t('submissions.viewFullDetails')}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleRejectClick(item)}
                                                    disabled={processingId === item.id}
                                                    className="py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    <X size={14} /> {t('common.reject')}
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(item)}
                                                    disabled={processingId === item.id}
                                                    className="py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                                                >
                                                    {processingId === item.id ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                                                    {t('common.approve')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectModalOpen && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={cn("w-full max-w-md p-6 rounded-2xl shadow-xl",
                                theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                            )}
                        >
                            <h3 className={cn("text-xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-slate-900")}>{t('submissions.rejectSubmission')}</h3>
                            <p className="text-slate-500 text-sm mb-4">Please provide a reason for rejecting this submission.</p>

                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className={cn(
                                    "w-full h-32 p-4 rounded-xl resize-none text-sm focus:outline-none border",
                                    theme === 'dark' ? "bg-black/50 border-white/10 text-white focus:border-red-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500"
                                )}
                                placeholder={t('submissions.rejectReasonPlaceholder')}
                            />

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setRejectModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-white"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleRejectConfirm}
                                    className="px-6 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/25"
                                >
                                    {t('submissions.confirmReject')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal ยืนยันรหัสผ่านสำหรับอนุมัติการลบ */}
            <AnimatePresence>
                {deletePasswordModalOpen && deletePasswordItem && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={cn("w-full max-w-md p-6 rounded-2xl shadow-xl", theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white border border-slate-200")}
                        >
                            <h3 className={cn("text-xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>{t('deleteRequest.confirmDelete')}</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                {t('deleteRequest.confirmDeletePassword')} "{deletePasswordItem.targetName}"
                            </p>
                            <input
                                type="password"
                                value={deletePasswordValue}
                                onChange={e => setDeletePasswordValue(e.target.value)}
                                placeholder="รหัสผ่าน"
                                className={cn("w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink", theme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                                onKeyDown={e => e.key === 'Enter' && handleApproveDeleteConfirm()}
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => { setDeletePasswordModalOpen(false); setDeletePasswordItem(null); setDeletePasswordValue(''); }}
                                    className={cn("px-4 py-2 rounded-xl text-sm font-bold", theme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleApproveDeleteConfirm}
                                    disabled={processingId === deletePasswordItem.id || !deletePasswordValue.trim()}
                                    className="px-6 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-500/25"
                                >
                                    {processingId === deletePasswordItem.id ? t('deleteRequest.processing') : t('deleteRequest.confirmDeleteButton')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reply to requester modal (ถามยืนยันคำขอลบ) */}
            <AnimatePresence>
                {replyModalOpen && replyToItem && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={cn("w-full max-w-md p-6 rounded-2xl shadow-xl", theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white border border-slate-200")}
                        >
                            <h3 className={cn("text-lg font-bold mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                {t('deleteRequest.replyModalTitle')}
                            </h3>
                            <p className="text-slate-500 text-sm mb-3">
                                {t('deleteRequest.replyModalHint')} "{replyToItem.targetName}"
                            </p>
                            <textarea
                                value={replyMessage}
                                onChange={e => setReplyMessage(e.target.value)}
                                placeholder={t('deleteRequest.replyPlaceholder')}
                                rows={4}
                                className={cn("w-full p-3 rounded-xl border text-sm resize-none", theme === 'dark' ? "bg-slate-800 border-white/10 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => { setReplyModalOpen(false); setReplyToItem(null); setReplyMessage(''); }}
                                    className={cn("px-4 py-2 rounded-xl text-sm font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-600")}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!replyMessage.trim()) return;
                                        try {
                                            await notifyUser(
                                                replyToItem.submittedBy,
                                                t('deleteRequest.adminReplyNotificationTitle'),
                                                `"${replyToItem.targetName}": ${replyMessage.trim()}`
                                            );
                                            toast.success(t('deleteRequest.replySuccess'));
                                            setReplyModalOpen(false);
                                            setReplyToItem(null);
                                            setReplyMessage('');
                                        } catch (e) {
                                            toast.error(t('deleteRequest.replyError'));
                                        }
                                    }}
                                    disabled={!replyMessage.trim()}
                                    className="px-6 py-2 rounded-xl bg-brand-pink text-white text-sm font-bold hover:bg-brand-pink/90 disabled:opacity-50"
                                >
                                    {t('deleteRequest.replySend')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal for Idols */}
            {previewItem && (
                <IdolModal
                    isOpen={true}
                    mode="view"
                    idol={previewItem}
                    highlightedChanges={previewChanges}
                    onClose={() => { setPreviewItem(null); setPreviewChanges(null); }}
                    onSave={handlePreviewSave}
                    onDelete={() => { }}
                    onLike={() => { }}
                    onGroupClick={() => { }}
                />
            )}
        </div>
    );
}
