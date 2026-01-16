import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Mail, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export const LoginPage = ({ onNavigate, onLoginSuccess }) => {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(formData.identifier, formData.password, rememberMe);
            onLoginSuccess();
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "w-full max-w-md p-10 rounded-[40px] relative overflow-hidden transition-all duration-500",
                    theme === 'dark' ? "glass-card" : "bg-white shadow-2xl shadow-slate-200 border border-slate-100"
                )}
            >
                {/* Visual Accent */}
                <div className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 blur-[80px] rounded-full pointer-events-none -mt-24 transition-colors duration-1000",
                    theme === 'dark' ? "bg-brand-purple/30" : "bg-brand-purple/10"
                )} />

                <div className="text-center mb-10 relative z-10">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-brand-pink to-brand-purple shadow-lg shadow-brand-pink/20 mb-6 transition-transform hover:scale-110">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <h2 className={cn(
                        "text-3xl font-black mb-2 tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>Welcome Back</h2>
                    <p className={cn(
                        "font-medium text-sm",
                        theme === 'dark' ? "text-slate-400" : "text-slate-500"
                    )}>Sign in with your username or email</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black uppercase tracking-widest"
                    >
                        <AlertCircle size={18} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className={cn("text-xs font-black uppercase tracking-[0.2em] ml-1", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                            Username
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.identifier}
                                onChange={e => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                                className={cn(
                                    "w-full rounded-[20px] py-4 pl-12 pr-6 focus:outline-none border-2 transition-all text-sm font-bold",
                                    theme === 'dark'
                                        ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                                )}
                                placeholder="Username or Email"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className={cn("text-xs font-black uppercase tracking-[0.2em]", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => onNavigate('forgot-password')}
                                className="text-xs font-bold text-brand-pink hover:underline uppercase tracking-wider"
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className={cn(
                                    "w-full rounded-[20px] py-4 pl-12 pr-6 focus:outline-none border-2 transition-all text-sm font-bold",
                                    theme === 'dark'
                                        ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                                )}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-1">
                        <input
                            type="checkbox"
                            id="remember-me"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink accent-brand-pink cursor-pointer"
                        />
                        <label 
                            htmlFor="remember-me" 
                            className={cn(
                                "text-xs font-bold cursor-pointer select-none", 
                                theme === 'dark' ? "text-slate-400" : "text-slate-500"
                            )}
                        >
                            Remember Me
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.3em] text-white shadow-2xl transition-all mt-6 relative overflow-hidden group active:scale-95",
                            "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-blue",
                            loading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Unlock Database"}
                    </button>
                </form>

                <div className="mt-10 text-center relative z-10">
                    <p className={cn(
                        "text-xs font-bold transition-colors",
                        theme === 'dark' ? "text-slate-500" : "text-slate-400"
                    )}>
                        New to the universe?{' '}
                        <button
                            onClick={() => onNavigate('register')}
                            className="text-brand-pink hover:text-brand-pink/80 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ml-1"
                        >
                            Create Account
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
