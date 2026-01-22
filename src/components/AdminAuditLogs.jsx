import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
                    setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
            <BackgroundShapes />
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={cn("text-3xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
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
                                {logs.map(log => (
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
                                            {JSON.stringify(log.changes || log.details || {})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
