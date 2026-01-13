import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Mail, User, Loader2, AlertCircle, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

export const RegisterPage = ({ onNavigate, onRegisterSuccess }) => {
    const { register } = useAuth();
    const { theme } = useTheme();
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(formData.name, formData.username, formData.email, formData.password);
            onRegisterSuccess();
        } catch (err) {
            setError(err.message || 'Failed to register');
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
                    "absolute bottom-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none -mr-32 -mb-32 transition-colors duration-1000",
                    theme === 'dark' ? "bg-brand-blue/30" : "bg-brand-blue/10"
                )} />

                <div className="text-center mb-10 relative z-10">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-purple shadow-lg shadow-brand-blue/20 mb-6 transition-transform hover:rotate-12">
                        <Rocket className="text-white" size={24} />
                    </div>
                    <h2 className={cn(
                        "text-3xl font-black mb-2 tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>Join the Galaxy</h2>
                    <p className={cn(
                        "font-medium text-sm",
                        theme === 'dark' ? "text-slate-400" : "text-slate-500"
                    )}>Create your identity in the archives</p>
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

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <InputGroup
                        icon={User}
                        label="Your Name"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        theme={theme}
                        placeholder="John Doe"
                    />

                    <InputGroup
                        icon={User}
                        label="Username"
                        value={formData.username}
                        onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        theme={theme}
                        placeholder="unique_username"
                    />

                    <InputGroup
                        icon={Mail}
                        label="Email Address"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        theme={theme}
                        placeholder="john@example.com"
                        type="email"
                    />

                    <InputGroup
                        icon={Lock}
                        label="Secure Password"
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        theme={theme}
                        placeholder="••••••••"
                        type="password"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.3em] text-white shadow-2xl transition-all mt-6 relative overflow-hidden group active:scale-95",
                            "bg-gradient-to-r from-brand-blue via-brand-pink to-brand-purple",
                            loading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Initialize Account"}
                    </button>
                </form>

                <div className="mt-10 text-center relative z-10">
                    <p className={cn(
                        "text-xs font-bold transition-colors",
                        theme === 'dark' ? "text-slate-500" : "text-slate-400"
                    )}>
                        Already registered?{' '}
                        <button
                            onClick={() => onNavigate('login')}
                            className="text-brand-blue hover:text-brand-blue/80 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ml-1"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

function InputGroup({ icon: Icon, label, value, onChange, theme, placeholder, type = "text" }) {
    return (
        <div className="space-y-2">
            <label className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] ml-1",
                theme === 'dark' ? "text-slate-500" : "text-slate-400"
            )}>{label}</label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type={type}
                    required
                    value={value}
                    onChange={onChange}
                    className={cn(
                        "w-full rounded-[20px] py-4 pl-12 pr-6 focus:outline-none border-2 transition-all text-sm font-bold",
                        theme === 'dark'
                            ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                    )}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}
