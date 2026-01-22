import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, AlertCircle, Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function NotificationDropdown({ onNotificationClick }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        let isInitialLoad = true;

        const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid || user.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(notifs);

            if (!isInitialLoad) {
                const hasNew = snapshot.docChanges().some(change => change.type === 'added');
                if (hasNew) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.error('Audio play failed', e));
                }
            }
            isInitialLoad = false;
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const groupedNotifications = useMemo(() => {
        const groups = {};
        const result = [];

        notifications.forEach(n => {
            if (['like', 'like_comment'].includes(n.type)) {
                const key = `${n.type}_${n.targetId || n.commentId}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(n);
            } else {
                result.push(n);
            }
        });

        Object.values(groups).forEach(group => {
            if (group.length === 1) {
                result.push(group[0]);
            } else {
                const latest = group[0];
                result.push({
                    ...latest,
                    isGrouped: true,
                    count: group.length,
                    id: `grouped_${latest.id}_${group.length}`,
                    originalIds: group.map(n => n.id),
                    read: group.every(n => n.read)
                });
            }
        });

        return result.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    }, [notifications]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        const batch = writeBatch(db);
        notifications.forEach(n => {
            if (!n.read) {
                const ref = doc(db, 'notifications', n.id);
                batch.update(ref, { read: true });
            }
        });
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleDeleteNotification = async (e, notification) => {
        e.stopPropagation();
        try {
            if (notification.isGrouped) {
                const batch = writeBatch(db);
                notification.originalIds.forEach(id => {
                    const ref = doc(db, 'notifications', id);
                    batch.delete(ref);
                });
                await batch.commit();
            } else {
                await deleteDoc(doc(db, 'notifications', notification.id));
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    const handleClick = async (notification) => {
        if (notification.isGrouped) {
            if (!notification.read) {
                const batch = writeBatch(db);
                notification.originalIds.forEach(id => {
                    const ref = doc(db, 'notifications', id);
                    batch.update(ref, { read: true });
                });
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error marking grouped notifications as read:", error);
                }
            }
        } else if (!notification.read) {
            handleMarkAsRead(notification.id);
        }
        setIsOpen(false);
        if (onNotificationClick) {
            onNotificationClick(notification);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-2.5 rounded-full transition-all duration-300 active:scale-95 relative",
                    theme === 'dark'
                        ? "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            "absolute right-0 mt-4 w-80 md:w-96 rounded-3xl shadow-2xl border overflow-hidden z-50",
                            theme === 'dark'
                                ? "bg-slate-900 border-white/10"
                                : "bg-white border-slate-100"
                        )}
                    >
                        <div className={cn(
                            "p-4 border-b flex items-center justify-between",
                            theme === 'dark' ? "border-white/5 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"
                        )}>
                            <h3 className={cn("font-black text-sm uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs font-bold text-brand-pink hover:underline flex items-center gap-1"
                                >
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {groupedNotifications.length === 0 ? (
                                <div className="p-8 text-center"> 
                                    <Bell size={32} className="mx-auto mb-3 text-slate-300 opacity-50" />
                                    <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                                </div>
                            ) : (
                                groupedNotifications.map(notification => (
                                    notification.isGrouped ? (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleClick(notification)}
                                            className={cn(
                                                "p-4 border-b last:border-0 cursor-pointer transition-colors flex gap-3 items-start group",
                                                theme === 'dark'
                                                    ? "border-white/5 hover:bg-white/5"
                                                    : "border-slate-100 hover:bg-slate-50",
                                                !notification.read && (theme === 'dark' ? "bg-brand-pink/5" : "bg-brand-pink/5")
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center border",
                                                    theme === 'dark' ? "bg-brand-pink/10 border-brand-pink/20 text-brand-pink" : "bg-brand-pink/10 border-brand-pink/20 text-brand-pink"
                                                )}>
                                                    <Heart size={20} fill="currentColor" />
                                                </div>
                                                {!notification.read && (
                                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-slate-900" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-xs leading-relaxed", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                                                    <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                        {notification.count} users
                                                    </span>
                                                    {" liked your comment"}
                                                </p>
                                                <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider">
                                                    {getRelativeTime(notification.createdAt?.toMillis())}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteNotification(e, notification)}
                                                className={cn(
                                                    "p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shrink-0",
                                                    theme === 'dark' ? "text-slate-500 hover:text-red-400 hover:bg-white/10" : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                                                )}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : ['admin_alert', 'system', 'friend_accepted', 'admin_message'].includes(notification.type) ? (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleClick(notification)}
                                        className={cn(
                                            "p-4 border-b last:border-0 cursor-pointer transition-colors flex gap-3 items-start group",
                                            theme === 'dark'
                                                ? "border-white/5 hover:bg-white/5"
                                                : "border-slate-100 hover:bg-slate-50",
                                            !notification.read && (theme === 'dark' ? "bg-brand-pink/5" : "bg-brand-pink/5")
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border",
                                                theme === 'dark' ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple" : "bg-brand-purple/10 border-brand-purple/20 text-brand-purple"
                                            )}>
                                                <AlertCircle size={20} />
                                            </div>
                                            {!notification.read && (
                                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-slate-900" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                {notification.title || notification.senderName || 'Notification'}
                                            </p>
                                            <p className={cn("text-xs mt-1 font-medium opacity-70 leading-relaxed", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                                {notification.message || notification.text}
                                            </p>
                                            <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider">
                                                {getRelativeTime(notification.createdAt?.toMillis())}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteNotification(e, notification)}
                                            className={cn(
                                                "p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shrink-0",
                                                theme === 'dark' ? "text-slate-500 hover:text-red-400 hover:bg-white/10" : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                                            )}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    ) : (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleClick(notification)}
                                        className={cn(
                                            "p-4 border-b last:border-0 cursor-pointer transition-colors flex gap-3 items-start group",
                                            theme === 'dark'
                                                ? "border-white/5 hover:bg-white/5"
                                                : "border-slate-100 hover:bg-slate-50",
                                            !notification.read && (theme === 'dark' ? "bg-brand-pink/5" : "bg-brand-pink/5")
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <img
                                                src={convertDriveLink(notification.senderAvatar) || `https://ui-avatars.com/api/?name=${notification.senderName}&background=random`}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover border border-white/10"
                                            />
                                            {!notification.read && (
                                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-slate-900" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-xs leading-relaxed", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                                                <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                    {notification.senderName}
                                                </span>
                                                {" mentioned you in "}
                                                <span className="font-bold text-brand-pink">
                                                    {notification.targetName}
                                                </span>
                                            </p>
                                            <p className={cn("text-xs mt-1 font-medium truncate opacity-70", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                                "{notification.text}"
                                            </p>
                                            <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider">
                                                {getRelativeTime(notification.createdAt?.toMillis())}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteNotification(e, notification)}
                                            className={cn(
                                                "p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shrink-0",
                                                theme === 'dark' ? "text-slate-500 hover:text-red-400 hover:bg-white/10" : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                                            )}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    )
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function getRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}