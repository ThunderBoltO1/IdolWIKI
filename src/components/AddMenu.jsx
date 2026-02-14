import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, User, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function AddMenu({ onAddClick, onAddGroupClick, onAddCompanyClick }) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        // Use mousedown instead of click to handle outside clicks correctly
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                    theme === 'dark'
                        ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                )}
            >
                <Plus size={16} />
                <span className="hidden sm:inline">Add New</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl border overflow-hidden z-50",
                            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"
                        )}
                    >
                        <div className="p-1">
                            <button
                                onClick={() => {
                                    onAddGroupClick();
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                                    theme === 'dark' ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                                )}
                            >
                                <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500">
                                    <Users size={16} />
                                </div>
                                Group
                            </button>

                            <button
                                onClick={() => {
                                    onAddClick();
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                                    theme === 'dark' ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                                )}
                            >
                                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                                    <User size={16} />
                                </div>
                                Idol
                            </button>

                            <button
                                onClick={() => {
                                    onAddCompanyClick();
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                                    theme === 'dark' ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                                )}
                            >
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Building2 size={16} />
                                </div>
                                Company
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}