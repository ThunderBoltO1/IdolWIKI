import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmButtonClass, singleButton = false, type = 'danger' }) {
    const { theme } = useTheme();

    if (!isOpen) return null;

    let Icon = AlertTriangle;
    let iconClass = "bg-red-500/10 text-red-500";
    
    if (type === 'success') {
        Icon = CheckCircle2;
        iconClass = "bg-green-500/10 text-green-500";
    } else if (type === 'info') {
        Icon = Info;
        iconClass = "bg-blue-500/10 text-blue-500";
    }

    useEffect(() => {
        if (isOpen) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => {});
        }
    }, [isOpen]);

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
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className={cn(
                        "relative w-full max-w-md p-6 rounded-3xl shadow-2xl border overflow-hidden",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className={cn("p-4 rounded-full", iconClass)}>
                            <Icon size={32} />
                        </div>
                        <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>
                            {title}
                        </h3>
                        <p className={cn("text-sm font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                            {message}
                        </p>
                        
                        <div className="flex gap-3 w-full mt-4">
                            {!singleButton && (
                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                        theme === 'dark' ? "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => { if (onConfirm) onConfirm(); onClose(); }}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors",
                                    confirmButtonClass || (type === 'danger' ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20" : "bg-brand-pink text-white hover:bg-brand-pink/90 shadow-lg shadow-brand-pink/20")
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