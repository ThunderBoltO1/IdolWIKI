import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { convertDriveLink } from '../../lib/storage';
import { ArrowLeft, RefreshCw, Share2, Check, X, Save, Edit2, FileText, Trash2, Globe, Upload, Loader2 } from 'lucide-react';

export function GroupHero({
    displayGroup, isEditing, formData, setFormData, activeImage, setActiveImage,
    activeMembersCount, isCopied, setIsCopied, isHeroUploading, heroUploadProgress,
    handleHeroFileUpload, handleRefresh, refreshing,
    handleSaveGroup, onDeleteGroup, setIsEditing
}) {
    const { isAdmin, user } = useAuth();
    const t = useTranslation();
    const navigate = useNavigate();

    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const y2 = useTransform(scrollY, [0, 400], [0, -50]);
    const heroFileInputRef = React.useRef(null);

    return (
        <section className="relative h-[35vh] min-h-[300px] md:h-[55vh] max-h-[600px] rounded-[24px] md:rounded-[48px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] group/hero perspective-1000">
            <motion.div style={{ y: y1, scale }} className="absolute inset-0 w-full h-full transition-all duration-700">
                {isHeroUploading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                        <div className="w-1/3 min-w-[200px] max-w-[300px] space-y-3">
                            <div className="flex justify-between text-xs font-black text-white uppercase tracking-widest">
                                <span>Uploading</span>
                                <span>{Math.round(heroUploadProgress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-brand-pink shadow-[0_0_15px_rgba(236,72,153,0.8)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${heroUploadProgress}%` }}
                                    transition={{ ease: "linear" }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                <img src={convertDriveLink(activeImage)} alt={displayGroup.name} loading="eager" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
            </motion.div>

            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex flex-col items-end gap-3">
                <div className="flex gap-2">
                    <button onClick={handleRefresh} disabled={refreshing} className={cn("p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95", refreshing && "opacity-50 cursor-not-allowed")} title="Refresh Data">
                        <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95" title="Share Group">
                        {isCopied ? <Check size={20} /> : <Share2 size={20} />}
                    </button>
                    {user && (
                        isEditing ? (
                            <>
                                <button onClick={() => { setIsEditing(false); setFormData(displayGroup); setActiveImage(displayGroup.image); }} className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40" title="Cancel">
                                    <X size={20} />
                                </button>
                                <button onClick={handleSaveGroup} className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-green-500/20 border-green-500/50 text-white hover:bg-green-500/40" title={isAdmin ? "Save Changes" : "Submit Request"}>
                                    <Save size={20} />
                                </button>
                            </>
                        ) : (
                            <>
                                {isAdmin && (
                                    <button onClick={() => onDeleteGroup(displayGroup.id)} className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40 active:scale-95" title="Delete Group">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button onClick={() => setIsEditing(true)} className={cn("p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center active:scale-95", isAdmin ? "bg-white/10 border-white/20 text-white hover:bg-brand-pink/20 hover:border-brand-pink/50" : "bg-brand-purple/20 border-brand-purple/50 text-white hover:bg-brand-purple/40")} title={isAdmin ? "Edit Group Details" : "Suggest Edit"}>
                                    {isAdmin ? <Edit2 size={20} /> : <FileText size={20} />}
                                </button>
                            </>
                        )
                    )}
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.05, x: 10 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/')} className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 rounded-2xl bg-white/10 backdrop-blur-2xl text-white hover:bg-white/20 transition-all z-20 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] border border-white/20 shadow-2xl">
                <ArrowLeft size={16} />
                <span>{t('home.backToDiscovery')}</span>
            </motion.button>

            <motion.div style={{ y: y2, opacity }} className="absolute bottom-6 md:bottom-12 left-4 md:left-10 right-4 md:right-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 z-10">
                <div className="max-w-3xl">
                    {isEditing ? (
                        <div className="space-y-4 bg-black/40 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                            <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent text-3xl md:text-5xl font-black text-white border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-white/20" placeholder="Group Name" />
                            <input value={formData.koreanName || ''} onChange={e => setFormData({ ...formData, koreanName: e.target.value })} className="w-full bg-transparent text-lg md:text-2xl font-black text-brand-pink border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-brand-pink/20" placeholder="Korean Name" />
                            <div className="space-y-2">
                                {isAdmin && (
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-white/50 uppercase font-black tracking-widest flex items-center gap-2"><Globe size={14} /> Hero Image URL</label>
                                        <input type="file" ref={heroFileInputRef} onChange={handleHeroFileUpload} className="hidden" accept="image/*" />
                                        <button type="button" onClick={() => heroFileInputRef.current?.click()} disabled={isHeroUploading} className="flex items-center gap-1 text-[10px] text-brand-pink font-black uppercase tracking-wider hover:underline disabled:opacity-50">
                                            {isHeroUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                            {isHeroUploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                    </div>
                                )}
                                <input value={formData.image || ''} onChange={(e) => { const newUrl = e.target.value; setFormData({ ...formData, image: newUrl }); setActiveImage(newUrl); }} className="w-full bg-transparent text-sm font-medium text-white/80 border-b border-white/20 focus:border-brand-pink focus:outline-none" placeholder="Hero Image URL" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white mb-1 md:mb-2 tracking-tighter leading-none break-words">
                                {displayGroup.name}
                            </h1>
                            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl text-brand-pink/90 font-black tracking-widest italic">
                                {displayGroup.koreanName}
                            </p>
                        </>
                    )}
                </div>
                <div className="flex gap-2 md:gap-4">
                    <div className="px-3 md:px-6 py-2 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[70px] md:min-w-[120px] group/stat hover:border-brand-pink/50 transition-colors">
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-1 group-hover/stat:text-brand-pink transition-colors">Members</p>
                        <p className="text-xl md:text-3xl font-black text-white">{activeMembersCount}</p>
                    </div>
                    <div className="px-3 md:px-6 py-2 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[70px] md:min-w-[120px] group/stat hover:border-brand-blue/50 transition-colors">
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-1 group-hover/stat:text-brand-blue transition-colors">Fanclub</p>
                        {isEditing ? (
                            <input value={formData.fanclub || ''} onChange={e => setFormData({ ...formData, fanclub: e.target.value })} className="w-full bg-transparent text-xl md:text-3xl font-black text-brand-blue text-center border-b border-white/20 focus:border-brand-blue focus:outline-none" />
                        ) : (
                            <p className="text-xl md:text-3xl font-black text-brand-blue drop-shadow-sm">{displayGroup.fanclub || '-'}</p>
                        )}
                    </div>
                </div>
            </motion.div>
        </section>
    );
}