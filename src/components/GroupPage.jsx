import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Building2, Star, Info, ChevronRight, Music, Heart, Globe, Edit2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';

export function GroupPage({ group, members, onBack, onMemberClick, onUpdateGroup }) {
    const { isAdmin } = useAuth();
    const { theme } = useTheme();
    const containerRef = useRef(null);
    const [activeImage, setActiveImage] = useState(group?.image || '');
    const [isEditingUrl, setIsEditingUrl] = useState(false);

    // Sync activeImage when group data changes from Firestore
    useEffect(() => {
        if (group?.image) {
            setActiveImage(group.image);
        }
    }, [group?.image]);

    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const y2 = useTransform(scrollY, [0, 400], [0, -50]);

    if (!group) return (
        <div className="py-20 text-center">
            <h2 className="text-4xl font-black text-white">Group not found</h2>
            <button onClick={onBack} className="mt-8 px-10 py-4 bg-brand-pink text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-pink/20">Go Back Home</button>
        </div>
    );

    const allImages = [group.image, ...(group.gallery || [])].filter(Boolean);

    return (
        <div className="py-8 space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Hero Section */}
            <section className="relative h-[500px] md:h-[700px] rounded-[32px] md:rounded-[60px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] group/hero perspective-1000">
                <motion.div
                    style={{ y: y1, scale }}
                    className="absolute inset-0 w-full h-full transition-all duration-700"
                >
                    <img
                        src={convertDriveLink(activeImage)}
                        alt={group.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                        }}
                    />
                </motion.div>

                {isAdmin && (
                    <div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-3">
                        {isEditingUrl ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                className="bg-slate-900/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/20 shadow-2xl flex items-center gap-3 min-w-[300px]"
                            >
                                <Globe size={18} className="text-brand-pink shrink-0" />
                                <input
                                    type="text"
                                    value={activeImage}
                                    placeholder="Paste Image URL..."
                                    className="bg-transparent border-none focus:outline-none text-white text-xs font-bold w-full"
                                    onChange={(e) => {
                                        const url = e.target.value;
                                        setActiveImage(url);
                                    }}
                                    onBlur={async () => {
                                        await onUpdateGroup(group.id, { image: activeImage });
                                        setIsEditingUrl(false);
                                    }}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            await onUpdateGroup(group.id, { image: activeImage });
                                            setIsEditingUrl(false);
                                        }
                                    }}
                                    autoFocus
                                />
                            </motion.div>
                        ) : (
                            <button
                                onClick={() => setIsEditingUrl(true)}
                                className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-brand-pink/20 hover:border-brand-pink/50 active:scale-95"
                                title="Edit Hero Image URL"
                            >
                                <Edit2 size={20} />
                            </button>
                        )}
                    </div>
                )}

                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t via-slate-950/20 to-transparent transition-opacity duration-700",
                    theme === 'dark' ? "from-slate-950 opacity-90" : "from-black/70 opacity-80"
                )} />

                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.05, x: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="absolute top-8 left-8 flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-2xl text-white hover:bg-white/20 transition-all z-20 font-black text-xs uppercase tracking-[0.2em] border border-white/20 shadow-2xl"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Discovery</span>
                </motion.button>

                <motion.div
                    style={{ y: y2, opacity }}
                    className="absolute bottom-10 md:bottom-20 left-6 md:left-12 right-6 md:right-12 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 z-10"
                >
                    <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
                            <span className="px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-brand-pink text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-brand-pink/30">
                                {group.id === 'soloists' ? 'Solo Artist' : 'Legendary Group'}
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white mb-2 md:mb-4 tracking-tighter leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            {group.name}
                        </h1>
                        <p className="text-xl md:text-3xl lg:text-4xl text-brand-pink/90 font-black tracking-widest drop-shadow-2xl italic">
                            {group.koreanName}
                        </p>
                    </div>

                    <div className="flex gap-4 md:gap-6">
                        <div className="px-6 md:px-8 py-4 md:py-6 rounded-[24px] md:rounded-[32px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[100px] md:min-w-[140px] group/stat hover:border-brand-pink/50 transition-colors">
                            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mb-1 md:mb-2 group-hover/stat:text-brand-pink transition-colors">Members</p>
                            <p className="text-2xl md:text-4xl font-black text-white">{members.length}</p>
                        </div>
                        <div className="px-6 md:px-8 py-4 md:py-6 rounded-[24px] md:rounded-[32px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[100px] md:min-w-[140px] group/stat hover:border-brand-blue/50 transition-colors">
                            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mb-1 md:mb-2 group-hover/stat:text-brand-blue transition-colors">Fanclub</p>
                            <p className="text-2xl md:text-4xl font-black text-brand-blue drop-shadow-sm">{group.fanclub}</p>
                        </div>
                    </div>
                </motion.div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 px-4">
                {/* Left Column: Info & Description */}
                <div className="lg:col-span-4 space-y-10">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={cn(
                            "p-10 rounded-[48px] space-y-10 border shadow-2xl relative overflow-hidden",
                            theme === 'dark' ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-slate-200"
                        )}
                    >
                        <div className="absolute top-0 right-0 p-8 text-brand-purple opacity-5 rotate-12">
                            <Music size={120} />
                        </div>

                        <h3 className={cn(
                            "text-2xl font-black flex items-center gap-4",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <div className="p-3 rounded-2xl bg-brand-purple/10 text-brand-purple">
                                <Info size={24} />
                            </div>
                            The Legacy
                        </h3>

                        <div className="space-y-6">
                            <InfoRow
                                icon={Building2}
                                label="Foundation"
                                value={group.company}
                                theme={theme}
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Debut Era"
                                value={group.debutDate}
                                theme={theme}
                            />
                            <InfoRow
                                icon={Heart}
                                label="Status"
                                value="Active"
                                theme={theme}
                                valueClass="text-green-500 font-black tracking-[0.2em] uppercase text-xs"
                            />
                        </div>

                        <div className={cn(
                            "pt-10 border-t",
                            theme === 'dark' ? "border-white/10" : "border-slate-100"
                        )}>
                            <p className={cn(
                                "leading-relaxed text-lg font-medium italic relative z-10",
                                theme === 'dark' ? "text-slate-400" : "text-slate-600"
                            )}>
                                "{group.description}"
                            </p>
                        </div>
                    </motion.div>

                    {/* Gallery Thumbnails */}
                    {allImages.length > 1 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className={cn(
                                "p-8 rounded-[40px] border",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
                            )}
                        >
                            <h3 className={cn("text-xl font-black mb-6 tracking-tight uppercase tracking-[0.2em] text-[10px]", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Official Archives</h3>
                            <div className="grid grid-cols-3 gap-5">
                                {allImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={cn(
                                            "aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-500 shadow-lg",
                                            activeImage === img
                                                ? "border-brand-pink scale-95 shadow-brand-pink/40 -rotate-2"
                                                : "border-transparent opacity-40 hover:opacity-100 hover:scale-105 hover:rotate-1"
                                        )}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Right Column: Members List */}
                <div className="lg:col-span-8 space-y-12">
                    <div className="flex items-center justify-between">
                        <h2 className={cn(
                            "text-5xl font-black flex items-center gap-6",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <div className="p-4 rounded-3xl bg-brand-pink/10 text-brand-pink shadow-inner">
                                <Star size={40} fill="currentColor" />
                            </div>
                            The Stars
                        </h2>
                    </div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8"
                    >
                        {(members || []).map((member, idx) => (
                            <MemberCard
                                key={member.id || idx}
                                member={member}
                                theme={theme}
                                onClick={() => onMemberClick(member)}
                            />
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function MemberCard({ member, theme, onClick }) {
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setGlowPos({ x, y });
    };

    return (
        <motion.button
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            className={cn(
                "group p-6 md:p-10 rounded-[32px] md:rounded-[48px] border text-left relative overflow-hidden transition-all duration-500",
                theme === 'dark'
                    ? "bg-slate-900/60 border-white/5 hover:border-brand-pink/30 hover:bg-slate-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
                    : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50 hover:border-brand-pink/30 hover:shadow-brand-pink/10"
            )}
        >
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none z-10"
                style={{
                    background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`
                }}
            />

            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-pink/5 rounded-full blur-[90px] -mr-24 -mt-24 transition-all duration-700 group-hover:bg-brand-pink/20" />

            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-10 relative z-10">
                <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-brand-pink blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full" />
                    <img
                        src={convertDriveLink(member.image)}
                        alt={member.name}
                        className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] md:rounded-[40px] object-cover border-4 border-white/5 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-3"
                    />
                    {member.isFavorite && (
                        <div className="absolute -top-3 -right-3 p-3 bg-brand-pink rounded-full text-white shadow-[0_10px_30px_rgba(255,51,153,0.5)] border-4 border-slate-950">
                            <Star size={16} fill="currentColor" />
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-3">
                    <p className="text-[11px] text-brand-pink font-black uppercase tracking-[0.4em]">
                        {(member.positions && member.positions[0]) || 'Member'}
                    </p>
                    <h4 className={cn(
                        "text-2xl md:text-3xl lg:text-4xl font-black transition-colors leading-tight tracking-tight",
                        theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink"
                    )}>
                        {member.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-3">
                        {(member.positions || []).slice(1, 3).map((pos, i) => (
                            <span key={i} className={cn(
                                "text-[9px] px-4 py-1.5 rounded-xl font-black uppercase tracking-widest border transition-colors",
                                theme === 'dark'
                                    ? "bg-slate-800/80 text-slate-500 border-white/5 group-hover:border-brand-pink/20"
                                    : "bg-slate-50 text-slate-400 border-slate-100 group-hover:border-brand-pink/10"
                            )}>
                                {pos}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={cn(
                    "p-4 rounded-full transition-all duration-700 -translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 shrink-0",
                    "bg-brand-pink/10 text-brand-pink"
                )}>
                    <ChevronRight size={32} />
                </div>
            </div>
        </motion.button>
    );
}

function InfoRow({ icon: Icon, label, value, theme, isHighlight, valueClass }) {
    return (
        <div className="flex items-center gap-6 group/row">
            <div className={cn(
                "p-4 rounded-2xl transition-all duration-500 transform group-hover/row:scale-110 group-hover/row:rotate-6 shadow-lg",
                theme === 'dark'
                    ? "bg-slate-800 text-slate-500 group-hover/row:bg-brand-pink/20 group-hover/row:text-brand-pink"
                    : "bg-slate-50 text-slate-400 group-hover/row:bg-brand-pink/10 group-hover/row:text-brand-pink border border-slate-100"
            )}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1">{label}</p>
                <p className={cn(
                    "font-black text-xl tracking-tight",
                    valueClass,
                    !valueClass && (theme === 'dark' ? "text-white" : "text-slate-900"),
                    isHighlight && "text-brand-purple"
                )}>{value}</p>
            </div>
        </div>
    );
}
