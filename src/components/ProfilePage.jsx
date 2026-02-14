import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Globe, Save, ArrowLeft, CheckCircle2, Mail, Info, Loader2, Trash2, Upload, RotateCcw, Settings } from 'lucide-react';
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
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-6xl">
            <BackgroundShapes image={user?.avatar} />

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
                            Profile Settings
                        </h1>
                        <p className={cn(
                            "text-sm font-medium mt-1",
                            theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                            Customize your presence in the K-Pop Universe
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "rounded-[40px] border p-8 md:p-10",
                theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
            )}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar Preview */}
                        <div className="flex flex-col items-center gap-4 md:w-72 w-full">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                {formData.avatar ? (
                                    <img
                                        src={convertDriveLink(formData.avatar)}
                                        alt="Avatar"
                                        className={cn(
                                            "w-40 h-40 rounded-full border-4 object-cover shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105",
                                            theme === 'dark' ? "border-slate-800" : "border-white"
                                        )}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '';
                                        }}
                                    />
                                ) : (
                                    <div className={cn(
                                        "w-40 h-40 rounded-full border-4 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105",
                                        theme === 'dark' ? "border-slate-800 bg-slate-800 text-slate-500" : "border-white bg-slate-100 text-slate-400"
                                    )}>
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {formData.avatar && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-black uppercase tracking-widest border border-red-500/20"
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                )}
                                {formData.avatar !== (user?.avatar || '') && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, avatar: user?.avatar || '' }))}
                                        className={cn("flex items-center gap-2 px-4 py-2rounded-xl transition-colors text-xs font-black uppercase tracking-widest border", theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-white/10" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 border-slate-200")}
                                    >
                                        <RotateCcw size={14} />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Avatar URL Input */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={cn("text-xs uppercase font-black tracking-[0.2em] flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <Globe size={14} /> Avatar Image
                                    </label>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                                        theme === 'dark'
                                            ? "bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 border-brand-pink/20"
                                            : "bg-brand-pink/5 text-brand-pink hover:bg-brand-pink/10 border-brand-pink/20",
                                        isUploading && "opacity-50 cursor-not-allowed"
                                    )}>
                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {isUploading ? `${Math.round(uploadProgress)}%` : 'Upload'}
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
                                        "w-full rounded-2xl py-3 px-4 focus:outline-none border-2 transition-all text-sm font-medium",
                                        theme === 'dark'
                                            ? "bg-slate-950/30 border-white/10 focus:border-brand-pink text-white"
                                            : "bg-slate-50 border-slate-200 focus:border-brand-pink text-slate-900"
                                    )}
                                    placeholder="https://example.com/image.jpg or upload a file"
                                />
                            </div>

                            <p className={cn("text-xs", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                Upload from your device or paste a URL. Maximum file size: 5MB
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className={cn('h-px', theme === 'dark' ? 'bg-white/5' : 'bg-slate-200')} />

                    {/* Profile Information */}
                    <div>
                        <h3 className={cn(
                            'text-xs font-black uppercase tracking-[0.25em] mb-6',
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        )}>
                            Profile Information
                        </h3>

                        <div className="grid gap-6 md:grid-cols-2">
                            <InputGroup
                                icon={User}
                                label="Display Name"
                                name="name"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                theme={theme}
                                placeholder="e.g. K-Pop Fan #1"
                            />

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

                            <div className="md:col-span-2 space-y-3">
                                <label className={cn("text-xs uppercase font-black tracking-[0.2em] flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                    <Info size={14} />
                                    Personal Bio
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                    className={cn(
                                        "w-full rounded-2xl p-4 focus:outline-none border-2 transition-all text-sm font-medium h-32 resize-none",
                                        theme === 'dark'
                                            ? "bg-slate-950/30 border-white/10 focus:border-brand-pink text-white"
                                            : "bg-slate-50 border-slate-200 focus:border-brand-pink text-slate-900"
                                    )}
                                    placeholder="Tell the world about your journey with K-Pop..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col items-center gap-4 pt-4">
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "flex-1 md:flex-initial px-12 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.15em] text-white shadow-lg transition-all flex items-center gap-3 justify-center overflow-hidden relative group active:scale-95",
                                    "bg-brand-pink hover:bg-brand-pink/90",
                                    loading && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 text-green-500 font-black uppercase text-xs tracking-widest px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>Profile Updated Successfully!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </form>
            </div>

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

function InputGroup({ icon: Icon, label, value, onChange, theme, placeholder, type = "text" }) {
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
                    "w-full rounded-2xl py-3 px-4 focus:outline-none border-2 transition-all text-sm font-medium",
                    theme === 'dark'
                        ? "bg-slate-950/30 border-white/10 focus:border-brand-pink text-white"
                        : "bg-slate-50 border-slate-200 focus:border-brand-pink text-slate-900"
                )}
                placeholder={placeholder}
            />
        </div>
    );
}
