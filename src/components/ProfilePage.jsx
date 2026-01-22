import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Globe, Save, ArrowLeft, CheckCircle2, Mail, Info, Loader2, Trash2, Upload, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { ImageCropper } from './ImageCropper';
import { isDataUrl } from '../lib/cropImage';
import { uploadImage, deleteImage, validateFile, compressImage, dataURLtoFile } from '../lib/upload';
import { BackgroundShapes } from './BackgroundShapes';

export const ProfilePage = ({ onBack }) => {
    const { user, updateUser } = useAuth();
    const { theme } = useTheme();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        avatar: user?.avatar || '',
        email: user?.email || '',
        bio: user?.bio || ''
    });

    // Sync formData when user data is loaded or changed in Firestore
    React.useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                avatar: user.avatar || '',
                email: user.email || '',
                bio: user.bio || ''
            });
        }
    }, [user]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [cropState, setCropState] = useState({ src: null, callback: null, aspect: 1 });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const startCropping = (url, callback, aspect = 1) => {
        if (!url || isDataUrl(url)) {
            callback(url);
            return;
        }
        setCropState({ src: url, callback, aspect });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await updateUser(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            validateFile(file, 5);
        } catch (error) {
            alert(error.message);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        startCropping(objectUrl, async (croppedUrl) => {
             setIsUploading(true);
             try {
                 const croppedFile = dataURLtoFile(croppedUrl, file.name);
                 const compressedFile = await compressImage(croppedFile);
                 
                 const url = await uploadImage(compressedFile, 'avatars', (progress) => setUploadProgress(progress));
                 setFormData(prev => ({ ...prev, avatar: url }));
             } catch (error) {
                 console.error("Upload failed", error);
                 alert("Failed to upload image");
             } finally {
                 setIsUploading(false);
                 if (fileInputRef.current) fileInputRef.current.value = '';
             }
        }, 1);
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] py-12 px-4">
            <BackgroundShapes image={user?.avatar} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "w-full max-w-2xl p-8 md:p-12 rounded-[40px] relative overflow-hidden transition-all duration-500",
                    theme === 'dark' ? "glass-card" : "bg-white shadow-2xl shadow-slate-200 border border-slate-100"
                )}
            >
                <button
                    onClick={onBack}
                    className={cn(
                        "flex items-center gap-2 transition-all mb-10 relative z-10 group active:scale-95",
                        theme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    )}
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold uppercase text-xs tracking-widest">Back to Directory</span>
                </button>

                <div className="text-center mb-12 relative z-10">
                    <h2 className={cn(
                        "text-4xl font-black mb-3 tracking-tight",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>Profile Settings</h2>
                    <p className={cn(
                        "font-medium",
                        theme === 'dark' ? "text-slate-400" : "text-slate-500"
                    )}>Customize your presence in the K-Pop Universe</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                    <div className="grid gap-4">
                    </div>

                    {/* Avatar Preview */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            {formData.avatar ? (
                                <img
                                    src={convertDriveLink(formData.avatar)}
                                    alt="Avatar"
                                    className={cn(
                                        "w-36 h-36 rounded-full border-4 object-cover shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105",
                                        theme === 'dark' ? "border-slate-800" : "border-white"
                                    )}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '';
                                    }}
                                />
                            ) : (
                                <div className={cn(
                                    "w-36 h-36 rounded-full border-4 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105",
                                    theme === 'dark' ? "border-slate-800 bg-slate-800 text-slate-500" : "border-white bg-slate-100 text-slate-400"
                                )}>
                                    <User size={64} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {formData.avatar && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-black uppercase tracking-widest"
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            )}
                            {formData.avatar !== (user?.avatar || '') && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, avatar: user?.avatar || '' }))}
                                    className={cn("flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-xs font-black uppercase tracking-widest", theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900")}
                                >
                                    <RotateCcw size={14} />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={cn("text-xs uppercase font-black tracking-[0.2em] flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <Globe size={14} /> Avatar URL
                                    </label>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1 text-xs text-brand-pink font-black uppercase tracking-wider hover:underline disabled:opacity-50">
                                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        {isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload File'}
                                    </button>
                                </div>
                                <input
                                    value={formData.avatar}
                                    onChange={e => {
                                        startCropping(e.target.value, (newUrl) => {
                                            setFormData(prev => ({ ...prev, avatar: newUrl }));
                                        }, 1);
                                    }}
                                    className={cn(
                                        "w-full rounded-[20px] py-4 px-5 focus:outline-none border-2 transition-all text-sm font-bold",
                                        theme === 'dark'
                                            ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                    )}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <InputGroup
                                icon={User}
                                label="Display Name"
                                name="name"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                theme={theme}
                                placeholder="e.g. K-Pop Fan #1"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <InputGroup
                                icon={Mail}
                                label="Email Address"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                theme={theme}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <label className={cn("text-xs uppercase font-black tracking-[0.2em] flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                <Info size={14} />
                                Personal Bio
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                className={cn(
                                    "w-full rounded-[24px] p-5 focus:outline-none border-2 transition-all text-sm font-medium h-32 resize-none",
                                    theme === 'dark'
                                        ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                )}
                                placeholder="Tell the world about your journey with K-Pop..."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full md:w-auto px-16 py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] text-white shadow-2xl transition-all flex items-center gap-3 justify-center overflow-hidden relative group active:scale-95",
                                "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-blue",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Sync Profile</span>
                                </>
                            )}
                        </button>

                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 text-green-500 font-black uppercase text-xs tracking-widest p-3 rounded-xl bg-green-500/5 border border-green-500/20"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>Database Updated Successfully!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </form>
            </motion.div>

            {cropState.src && (
                <ImageCropper
                    imageSrc={cropState.src}
                    aspect={cropState.aspect}
                    onCropComplete={(croppedUrl) => {
                        cropState.callback(croppedUrl);
                        setCropState({ src: null, callback: null, aspect: 1 });
                    }}
                    onCancel={() => {
                        cropState.callback(cropState.src);
                        setCropState({ src: null, callback: null, aspect: 1 });
                    }}
                />
            )}
        </div>
    );
};

function InputGroup({ icon: Icon, label, value, onChange, theme, placeholder, type = "text", isMono }) {
    return (
        <div className="space-y-3">
            <label className={cn("text-xs uppercase font-black tracking-[0.2em] flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                <Icon size={14} />
                {label}
            </label>
            <input
                type={type}
                required
                value={value}
                onChange={onChange}
                className={cn(
                    "w-full rounded-[20px] py-4 px-5 focus:outline-none border-2 transition-all text-sm font-bold",
                    isMono && "font-mono text-xs",
                    theme === 'dark'
                        ? "bg-slate-900/50 border-white/5 focus:border-brand-pink text-white"
                        : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                )}
                placeholder={placeholder}
            />
        </div>
    );
}
