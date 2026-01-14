import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Music2, MessageSquare, Star, ArrowLeft, LayoutDashboard, Building2, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';

export function AdminDashboard({ onBack }) {
    const { isAdmin } = useAuth();
    const { theme } = useTheme();
    const [stats, setStats] = useState({
        users: 0,
        idols: 0,
        groups: 0,
        comments: 0
    });
    const [groupAwards, setGroupAwards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setError(null);
                // Fetch counts from all collections
                const [usersSnap, idolsSnap, groupsSnap, commentsSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users')),
                    getCountFromServer(collection(db, 'idols')),
                    getDocs(collection(db, 'groups')),
                    getCountFromServer(collection(db, 'comments'))
                ]);

                const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const awardsData = groupsData
                    .map(group => ({
                        name: group.name,
                        awardCount: group.awards?.length || 0,
                        image: group.image,
                    }))
                    .sort((a, b) => b.awardCount - a.awardCount);
                setGroupAwards(awardsData);

                setStats({
                    users: usersSnap.data().count,
                    idols: idolsSnap.data().count,
                    groups: groupsSnap.size,
                    comments: commentsSnap.data().count
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
                setError("Failed to load stats. Please check your Firestore Security Rules.");
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchStats();
        }
    }, [isAdmin]);

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Access Denied: Admin privileges required.</div>;

    const statCards = [
        { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Total Idols', value: stats.idols, icon: Star, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { label: 'Total Groups', value: stats.groups, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Total Comments', value: stats.comments, icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10' },
    ];

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={cn("text-3xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                    <LayoutDashboard className="text-brand-pink" />
                    Admin Dashboard
                </h1>
            </div>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 font-bold"
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
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "p-6 rounded-3xl border flex items-center gap-5",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                            )}
                        >
                            <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
                                <stat.icon size={28} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                                <p className={cn("text-3xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                    {stat.value.toLocaleString()}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-16">
                    <h2 className={cn("text-2xl font-black mb-6 flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        <Trophy className="text-brand-purple" />
                        Award Rankings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupAwards.map((group, index) => (
                            <motion.div
                                key={group.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-6 rounded-3xl border flex items-center gap-5",
                                    theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                                )}
                            >
                                <img 
                                    src={convertDriveLink(group.image)} 
                                    alt={group.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                                    onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${group.name}&background=random`}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-lg truncate">{group.name}</p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                        {group.awardCount} Awards
                                    </p>
                                </div>
                                <div className="text-3xl font-black text-brand-purple">
                                    #{index + 1}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                </>
            )}
        </div>
    );
}