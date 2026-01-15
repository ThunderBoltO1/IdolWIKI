import React, { useState } from 'react';
import { Sparkles, Sun, Moon, Clock, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { FriendDropdown } from './FriendDropdown';
import { AddMenu } from './AddMenu';
import { UserDropdown } from './UserDropdown';

export function Navbar({ onAddClick, onAddGroupClick, onLoginClick, onProfileClick, onEditProfileClick, onHomeClick, onFavoritesClick, onNotificationClick, onManageUsersClick, onDashboardClick, searchTerm, onSearchChange, onLogoutRequest }) {
    const { user, isAdmin } = useAuth();
    const { theme, themeMode, toggleTheme } = useTheme();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
                    <div className="p-2 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-lg shadow-lg shadow-brand-pink/20 transition-transform group-hover:scale-110">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <span className={cn(
                        "text-xl font-bold tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>
                        K-Pop<span className="text-brand-pink">DB</span>
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

                <div className="flex items-center gap-1 sm:gap-4 shrink-0">
                    {/* Mobile Search Button */}
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className={cn(
                            "p-2.5 rounded-full transition-all duration-300 active:scale-95 md:hidden",
                            theme === 'dark'
                                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                        )}
                        aria-label="Search"
                        title="Search"
                    >
                        <Search size={20} />
                    </button>
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
                        "h-6 w-px mx-1 sm:mx-2",
                        theme === 'dark' ? "bg-white/10" : "bg-slate-200"
                    )} />

                    {user ? (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <NotificationDropdown onNotificationClick={onNotificationClick} />
                            <FriendDropdown />

                            {isAdmin && <AddMenu onAddClick={onAddClick} onAddGroupClick={onAddGroupClick} />}

                            <UserDropdown
                                user={user}
                                isAdmin={isAdmin}
                                onProfileClick={onProfileClick}
                                onEditProfileClick={onEditProfileClick}
                                onFavoritesClick={onFavoritesClick}
                                onDashboardClick={onDashboardClick}
                                onManageUsersClick={onManageUsersClick}
                                onLogoutRequest={onLogoutRequest}
                            />
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
            <AnimatePresence>
                {isMobileSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={cn(
                            "absolute top-0 left-0 right-0 h-16 px-4 flex items-center gap-2 md:hidden z-50",
                            theme === 'dark' ? "bg-slate-900 border-b border-white/10" : "bg-white border-b border-slate-200"
                        )}
                    >
                        <div className="relative w-full">
                            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", theme === 'dark' ? "text-slate-500" : "text-slate-400")} />
                            <input
                                type="text"
                                placeholder="Search groups or idols..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                autoFocus
                                className={cn(
                                    "w-full pl-10 pr-4 py-2 rounded-full transition-all focus:outline-none border text-sm font-medium",
                                    theme === 'dark'
                                        ? "bg-slate-800 border-white/10 focus:border-brand-pink text-white placeholder-slate-500"
                                        : "bg-slate-100 border-slate-200 focus:border-brand-pink text-slate-900 placeholder-slate-400"
                                )}
                            />
                        </div>
                        <button
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="p-2 rounded-full"
                            title="Close search"
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
