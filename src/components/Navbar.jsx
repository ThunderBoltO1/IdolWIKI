import React from 'react';
import { Sparkles, Plus, LogOut, User, Sun, Moon, Users, LayoutDashboard, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { NotificationDropdown } from './NotificationDropdown';

export function Navbar({ onAddClick, onAddGroupClick, onLoginClick, onProfileClick, onHomeClick, onNotificationClick, onManageUsersClick, onDashboardClick, searchTerm, onSearchChange }) {
    const { user, logout, isAdmin } = useAuth();
    const { theme, themeMode, toggleTheme } = useTheme();

    return (
        <nav className={cn(
            "sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300",
            theme === 'dark'
                ? "border-white/10 bg-slate-950/80"
                : "border-slate-200 bg-white/80 shadow-sm"
        )}>
            <div className="container mx-auto px-4 h-16 flex justify-between items-center gap-4">
                <div
                    className="flex items-center gap-2 cursor-pointer group shrink-0"
                    onClick={onHomeClick}
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
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md hidden md:block">
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
                        <div className="flex items-center gap-4">
                            <NotificationDropdown onNotificationClick={onNotificationClick} />

                            {isAdmin && (
                                <>
                                <button
                                    onClick={onDashboardClick}
                                    className={cn(
                                        "hidden sm:flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                                        theme === 'dark'
                                            ? "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    )}
                                    title="Dashboard"
                                >
                                    <LayoutDashboard size={18} />
                                </button>
                                <button
                                    onClick={onManageUsersClick}
                                    className={cn(
                                        "hidden sm:flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                                        theme === 'dark'
                                            ? "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    )}
                                    title="Manage Users"
                                >
                                    <Users size={18} />
                                </button>
                                <button
                                    onClick={onAddGroupClick}
                                    className={cn(
                                        "hidden sm:flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                                        theme === 'dark'
                                            ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                                    )}
                                >
                                    <Plus size={16} />
                                    <span>Add Band</span>
                                </button>
                                <button
                                    onClick={onAddClick}
                                    className={cn(
                                        "hidden sm:flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                                        theme === 'dark'
                                            ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                                    )}
                                >
                                    <Plus size={16} />
                                    <span>Add Idol</span>
                                </button>
                                </>
                            )}

                            <div className="flex items-center gap-3 pl-2 sm:pl-4">
                                <div
                                    className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={onProfileClick}
                                >
                                    <p className={cn(
                                        "text-sm font-bold",
                                        theme === 'dark' ? "text-white" : "text-slate-900"
                                    )}>{user.name}</p>
                                    <p className="text-[10px] text-brand-pink uppercase font-black tracking-widest">{user.role}</p>
                                </div>
                                <img
                                    src={convertDriveLink(user.avatar)}
                                    alt={user.name}
                                    className={cn(
                                        "w-9 h-9 rounded-full border object-cover cursor-pointer hover:scale-110 transition-transform shadow-sm",
                                        theme === 'dark' ? "border-white/20" : "border-slate-200"
                                    )}
                                    onClick={onProfileClick}
                                />
                                <button
                                    onClick={logout}
                                    className={cn(
                                        "p-2 rounded-full transition-colors",
                                        theme === 'dark'
                                            ? "hover:bg-white/10 text-slate-400 hover:text-white"
                                            : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                                    )}
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
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
