import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

export function BackToTopButton() {
    const [showBackToTop, setShowBackToTop] = useState(false);
    const { scrollYProgress } = useScroll();

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return createPortal(
        <AnimatePresence>
            {showBackToTop && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className={cn(
                        "fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center",
                        "bg-brand-pink text-white shadow-brand-pink/30 border-2 border-white/20 backdrop-blur-md"
                    )}
                    title="Back to Top"
                >
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" className="stroke-current opacity-20" strokeWidth="8" fill="transparent" />
                        <motion.circle cx="50" cy="50" r="45" className="stroke-current" strokeWidth="8" fill="transparent" strokeDasharray="0 1" style={{ pathLength: scrollYProgress, rotate: -90, strokeLinecap: 'round' }} />
                    </svg>
                    <ArrowUp size={24} strokeWidth={3} />
                </motion.button>
            )}
        </AnimatePresence>,
        document.body
    );
}