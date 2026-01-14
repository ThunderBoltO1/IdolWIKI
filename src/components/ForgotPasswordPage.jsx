import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';

export const ForgotPasswordPage = ({ onNavigate }) => {
    const { resetPassword } = useAuth();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage('Check your inbox for further instructions');
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                    "w-full max-w-md p-10 rounded-[40px] relative overflow-hidden transition-all duration-500",
                    theme === 'dark' ? "glass-card" : "bg-white shadow-2xl shadow-slate-200 border border-slate-100"
                )}
            >
                {/* Visual Accent */}
                <div className={cn(
                    "absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32 transition-colors duration-1000",
                    theme === 'dark' ? "bg-brand-pink/20" : "bg-brand-pink/10"
                )} />

                {/* Visual Accent - Bottom Left */}
                <div className={cn(
                    "absolute bottom-0 left-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none -ml-32 -mb-32 transition-colors duration-1000",
                    theme === 'dark' ? "bg-brand-purple/20" : "bg-brand-purple/10"
                )} />

                <button
                    onClick={() => onNavigate('login')}
                    className={cn(
                        "flex items-center gap-2 mb-8 text-xs font-black uppercase tracking-widest transition-colors relative z-10 group",
                        theme === 'dark' ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                    )}
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
                </button>

                <div className="text-center mb-10 relative z-10">
                    <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-brand-pink to-brand-purple shadow-lg shadow-brand-pink/20 mb-6 transition-transform hover:scale-110 hover:rotate-3">
                        <KeyRound className="text-white" size={28} />
                    </div>

                    <h2 className={cn(
                        "text-3xl font-black mb-3 tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>Forgot Password?</h2>
                    <p className={cn(
                        "font-medium text-sm leading-relaxed max-w-[280px] mx-auto",
                        theme === 'dark' ? "text-slate-400" : "text-slate-500"
                    )}>No worries! Enter your username or email and we'll send you reset instructions.</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black uppercase tracking-widest"
                    >
                        <AlertCircle size={18} />
                        {error}
                    </motion.div>
                )}

                {message && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 text-xs font-black uppercase tracking-widest"
                    >
                        <CheckCircle2 size={18} />
                        {message}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] ml-1",
                            theme === 'dark' ? "text-slate-500" : "text-slate-400"
                        )}>Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={cn(
                                    "w-full rounded-[20px] py-4 pl-12 pr-6 focus:outline-none border-2 transition-all text-sm font-bold",
                                    theme === 'dark'
                                        ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white placeholder:text-slate-600"
                                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner placeholder:text-slate-400"
                                )}
                                placeholder="Enter your username or email"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.3em] text-white shadow-2xl transition-all mt-6 relative overflow-hidden group active:scale-95",
                            "bg-gradient-to-r from-brand-pink to-brand-purple",
                            loading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Send Reset Link"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};