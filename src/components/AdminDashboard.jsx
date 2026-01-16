import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, getCountFromServer, query, where, orderBy, limit, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Music2, MessageSquare, Star, ArrowLeft, LayoutDashboard, Building2, Loader2, AlertCircle, Trophy, Activity, TrendingUp, Heart, Crown, RotateCcw, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';

export function AdminDashboard({ onBack }) {
    const { isAdmin } = useAuth();
    const { theme } = useTheme();
    const [stats, setStats] = useState({
        users: 0,
        dailyActiveUsers: 0,
        onlineUsers: 0,
        idols: 0,
        groups: 0,
        comments: 0
    });
    const [groupAwards, setGroupAwards] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [topIdols, setTopIdols] = useState([]);
    const [topGroups, setTopGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);

    // Real-time listener for online users
    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, 'users'), where('isOnline', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStats(prev => ({
                ...prev,
                onlineUsers: snapshot.size
            }));
        });

        return () => unsubscribe();
    }, [isAdmin]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setError(null);
    
                // --- WAU & DAU Calculation ---
                const weeklyDataPoints = [];
                const dailyActiveUsersMap = new Map();
                const todayKey = new Date().toLocaleDateString('en-CA');
    
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayKey = d.toLocaleDateString('en-CA');
                    weeklyDataPoints.push({
                        date: d,
                        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
                        users: 0
                    });
                    dailyActiveUsersMap.set(dayKey, new Set());
                }
    
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);
    
                const activityQuery = query(collection(db, 'activityLogs'), where('timestamp', '>=', sevenDaysAgo));
                const topIdolsQuery = query(collection(db, 'idols'), orderBy('likes', 'desc'), limit(5));
                const topGroupsQuery = query(collection(db, 'groups'), orderBy('favorites', 'desc'), limit(5));
    
                // Fetch other counts and activity logs
                const [usersSnap, idolsSnap, groupsSnap, commentsSnap, topIdolsSnap, topGroupsSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users')),
                    getCountFromServer(collection(db, 'idols')),
                    getDocs(collection(db, 'groups')),
                    getCountFromServer(collection(db, 'comments')),
                    getDocs(topIdolsQuery),
                    getDocs(topGroupsQuery)
                ]);

                let activitySnap = { docs: [] };
                try {
                    activitySnap = await getDocs(activityQuery);
                } catch (e) {
                    console.warn("Could not fetch activity logs (likely missing rules/indexes):", e);
                }
    
                activitySnap.docs.forEach(doc => {
                    const log = doc.data();
                    if (log.timestamp) {
                        const logDate = log.timestamp.toDate();
                        const dayKey = logDate.toLocaleDateString('en-CA');
                        if (dailyActiveUsersMap.has(dayKey)) {
                            dailyActiveUsersMap.get(dayKey).add(log.userId);
                        }
                    }
                });
    
                weeklyDataPoints.forEach(point => {
                    const dayKey = point.date.toLocaleDateString('en-CA');
                    point.users = dailyActiveUsersMap.get(dayKey)?.size || 0;
                });
                
                setWeeklyData(weeklyDataPoints);
                const dailyActiveUsersCount = dailyActiveUsersMap.get(todayKey)?.size || 0;

                const topIdolsData = topIdolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTopIdols(topIdolsData);

                const topGroupsData = topGroupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTopGroups(topGroupsData);
    
                const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const awardsData = groupsData
                    .map(group => ({
                        name: group.name,
                        awardCount: group.awards?.length || 0,
                        image: group.image,
                    }))
                    .sort((a, b) => b.awardCount - a.awardCount);
                setGroupAwards(awardsData);

                setStats(prev => ({
                    ...prev,
                    users: usersSnap.data().count,
                    dailyActiveUsers: dailyActiveUsersCount,
                    idols: idolsSnap.data().count,
                    groups: groupsSnap.size,
                    comments: commentsSnap.data().count
                }));
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

    useEffect(() => {
        if (isAdmin) {
            const fetchLogs = async () => {
                try {
                    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50));
                    const snapshot = await getDocs(q);
                    setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch (e) {
                    console.error("Failed to fetch audit logs", e);
                } finally {
                    setLogsLoading(false);
                }
            };
            fetchLogs();
        }
    }, [isAdmin]);

    const handleResetAllLikes = async () => {
        if (!window.confirm("⚠️ WARNING: This will reset the 'likes' count for ALL idols to 0.\n\nAre you sure you want to continue?")) return;
        
        setLoading(true);
        try {
            const idolsSnapshot = await getDocs(collection(db, 'idols'));
            const docs = idolsSnapshot.docs;
            const chunks = [];

            // Batch operations (limit 500 per batch)
            for (let i = 0; i < docs.length; i += 500) {
                chunks.push(docs.slice(i, i + 500));
            }

            let totalReset = 0;
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.update(doc.ref, { likes: 0 });
                });
                await batch.commit();
                totalReset += chunk.length;
            }
            
            alert(`Successfully reset likes for ${totalReset} idols.`);
            window.location.reload();
        } catch (error) {
            console.error("Error resetting likes:", error);
            setError("Failed to reset likes: " + error.message);
            setLoading(false);
        }
    };

    const handleResetAllFavorites = async () => {
        if (!window.confirm("⚠️ WARNING: This will reset the 'favorites' count for ALL groups to 0.\n\nAre you sure you want to continue?")) return;
        
        setLoading(true);
        try {
            const groupsSnapshot = await getDocs(collection(db, 'groups'));
            const docs = groupsSnapshot.docs;
            const chunks = [];

            // Batch operations (limit 500 per batch)
            for (let i = 0; i < docs.length; i += 500) {
                chunks.push(docs.slice(i, i + 500));
            }

            let totalReset = 0;
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.update(doc.ref, { favorites: 0 });
                });
                await batch.commit();
                totalReset += chunk.length;
            }
            
            alert(`Successfully reset favorites for ${totalReset} groups.`);
            window.location.reload();
        } catch (error) {
            console.error("Error resetting favorites:", error);
            setError("Failed to reset favorites: " + error.message);
            setLoading(false);
        }
    };

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Access Denied: Admin privileges required.</div>;

    const statCards = [
        { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Daily Active', value: stats.dailyActiveUsers, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Online Users', value: stats.onlineUsers, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
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
                        <TrendingUp className="text-orange-500" />
                        Weekly Active Users
                    </h2>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={cn(
                            "p-6 rounded-3xl border h-80",
                            theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                        )}
                    >
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                            Please install 'recharts' to view this graph
                        </div>
                    </motion.div>
                </div>

                <div className="mt-16">
                    <h2 className={cn("text-2xl font-black mb-6 flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        <Heart className="text-brand-pink" />
                        Top 5 Most Loved Idols
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {topIdols.map((idol, index) => (
                            <motion.div
                                key={idol.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4 rounded-3xl border flex flex-col items-center gap-4 text-center relative overflow-hidden",
                                    theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                                    index === 0 ? "bg-yellow-400 text-yellow-900" : 
                                    index === 1 ? "bg-slate-300 text-slate-900" :
                                    index === 2 ? "bg-amber-600 text-amber-100" :
                                    theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                )}>
                                    #{index + 1}
                                </div>

                                <img 
                                    src={convertDriveLink(idol.image)} 
                                    alt={idol.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white/10 shadow-lg"
                                    onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${idol.name}&background=random`}
                                />
                                
                                <div className="min-w-0 w-full">
                                    <p className={cn("font-black text-lg truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{idol.name}</p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 truncate">
                                        {idol.group || 'Soloist'}
                                    </p>
                                </div>
                                
                                <div className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2",
                                    theme === 'dark' ? "bg-brand-pink/10 text-brand-pink" : "bg-brand-pink/5 text-brand-pink"
                                )}>
                                    <Heart size={14} fill="currentColor" />
                                    {(idol.likes || 0).toLocaleString()}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="mt-16">
                    <h2 className={cn("text-2xl font-black mb-6 flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        <Crown className="text-yellow-500" />
                        Top 5 Most Favorited Groups
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {topGroups.map((group, index) => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4 rounded-3xl border flex flex-col items-center gap-4 text-center relative overflow-hidden",
                                    theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                                    index === 0 ? "bg-yellow-400 text-yellow-900" : 
                                    index === 1 ? "bg-slate-300 text-slate-900" :
                                    index === 2 ? "bg-amber-600 text-amber-100" :
                                    theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                )}>
                                    #{index + 1}
                                </div>

                                <img 
                                    src={convertDriveLink(group.image)} 
                                    alt={group.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white/10 shadow-lg"
                                    onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${group.name}&background=random`}
                                />
                                
                                <div className="min-w-0 w-full">
                                    <p className={cn("font-black text-lg truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{group.name}</p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 truncate">
                                        {group.company || 'Unknown'}
                                    </p>
                                </div>
                                
                                <div className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2",
                                    theme === 'dark' ? "bg-yellow-500/10 text-yellow-500" : "bg-yellow-500/5 text-yellow-600"
                                )}>
                                    <Star size={14} fill="currentColor" />
                                    {(group.favorites || 0).toLocaleString()}
                                </div>
                            </motion.div>
                        ))}
                    </div>
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

                <div className="mt-16">
                    <h2 className={cn("text-2xl font-black mb-6 flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                        <History className="text-blue-500" />
                        System Audit Logs
                    </h2>
                    <div className={cn(
                        "rounded-3xl border overflow-hidden",
                        theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-lg shadow-slate-200/50"
                    )}>
                        {logsLoading ? (
                            <div className="p-10 flex justify-center">
                                <Loader2 className="animate-spin text-brand-pink" size={32} />
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 font-medium">No audit logs found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className={cn(
                                        "border-b font-black uppercase tracking-wider text-xs",
                                        theme === 'dark' ? "border-white/10 text-slate-400 bg-white/5" : "border-slate-100 text-slate-500 bg-slate-50"
                                    )}>
                                        <tr>
                                            <th className="p-4">Time</th>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Action</th>
                                            <th className="p-4">Target</th>
                                            <th className="p-4">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-slate-100")}>
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className={cn("transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                                <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                                                    {log.createdAt?.toMillis ? new Date(log.createdAt.toMillis()).toLocaleString() : 'Unknown'}
                                                </td>
                                                <td className={cn("p-4 font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                    {log.userName || 'Unknown'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                                        log.action === 'create' ? "bg-green-500/10 text-green-500" : 
                                                        log.action === 'update' ? "bg-blue-500/10 text-blue-500" : 
                                                        log.action === 'delete' ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500"
                                                    )}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium">
                                                    <span className="capitalize opacity-70">{log.targetType}</span>: {log.targetId}
                                                </td>
                                                <td className="p-4 max-w-xs truncate text-slate-500 font-mono text-xs">
                                                    {JSON.stringify(log.changes)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-16 mb-8 p-6 rounded-3xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
                    <h2 className="text-xl font-black text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                        <AlertCircle size={24} /> Danger Zone
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        These actions are destructive and cannot be undone. Please be certain before proceeding.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleResetAllLikes}
                            className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                        >
                            <RotateCcw size={16} /> Reset All Idol Likes
                        </button>
                        <button
                            onClick={handleResetAllFavorites}
                            className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                        >
                            <RotateCcw size={16} /> Reset All Group Favorites
                        </button>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}