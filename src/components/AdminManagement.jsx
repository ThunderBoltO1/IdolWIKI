import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Users, LayoutDashboard, Building2, FileText, Trophy, History, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { BackgroundShapes } from './BackgroundShapes';

export function AdminManagement({ onBack }) {
    const { theme } = useTheme();
    const navigate = useNavigate();

    const adminOptions = [
        {
            title: 'Dashboard',
            description: 'System overview, statistics & analytics',
            icon: LayoutDashboard,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            gradient: 'from-blue-500/5',
            onClick: () => navigate('/admin/dashboard')
        },
        {
            title: 'User Management',
            description: 'Manage users, roles & permissions',
            icon: Users,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
            gradient: 'from-green-500/5',
            onClick: () => navigate('/admin/users')
        },
        {
            title: 'Company Management',
            description: 'Manage companies & agencies',
            icon: Building2,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20',
            gradient: 'from-purple-500/5',
            onClick: () => navigate('/admin/companies')
        },
        {
            title: 'Pending Submissions',
            description: 'Review & approve user submissions',
            icon: FileText,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            gradient: 'from-orange-500/5',
            onClick: () => navigate('/admin/submissions')
        },
        {
            title: 'Award Management',
            description: 'Manage awards & achievements',
            icon: Trophy,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20',
            gradient: 'from-yellow-500/5',
            onClick: () => navigate('/admin/awards')
        },
        {
            title: 'Audit Logs',
            description: 'View system activity & changes',
            icon: History,
            color: 'text-cyan-500',
            bg: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/20',
            gradient: 'from-cyan-500/5',
            onClick: () => navigate('/admin/audit-logs')
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
            <BackgroundShapes />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={cn(
                            "p-3 rounded-2xl transition-all active:scale-95 shadow-sm border",
                            theme === 'dark'
                                ? "bg-slate-800 border-white/5 hover:bg-slate-700 text-white"
                                : "bg-white border-slate-100 hover:bg-slate-50 text-slate-900"
                        )}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={cn(
                            "text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <Settings className="text-brand-pink" size={32} />
                            Admin Management
                        </h1>
                        <p className={cn(
                            "text-sm font-medium mt-1",
                            theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                            Manage and configure system settings
                        </p>
                    </div>
                </div>
            </div>

            {/* Admin Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminOptions.map((option, index) => (
                    <motion.button
                        key={option.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={option.onClick}
                        className={cn(
                            "group p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden",
                            theme === 'dark'
                                ? "bg-slate-900/60 border-white/5 hover:bg-slate-800/60 hover:border-white/10"
                                : "bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200"
                        )}
                    >
                        {/* Background Gradient */}
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
                            option.gradient, "to-transparent"
                        )} />

                        {/* Decorative Icon */}
                        <div className={cn(
                            "absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150",
                            option.color
                        )}>
                            <option.icon size={96} />
                        </div>

                        {/* Content */}
                        <div className="relative z-10">
                            {/* Icon */}
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                                option.bg, option.color
                            )}>
                                <option.icon size={28} />
                            </div>

                            {/* Title */}
                            <h3 className={cn(
                                "text-xl font-black mb-2 transition-colors",
                                theme === 'dark' ? "text-white" : "text-slate-900"
                            )}>
                                {option.title}
                            </h3>

                            {/* Description */}
                            <p className={cn(
                                "text-sm font-medium",
                                theme === 'dark' ? "text-slate-400" : "text-slate-500"
                            )}>
                                {option.description}
                            </p>

                            {/* Arrow Indicator */}
                            <div className={cn(
                                "mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-transform group-hover:translate-x-2",
                                option.color
                            )}>
                                Open
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

export default AdminManagement;
