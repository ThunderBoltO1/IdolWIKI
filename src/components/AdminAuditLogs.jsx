import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, ArrowLeft, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { BackgroundShapes } from './BackgroundShapes';

export function AdminAuditLogs({ onBack }) {
    const { isAdmin } = useAuth();
    const { theme } = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdmin) {
            const fetchLogs = async () => {
                try {
                    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(100));
                    const snapshot = await getDocs(q);

                    const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Extract unique User IDs
                    const userIds = [...new Set(logsData.map(log => log.user?.uid).filter(Boolean))];

                    // Fetch Users
                    const userMap = {};
                    if (userIds.length > 0) {
                        try {
                            await Promise.all(userIds.map(async (uid) => {
                                try {
                                    // Try to fetch by document ID
                                    const userDocRef = doc(db, 'users', uid);
                                    const userDocSnap = await getDoc(userDocRef);

                                    if (userDocSnap.exists()) {
                                        userMap[uid] = userDocSnap.data();
                                    }
                                } catch (e) {
                                    console.warn("Failed to fetch user", uid);
                                }
                            }));
                        } catch (err) {
                            console.error("Batch fetch error", err);
                        }
                    }

                    // Merge user data
                    const logsWithUsers = logsData.map(log => ({
                        ...log,
                        userInfo: log.user?.uid ? userMap[log.user.uid] : null
                    }));

                    setLogs(logsWithUsers);
                } catch (e) {
                    console.error("Failed to fetch audit logs", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchLogs();
        }
    }, [isAdmin]);

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;

    const formatValue = (val) => {
        if (val === null || val === undefined) return <span className="text-slate-400 italic">null</span>;
        if (typeof val === 'boolean') return val ? 'True' : 'False';
        if (Array.isArray(val)) return `[${val.length} items]`;
        if (typeof val === 'object') return '{...}';
        return String(val);
    };

    const renderDetails = (log) => {
        // Handle 'Update' with specific changes
        const changes = log.details?.changes || log.changes;

        if (log.action === 'update' && changes) {
            return (
                <div className="flex flex-col gap-2">
                    {Object.entries(changes).map(([key, change]) => {
                        // Check if it's the expected {from, to} structure
                        if (change && typeof change === 'object' && ('from' in change || 'to' in change || 'old' in change || 'new' in change)) {
                            const oldVal = change.from ?? change.old;
                            const newVal = change.to ?? change.new;

                            return (
                                <div key={key} className={cn(
                                    "text-xs p-2 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2",
                                    theme === 'dark' ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                                )}>
                                    <span className="font-bold min-w-[80px] text-slate-500 uppercase text-[10px] tracking-wider truncate" title={key}>{key}</span>
                                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                                        <span className="line-through opacity-50 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] break-all">
                                            {formatValue(oldVal)}
                                        </span>
                                        <span className="opacity-40">→</span>
                                        <span className="font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 text-[10px] break-all">
                                            {formatValue(newVal)}
                                        </span>
                                    </div>
                                </div>
                            );
                        }
                        // Fallback for simple key-value updates or unknown structure
                        return (
                            <div key={key} className="text-xs text-slate-500">
                                <span className="font-bold">{key}:</span> {formatValue(change)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        // Handle 'Create'
        if (log.action === 'create') {
            const data = log.details || {};
            // If details is just { name: "..." }
            if (data.name) {
                return (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/5 text-green-500 border border-green-500/10 text-xs">
                        <span className="opacity-70">Saved as:</span>
                        <span className="font-bold">{data.name}</span>
                    </div>
                );
            }
        }

        // Default or Fallback
        const content = log.details || log.changes;
        if (!content || Object.keys(content).length === 0) return <span className="text-slate-400 text-xs italic">No additional details</span>;

        return (
            <code className={cn(
                "block text-[10px] p-2 rounded overflow-auto max-h-20 w-fit sm:max-w-xs",
                theme === 'dark' ? "bg-black/30 text-white/70" : "bg-slate-100 text-slate-600"
            )}>
                {JSON.stringify(content, null, 2)}
            </code>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
            <BackgroundShapes />
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={cn("text-2xl md:text-3xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                    <History className="text-brand-pink" />
                    Audit Logs
                </h1>
            </div>

            <div className={cn(
                "rounded-[32px] border overflow-hidden",
                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-sm"
            )}>
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="animate-spin text-brand-pink" size={32} />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 font-medium">No audit logs found.</div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className={cn(
                                "border-b font-black uppercase tracking-wider text-xs",
                                theme === 'dark' ? "border-white/10 text-slate-400 bg-white/5" : "border-slate-100 text-slate-500 bg-slate-50"
                            )}>
                                <tr>
                                    <th className="p-4 w-40">Time</th>
                                    <th className="p-4 w-32">User</th>
                                    <th className="p-4 w-24">Action</th>
                                    <th className="p-4 w-40">Target</th>
                                    <th className="p-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-slate-100")}>
                                {logs.map(log => {
                                    const userDisplay = log.userInfo || {};
                                    // Use fetched avatar OR logged avatar OR fallback
                                    const avatar = userDisplay.avatar || log.userAvatar;
                                    // Use fetched name OR logged name OR fallback
                                    const name = userDisplay.username || userDisplay.name || log.userName || 'Unknown';

                                    return (
                                        <tr key={log.id} className={cn("transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                            <td className="p-4 align-top whitespace-nowrap text-slate-500 font-medium text-xs">
                                                {log.createdAt?.toMillis ? new Date(log.createdAt.toMillis()).toLocaleString() : 'Unknown'}
                                            </td>
                                            <td className={cn("p-4 align-top font-bold text-xs", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                <div className="flex items-center gap-2">
                                                    {avatar ? (
                                                        <img
                                                            src={avatar}
                                                            alt={name}
                                                            className="w-6 h-6 rounded-full object-cover border border-white/10 shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-linear-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-[10px] text-white">
                                                            {name[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="truncate max-w-[100px]" title={name}>{name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block",
                                                    log.action === 'create' ? "bg-green-500/10 text-green-500" :
                                                        log.action === 'update' ? "bg-blue-500/10 text-blue-500" :
                                                            log.action === 'delete' ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500"
                                                )}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 align-top font-medium text-xs">
                                                <div className="flex flex-col">
                                                    <span className="opacity-50 uppercase text-[10px]">{log.targetType}</span>
                                                    <span className="truncate max-w-[150px]" title={log.targetId}>{log.targetId}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                {renderDetails(log)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
