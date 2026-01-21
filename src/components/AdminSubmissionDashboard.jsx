import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, User, FileText, AlertCircle, ChevronRight, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    approvePendingIdol,
    approvePendingGroup,
    approveEditRequest,
    rejectPendingSubmission
} from '../lib/pendingSubmissions';
import { IdolCard } from './IdolCard';
import { GroupCard } from './GroupCard';
import { diffChars } from 'diff';

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

export function AdminSubmissionDashboard({ onClose }) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('idols'); // idols, groups, edits
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchPendingItems();
    }, [activeTab]);

    const fetchPendingItems = async () => {
        setLoading(true);
        try {
            let collectionName = '';
            if (activeTab === 'idols') collectionName = 'pendingIdols';
            else if (activeTab === 'groups') collectionName = 'pendingGroups';
            else if (activeTab === 'edits') collectionName = 'editRequests';

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
            console.error("Error fetching pending items:", error);
            // Fallback for older data or index issues
            try {
                const q = query(
                    collection(db, activeTab === 'idols' ? 'pendingIdols' : activeTab === 'groups' ? 'pendingGroups' : 'editRequests'),
                    where('status', '==', 'pending')
                );
                const snapshot = await getDocs(q);
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort client-side
                items.sort((a, b) => b.submittedAt?.seconds - a.submittedAt?.seconds);
                setPendingItems(items);
            } catch (err) {
                console.error("Fallback fetch failed", err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item) => {
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
            if (item.submitterId) {
                try {
                    await addDoc(collection(db, 'notifications'), {
                        recipientId: item.submitterId,
                        type: 'system',
                        title: 'Edit Request Approved',
                        message: `Your edit request for ${item.targetName || 'Group/Idol'} has been approved.`,
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

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim()) return alert('Please provide a reason');

        setProcessingId(selectedItem.id);
        let collectionName = '';
        if (activeTab === 'idols') collectionName = 'pendingIdols';
        else if (activeTab === 'groups') collectionName = 'pendingGroups';
        else if (activeTab === 'edits') collectionName = 'editRequests';

        const result = await rejectPendingSubmission(collectionName, selectedItem.id, user, rejectReason);

        if (result.success) {
            setPendingItems(prev => prev.filter(i => i.id !== selectedItem.id));
            
            // Create notification for rejection
            if (selectedItem.submitterId) {
                try {
                    await addDoc(collection(db, 'notifications'), {
                        recipientId: selectedItem.submitterId,
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

    return (
        <div className={cn("fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6",
            theme === 'dark' ? "bg-black/90" : "bg-slate-900/50 backdrop-blur-sm")}>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                    "w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative",
                    theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                )}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className={cn("text-2xl font-black uppercase tracking-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            Submission <span className="text-brand-pink">Dashboard</span>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Manage user submissions and edit requests</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={cn("flex border-b shrink-0", theme === 'dark' ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50")}>
                    {[
                        { id: 'idols', label: 'Pending Idols' },
                        { id: 'groups', label: 'Pending Groups' },
                        { id: 'edits', label: 'Edit Requests' }
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
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full"
                            />
                        </div>
                    ) : pendingItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <Check size={48} className="opacity-20" />
                            <p className="font-medium">All caught up! No pending submissions.</p>
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
                                    {activeTab === 'edits' ? (
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
                                                    src={item.image || item.coverImage}
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
                                            <div className="w-8 h-8 rounded-full bg-brand-pink/20 flex items-center justify-center text-brand-pink">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                    {item.submitterName || 'Unknown User'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">{item.submitterEmail}</p>
                                            </div>
                                        </div>

                                        {/* Edit Details (Diff) */}
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
                                        <button
                                            onClick={() => handleRejectClick(item)}
                                            disabled={processingId === item.id}
                                            className="py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item)}
                                            disabled={processingId === item.id}
                                            className="py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                                        >
                                            {processingId === item.id ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                                            Approve
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

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
                            <h3 className={cn("text-xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-slate-900")}>Reject Submission</h3>
                            <p className="text-slate-500 text-sm mb-4">Please provide a reason for rejecting this submission.</p>

                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className={cn(
                                    "w-full h-32 p-4 rounded-xl resize-none text-sm focus:outline-none border",
                                    theme === 'dark' ? "bg-black/50 border-white/10 text-white focus:border-red-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500"
                                )}
                                placeholder="Reason for rejection..."
                            />

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setRejectModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectConfirm}
                                    className="px-6 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/25"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
