import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Trash2, Shield, User, Search, CheckCircle2, ArrowLeft, Ban, AlertCircle } from 'lucide-react';
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
            await updateDoc(doc(db, 'users', userId), { banned: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, banned: !currentStatus } : u));
            showSuccess(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully`);
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
                <div className={cn("px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>
                    Total Users: {users.length}
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
                    {filteredUsers.map(userItem => (
                        <motion.div
                            key={userItem.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
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
                    
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-20">
                            <User size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No users found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}