import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Loader2, Trash2, Shield, User, Search, CheckCircle2, ArrowLeft, Ban, AlertCircle, History, X, MessageSquare, Send, Megaphone, Activity, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';

export function AdminUserManagement({ onBack }) {
    const { user, isAdmin } = useAuth();
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState(null);
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [notificationTarget, setNotificationTarget] = useState(null);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [viewingActivityFor, setViewingActivityFor] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(null);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all users without server-side ordering to avoid index issues
            const snapshot = await getDocs(collection(db, 'users'));
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Sort client-side
            usersData.sort((a, b) => {
                return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0));
            });
            
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
            setError("Failed to fetch users. Please check your Firestore Security Rules.");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        setActionLoading(`${userId}-role`);
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showSuccess(`Role updated to ${newRole}`);
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBanUser = async (userId, currentStatus) => {
        setActionLoading(`${userId}-ban`);
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, 'users', userId), { banned: newStatus });
            
            await addDoc(collection(db, 'banLogs'), {
                userId,
                action: newStatus ? 'ban' : 'unban',
                performedBy: user.uid || user.id,
                performedByName: user.name || user.email || 'Admin',
                timestamp: serverTimestamp()
            });

            setUsers(users.map(u => u.id === userId ? { ...u, banned: newStatus } : u));
            showSuccess(`User ${newStatus ? 'banned' : 'unbanned'} successfully`);
        } catch (error) {
            console.error("Error updating ban status:", error);
            alert("Failed to update ban status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        
        setActionLoading(`${userId}-delete`);
        try {
            await deleteDoc(doc(db, 'users', userId));
            setUsers(users.filter(u => u.id !== userId));
            showSuccess('User deleted successfully');
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user");
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = async (userItem) => {
        if (!window.confirm(`Are you sure you want to send a password reset email to ${userItem.email}?`)) return;
        
        setActionLoading(`${userItem.id}-reset-password`);
        try {
            await sendPasswordResetEmail(auth, userItem.email);
            showSuccess(`Password reset email sent to ${userItem.email}`);
        } catch (error) {
            console.error("Error sending reset password email:", error);
            alert("Failed to send password reset email: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const fetchBanHistory = async (userItem) => {
        setViewingHistoryFor(userItem);
        setHistoryLoading(true);
        setHistoryLogs([]);
        try {
            const q = query(
                collection(db, 'banLogs'), 
                where('userId', '==', userItem.id)
            );
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            logs.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            setHistoryLogs(logs);
        } catch (err) {
            console.error("Error fetching ban history:", err);
            alert("Failed to fetch history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchActivityLogs = async (userItem) => {
        setViewingActivityFor(userItem);
        setActivityLoading(true);
        setActivityLogs([]);
        setActivityError(null);
        try {
            const q = query(
                collection(db, 'activityLogs'),
                where('userId', '==', userItem.id)
            );
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort client-side
            logs.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            setActivityLogs(logs);
        } catch (err) {
            console.error("Error fetching activity logs:", err);
            setActivityError("Failed to fetch activity logs. Check permissions.");
        } finally {
            setActivityLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if (!notificationMessage.trim() || !notificationTarget) return;
        
        setIsSendingNotification(true);
        try {
            if (notificationTarget.id === 'all') {
                // Broadcast to all users
                const batchSize = 500;
                const chunks = [];
                const targets = users; // Send to everyone

                for (let i = 0; i < targets.length; i += batchSize) {
                    chunks.push(targets.slice(i, i + batchSize));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(u => {
                        const ref = doc(collection(db, 'notifications'));
                        batch.set(ref, {
                            recipientId: u.id,
                            senderId: user.uid || user.id,
                            senderName: 'Admin Broadcast',
                            senderAvatar: '', 
                            type: 'admin_message',
                            text: notificationMessage.trim(),
                            createdAt: serverTimestamp(),
                            read: false
                        });
                    });
                    await batch.commit();
                }
                showSuccess(`Broadcast sent to ${targets.length} users`);
            } else {
                await addDoc(collection(db, 'notifications'), {
                    recipientId: notificationTarget.id,
                    senderId: user.uid || user.id,
                    senderName: 'Admin Notification',
                    senderAvatar: '', 
                    type: 'admin_message',
                    text: notificationMessage.trim(),
                    createdAt: serverTimestamp(),
                    read: false
                });
                showSuccess(`Notification sent to ${notificationTarget.name}`);
            }
            setNotificationTarget(null);
            setNotificationMessage('');
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("Failed to send notification");
        } finally {
            setIsSendingNotification(false);
        }
    };

    const showSuccess = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Access Denied: Admin privileges required.</div>;

    const isUserLoading = (userId) => actionLoading && actionLoading.startsWith(userId);

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className={cn("text-3xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        User Management
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setNotificationTarget({ id: 'all', name: 'All Users' })}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors",
                            theme === 'dark' ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                        )}
                    >
                        <Megaphone size={16} /> Broadcast
                    </button>
                    <div className={cn("px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>
                        Total Users: {users.length}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search users by name, email, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                        "w-full pl-12 pr-4 py-4 rounded-2xl border-2 focus:outline-none transition-all font-medium",
                        theme === 'dark' 
                            ? "bg-slate-900/50 border-white/10 focus:border-brand-pink text-white placeholder:text-slate-600" 
                            : "bg-white border-slate-200 focus:border-brand-pink text-slate-900"
                    )}
                />
            </div>

            {successMessage && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-500 font-bold"
                >
                    <CheckCircle2 size={20} />
                    {successMessage}
                </motion.div>
            )}

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 font-bold"
                >
                    <AlertCircle size={20} />
                    {error}
                </motion.div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-brand-pink" size={40} />
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                    {filteredUsers.map(userItem => (
                        <motion.div
                            layout
                            key={userItem.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className={cn(
                                "p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-6 transition-all",
                                theme === 'dark' 
                                    ? "bg-slate-900/40 border-white/5 hover:border-white/10" 
                                    : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                            )}
                        >
                            <img 
                                src={convertDriveLink(userItem.avatar)} 
                                alt={userItem.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${userItem.name}&background=random`}
                            />
                            
                            <div className="flex-1 text-center md:text-left min-w-0">
                                <h3 className={cn("text-lg font-black truncate flex items-center gap-2 justify-center md:justify-start", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    {userItem.name}
                                    {userItem.banned && <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-xs uppercase tracking-widest border border-red-500/20">Banned</span>}
                                </h3>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-slate-500 font-medium">
                                    <span className="text-brand-pink">@{userItem.username}</span>
                                    <span className="hidden md:inline">•</span>
                                    <span className="truncate">{userItem.email}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                                    theme === 'dark' ? "bg-slate-800 border-white/5" : "bg-slate-50 border-slate-200"
                                )}>
                                    {userItem.role === 'admin' ? <Shield size={16} className="text-brand-purple" /> : <User size={16} className="text-slate-400" />}
                                    <select
                                        value={userItem.role || 'user'}
                                        onChange={(e) => handleRoleUpdate(userItem.id, e.target.value)}
                                        disabled={isUserLoading(userItem.id) || userItem.id === user.uid}
                                        className={cn(
                                            "bg-transparent text-xs font-bold uppercase tracking-wider outline-none cursor-pointer",
                                            theme === 'dark' ? "text-white" : "text-slate-700",
                                            (isUserLoading(userItem.id) || userItem.id === user.uid) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => fetchBanHistory(userItem)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-blue-900/30 text-slate-500 hover:text-blue-400" 
                                            : "hover:bg-blue-50 text-slate-400 hover:text-blue-500"
                                    )}
                                    title="View History"
                                >
                                    <History size={20} />
                                </button>

                                <button
                                    onClick={() => fetchActivityLogs(userItem)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-400" 
                                            : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-500"
                                    )}
                                    title="View Activity Logs"
                                >
                                    <Activity size={20} />
                                </button>

                                <button
                                    onClick={() => setNotificationTarget(userItem)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-purple-900/30 text-slate-500 hover:text-purple-400" 
                                            : "hover:bg-purple-50 text-slate-400 hover:text-purple-500"
                                    )}
                                    title="Send Message"
                                >
                                    <MessageSquare size={20} />
                                </button>

                                <button
                                    onClick={() => handleResetPassword(userItem)}
                                    disabled={isUserLoading(userItem.id)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-yellow-900/30 text-slate-500 hover:text-yellow-400" 
                                            : "hover:bg-yellow-50 text-slate-400 hover:text-yellow-500",
                                        (isUserLoading(userItem.id)) && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Send Password Reset Email"
                                >
                                    {actionLoading === `${userItem.id}-reset-password` ? <Loader2 size={20} className="animate-spin" /> : <KeyRound size={20} />}
                                </button>

                                <button
                                    onClick={() => handleBanUser(userItem.id, userItem.banned)}
                                    disabled={isUserLoading(userItem.id) || userItem.id === user.uid}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-orange-900/30 text-slate-500 hover:text-orange-400" 
                                            : "hover:bg-orange-50 text-slate-400 hover:text-orange-500",
                                        (isUserLoading(userItem.id) || userItem.id === user.uid) && "opacity-50 cursor-not-allowed",
                                        userItem.banned && "text-orange-500 bg-orange-500/10"
                                    )}
                                    title={userItem.banned ? "Unban User" : "Ban User"}
                                >
                                    {actionLoading === `${userItem.id}-ban` ? <Loader2 size={20} className="animate-spin" /> : <Ban size={20} />}
                                </button>

                                <button
                                    onClick={() => handleDeleteUser(userItem.id)}
                                    disabled={isUserLoading(userItem.id) || userItem.id === user.uid}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        theme === 'dark' 
                                            ? "hover:bg-red-900/30 text-slate-500 hover:text-red-400" 
                                            : "hover:bg-red-50 text-slate-400 hover:text-red-500",
                                        (isUserLoading(userItem.id) || userItem.id === user.uid) && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Delete User"
                                >
                                    {actionLoading === `${userItem.id}-delete` ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                    
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-20">
                            <User size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No users found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {viewingHistoryFor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setViewingHistoryFor(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col",
                                theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    Ban History: {viewingHistoryFor.name}
                                </h3>
                                <button onClick={() => setViewingHistoryFor(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                    <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {historyLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-pink" /></div>
                                ) : historyLogs.length === 0 ? (
                                    <p className="text-center text-slate-500 py-10">No history found.</p>
                                ) : (
                                    historyLogs.map(log => (
                                        <div key={log.id} className={cn("p-4 rounded-2xl border", theme === 'dark' ? "border-white/5 bg-slate-800/50" : "border-slate-100 bg-slate-50")}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={cn(
                                                    "text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                                    log.action === 'ban' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                                )}>
                                                    {log.action === 'ban' ? 'Banned' : 'Unbanned'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString() : 'Just now'}
                                                </span>
                                            </div>
                                            <p className={cn("text-sm", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                                                Performed by: <span className="font-bold">{log.performedByName}</span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notificationTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setNotificationTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col",
                                theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    Message to {notificationTarget.name}
                                </h3>
                                <button onClick={() => setNotificationTarget(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                    <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    value={notificationMessage}
                                    onChange={(e) => setNotificationMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className={cn(
                                        "w-full h-32 p-4 rounded-2xl resize-none focus:outline-none border-2 transition-all font-medium",
                                        theme === 'dark' 
                                            ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white placeholder:text-slate-500" 
                                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                    )}
                                    autoFocus
                                />
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setNotificationTarget(null)}
                                        className={cn(
                                            "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                            theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                                        )}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={!notificationMessage.trim() || isSendingNotification}
                                        className="px-6 py-3 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSendingNotification ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Send
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingActivityFor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setViewingActivityFor(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col",
                                theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    Activity Logs: {viewingActivityFor.name}
                                </h3>
                                <button onClick={() => setViewingActivityFor(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                    <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {activityLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-pink" /></div>
                                ) : activityError ? (
                                    <div className="p-10 text-center">
                                        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                                        <p className="text-red-500 font-bold">{activityError}</p>
                                    </div>
                                ) : activityLogs.length === 0 ? (
                                    <p className="text-center text-slate-500 py-10">No activity recorded.</p>
                                ) : (
                                    activityLogs.map(log => (
                                        <div key={log.id} className={cn("p-4 rounded-2xl border", theme === 'dark' ? "border-white/5 bg-slate-800/50" : "border-slate-100 bg-slate-50")}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={cn(
                                                    "text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                                    theme === 'dark' ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"
                                                )}>
                                                    {log.action.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString() : 'Just now'}
                                                </span>
                                            </div>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <pre className={cn("text-[10px] mt-2 p-2 rounded-lg overflow-x-auto", theme === 'dark' ? "bg-black/30 text-slate-400" : "bg-white text-slate-600 border border-slate-100")}>
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingActivityFor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setViewingActivityFor(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col",
                                theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    Activity Logs: {viewingActivityFor.name}
                                </h3>
                                <button onClick={() => setViewingActivityFor(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                    <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {activityLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-pink" /></div>
                                ) : activityLogs.length === 0 ? (
                                    <p className="text-center text-slate-500 py-10">No activity recorded.</p>
                                ) : (
                                    activityLogs.map(log => (
                                        <div key={log.id} className={cn("p-4 rounded-2xl border", theme === 'dark' ? "border-white/5 bg-slate-800/50" : "border-slate-100 bg-slate-50")}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={cn(
                                                    "text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                                    theme === 'dark' ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"
                                                )}>
                                                    {log.action.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString() : 'Just now'}
                                                </span>
                                            </div>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <pre className={cn("text-[10px] mt-2 p-2 rounded-lg overflow-x-auto", theme === 'dark' ? "bg-black/30 text-slate-400" : "bg-white text-slate-600 border border-slate-100")}>
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}