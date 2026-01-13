import React from 'react';
import { Sparkles, Plus, LogOut, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function Navbar({ onAddClick, onLoginClick, onProfileClick, onHomeClick }) {
    const { user, logout, isAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className={cn(
            "sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300",
            theme === 'dark'
                ? "border-white/10 bg-slate-950/80"
                : "border-slate-200 bg-white/80 shadow-sm"
        )}>
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                <div
                    className="flex items-center gap-2 cursor-pointer group"
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

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "p-2.5 rounded-full transition-all duration-300 active:scale-95",
                            theme === 'dark'
                                ? "bg-slate-900 text-yellow-400 hover:bg-slate-800 border border-white/5"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        )}
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className={cn(
                        "h-6 w-px mx-1 sm:mx-2",
                        theme === 'dark' ? "bg-white/10" : "bg-slate-200"
                    )} />

                    {user ? (
                        <div className="flex items-center gap-4">
                            {isAdmin && (
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
                                    src={user.avatar}
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
