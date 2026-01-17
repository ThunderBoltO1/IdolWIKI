import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';

export function BackgroundShapes({ image }) {
    const { theme } = useTheme();

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50">
            {/* Dynamic Ambient Background */}
            {image && (
                <motion.div 
                    key={image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0"
                >
                    <img 
                        src={convertDriveLink(image)} 
                        alt="" 
                        className="w-full h-full object-cover blur-[100px] scale-150 opacity-40 saturate-200"
                    />
                    <div className={cn("absolute inset-0", theme === 'dark' ? "bg-slate-950/80" : "bg-white/70")} />
                </motion.div>
            )}

            <motion.div
                animate={{
                    y: [0, -40, 0],
                    rotate: [0, 10, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: "transform" }}
                className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-pink/10 rounded-full blur-[100px] mix-blend-overlay"
            />
            <motion.div
                animate={{
                    y: [0, 50, 0],
                    rotate: [0, -10, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                style={{ willChange: "transform" }}
                className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-brand-purple/10 rounded-full blur-[100px] mix-blend-overlay"
            />
        </div>
    );
}
