import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmButtonClass }) {
    const { theme } = useTheme();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={cn(
                        "relative w-full max-w-md p-6 rounded-3xl shadow-2xl border overflow-hidden",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            {title}
                        </h3>
                        <p className={cn("text-sm font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                            {message}
                        </p>
                        
                        <div className="flex gap-3 w-full mt-4">
                            <button
                                onClick={onClose}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                    theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onConfirm(); onClose(); }}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                    confirmButtonClass || "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
                                )}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}