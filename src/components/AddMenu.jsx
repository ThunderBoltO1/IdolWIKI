import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function AddMenu({ onAddClick, onAddGroupClick }) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "hidden sm:flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold active:scale-95",
                    theme === 'dark'
                        ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                )}
            >
                <Plus size={16} />
                <span>Add New</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={cn(
                            "absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl border overflow-hidden z-10",
                            theme === 'dark' ? "bg-slate-800 border-white/10" : "bg-white border-slate-100"
                        )}
                    >
                        <button onClick={() => { onAddGroupClick(); setIsOpen(false); }} className={cn("w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors", theme === 'dark' ? "hover:bg-white/5 text-white" : "hover:bg-slate-50 text-slate-800")}>
                            <Users size={16} className="text-brand-pink" />
                            <span>Group</span>
                        </button>
                        <button onClick={() => { onAddClick(); setIsOpen(false); }} className={cn("w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors", theme === 'dark' ? "hover:bg-white/5 text-white" : "hover:bg-slate-50 text-slate-800")}>
                            <User size={16} className="text-brand-purple" />
                            <span>Idol</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}