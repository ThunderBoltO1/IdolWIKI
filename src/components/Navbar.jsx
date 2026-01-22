import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Sun, Moon, Clock, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { convertDriveLink } from '../lib/storage';
import { cn } from '../lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { FriendDropdown } from './FriendDropdown';
import { AddMenu } from './AddMenu';
import { UserDropdown } from './UserDropdown';

export function Navbar({ onAddClick, onAddGroupClick, onLoginClick, onProfileClick, onEditProfileClick, onHomeClick, onFavoritesClick, onNotificationClick, onManageUsersClick, onManageReportsClick, onDashboardClick, searchTerm, onSearchChange, onLogoutRequest }) {
    const { user, isAdmin } = useAuth();
    const { theme, themeMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    return (
        <nav className={cn(
            "sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300",
            theme === 'dark'
                ? "border-white/10 bg-slate-950/80"
                : "border-slate-200 bg-white/80 shadow-sm"
        )}>
            <div className="container mx-auto px-4 h-16 flex justify-between items-center gap-2 md:gap-4">
                <button
                    type="button"
                    className="flex items-center gap-2 cursor-pointer group shrink-0"
                    onClick={onHomeClick}
                    aria-label="Go to home"
                >
                    <img src="https://firebasestorage.googleapis.com/v0/b/idolwiki-490f9.firebasestorage.app/o/Idolwiki-2.png?alt=media" alt="IdolWiki Logo" className="w-8 h-8 object-contain" />
                    <span className={cn(
                        "text-lg md:text-xl font-bold tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>
                        K-Pop<span className="text-brand-pink">WIKI</span>
                    </span>
                </button>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl hidden md:block">
                    <div className="relative">
                        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", theme === 'dark' ? "text-slate-500" : "text-slate-400")} />
                        <input
                            type="text"
                            placeholder="Search groups or idols..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className={cn(
                                "w-full pl-10 pr-4 py-2 rounded-full transition-all focus:outline-none border text-sm font-medium",
                                theme === 'dark'
                                    ? "bg-slate-900/50 border-white/10 focus:border-brand-pink text-white placeholder-slate-500"
                                    : "bg-slate-100 border-transparent focus:border-brand-pink text-slate-900 placeholder-slate-400"
                            )}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "p-2.5 rounded-full transition-all duration-300 active:scale-95",
                            theme === 'dark'
                                ? "bg-slate-900 text-yellow-400 hover:bg-slate-800 border border-white/5"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        )}
                        aria-label="Toggle theme"
                        title={`Current Mode: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`}
                    >
                        {themeMode === 'light' && <Sun size={20} />}
                        {themeMode === 'dark' && <Moon size={20} />}
                        {themeMode === 'auto' && <Clock size={20} className={theme === 'dark' ? "text-blue-400" : "text-slate-600"} />}
                    </button>

                    <div className={cn(
                        "h-6 w-px",
                        theme === 'dark' ? "bg-white/10" : "bg-slate-200"
                    )} />

                    {user ? (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <NotificationDropdown onNotificationClick={onNotificationClick} />
                            <FriendDropdown />

                            <AddMenu onAddClick={onAddClick} onAddGroupClick={onAddGroupClick} />

                            {/* Add a wrapper with min-w-0 to allow the UserDropdown to shrink if the username is too long */}
                            <div className="min-w-0">
                                <UserDropdown
                                    user={{
                                        ...user,
                                        avatar: convertDriveLink(user.avatar) // Ensure avatar URL is converted
                                    }}
                                    isAdmin={isAdmin}
                                    onProfileClick={onProfileClick}
                                    onEditProfileClick={onEditProfileClick}
                                    onFavoritesClick={onFavoritesClick}
                                    onDashboardClick={onDashboardClick}
                                    onManageUsersClick={onManageUsersClick}
                                    onManageReportsClick={onManageReportsClick}
                                    onManageAwardsClick={() => navigate('/admin/awards')}
                                    onAuditLogsClick={() => navigate('/admin/audit-logs')}
                                    onLogoutRequest={onLogoutRequest}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="px-6 py-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-brand-purple/20 active:scale-95"
                        >
                            Log In
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
