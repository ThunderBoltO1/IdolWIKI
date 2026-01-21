import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User, Star, LayoutDashboard, Users as UsersIcon, LogOut, Flag, Trophy, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';

export function UserDropdown({ user, isAdmin, onProfileClick, onEditProfileClick, onFavoritesClick, onDashboardClick, onManageUsersClick, onManageReportsClick, onManageAwardsClick, onAuditLogsClick, onLogoutRequest }) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuItems = [
        { label: 'Profile', icon: User, action: onProfileClick, admin: false },
        { label: 'Edit Profile', icon: Settings, action: onEditProfileClick, admin: false },
        { label: 'Favorites', icon: Star, action: onFavoritesClick, admin: false },
        { label: 'Dashboard', icon: LayoutDashboard, action: onDashboardClick, admin: true },
        { label: 'Manage Users', icon: UsersIcon, action: onManageUsersClick, admin: true },
        { label: 'Manage Reports', icon: Flag, action: onManageReportsClick, admin: true },
        { label: 'Manage Awards', icon: Trophy, action: onManageAwardsClick, admin: true },
        { label: 'Audit Logs', icon: History, action: onAuditLogsClick, admin: true },
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="block hover:scale-110 transition-transform active:scale-100 focus:outline-none">
                <img
                    src={convertDriveLink(user.avatar)}
                    alt={user.name}
                    className={cn(
                        "w-9 h-9 rounded-full border object-cover shadow-sm",
                        theme === 'dark' ? "border-white/20" : "border-slate-200"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={cn(
                            "absolute right-0 mt-4 w-64 rounded-3xl shadow-2xl border overflow-hidden z-10",
                            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"
                        )}
                    >
                        <div className={cn("p-4 border-b", theme === 'dark' ? "border-white/5" : "border-slate-100")}>
                            <p className={cn("text-sm font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{user.name}</p>
                            <p className="text-xs text-brand-pink uppercase font-black tracking-widest">{user.role}</p>
                        </div>
                        <div className="p-2">
                            {menuItems.map(item => {
                                if (item.admin && !isAdmin) return null;
                                if (!item.action) return null;
                                return (
                                    <button key={item.label} onClick={() => { item.action(); setIsOpen(false); }} className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors", theme === 'dark' ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-700")}>
                                        <item.icon size={16} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className={cn("p-2 border-t", theme === 'dark' ? "border-white/5" : "border-slate-100")}>
                            <button onClick={() => { onLogoutRequest(); setIsOpen(false); }} className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors", theme === 'dark' ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-500")}>
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}