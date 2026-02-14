import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now();
        const toast = {
            id,
            message,
            type,
            onClose: () => removeToast(id)
        };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        info: (message, duration) => addToast(message, 'info', duration),
        toasts
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
};

// Toast Component
const ToastContainer = () => {
    const { toasts } = useToast();

    return createPortal(
        <AnimatePresence mode="wait">
            {toasts.map((toast) => (
                <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                        "fixed z-9999 pointer-events-auto",
                        // Mobile: top-center, full width with padding
                        "top-4 left-4 right-4 max-w-md mx-auto",
                        // Desktop: top-right, fixed position
                        "sm:top-4 sm:right-4 sm:left-auto sm:mx-0",
                        "shadow-xl rounded-2xl overflow-hidden",
                        toast.type === 'success' && "bg-linear-to-r from-emerald-500 to-green-500",
                        toast.type === 'error' && "bg-linear-to-r from-red-500 to-rose-500",
                        toast.type === 'info' && "bg-linear-to-r from-blue-500 to-cyan-500"
                    )}
                >
                    <div className="relative p-3 sm:p-4 flex items-center gap-3">
                        {/* Icon */}
                        <div className="shrink-0">
                            {toast.type === 'success' && <Check className="text-white" size={20} />}
                            {toast.type === 'error' && <AlertCircle className="text-white" size={20} />}
                            {toast.type === 'info' && <Info className="text-white" size={20} />}
                        </div>

                        {/* Message */}
                        <p className="text-white font-bold text-xs sm:text-sm flex-1 wrap-break-word leading-tight">{toast.message}</p>

                        {/* Close Button */}
                        <button
                            onClick={toast.onClose}
                            className="shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Close notification"
                        >
                            <X className="text-white" size={16} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>,
        document.body
    );
};
