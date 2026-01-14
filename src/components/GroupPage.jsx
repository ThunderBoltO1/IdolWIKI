import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Building2, Star, Info, ChevronRight, ChevronLeft, Music, Heart, Globe, Edit2, Loader2, MessageSquare, Send, User, Trash2, Save, X, Trophy, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AWARD_DATA = {
    "K-Pop & Music Awards": {
        "MAMA Awards": [
            "Artist of the Year", "Song of the Year", "Album of the Year", "Worldwide Icon of the Year",
            "Best Male Artist", "Best Female Artist", "Best Male Group", "Best Female Group", "Best New Artist",
            "Best Dance Performance (Solo)", "Best Dance Performance (Group)", "Best Vocal Performance (Solo)", "Best Vocal Performance (Group)", "Best Band Performance", "Best Collaboration", "Best OST",
            "Best Music Video", "Best Choreography", "Favorite New Artist", "Worldwide Fans' Choice"
        ],
        "Melon Music Awards (MMA)": [
            "Artist of the Year", "Album of the Year", "Song of the Year", "Record of the Year",
            "Top 10 Artists (Bonsang)", "New Artist of the Year", "Best Solo (Male/Female)", "Best Group (Male/Female)",
            "Best OST", "Best Music Video", "Global Artist", "Netizen Popularity Award", "Hot Trend Award", "Millions Top 10"
        ],
        "Golden Disc Awards (GDA)": [
            "Digital Daesang (Song of the Year)", "Album Daesang (Album of the Year)",
            "Digital Song Bonsang", "Album Bonsang", "Rookie Artist of the Year",
            "Best Solo Artist", "Best Group", "Most Popular Artist", "Cosmopolitan Artist Award"
        ],
        "Korean Music Awards (KMA)": [
            "Musician of the Year", "Song of the Year", "Album of the Year", "Rookie of the Year",
            "Best K-Pop Song", "Best K-Pop Album", "Best Pop Song", "Best Pop Album"
        ],
        "Seoul Music Awards (SMA)": [
            "Grand Award (Daesang)", "Main Award (Bonsang)", "Rookie of the Year",
            "Best Song Award", "Best Album Award", "R&B/Hip-Hop Award", "Ballad Award", "OST Award",
            "Popularity Award", "K-Wave Special Award", "Discovery of the Year"
        ],
        "Circle Chart Music Awards": [
            "Artist of the Year (Global Digital)", "Artist of the Year (Physical Album)", "Artist of the Year (Unique Listeners)",
            "Rookie of the Year", "World K-Pop Star", "Social Hot Star", "Retail Album of the Year", "Music Steady Seller"
        ],
        "The Fact Music Awards (TMA)": [
            "Grand Prize (Daesang)", "Artist of the Year (Bonsang)", "Next Leader Award",
            "Listener's Choice Award", "Worldwide Icon", "Best Performer", "Popularity Award"
        ],
        "Asia Artist Awards (AAA)": [
            "Actor of the Year (Daesang)", "Artist of the Year (Daesang)", "Album of the Year (Daesang)", "Song of the Year (Daesang)",
            "Performance of the Year (Daesang)", "Stage of the Year (Daesang)", "Fandom of the Year (Daesang)",
            "Best Artist", "Best Musician", "Rookie of the Year", "Best Icon", "Best Choice", "Popularity Award", "Asia Celebrity", "Hot Trend"
        ]
    },
    "Acting & Arts Awards": {
        "Baeksang Arts Awards": [
            "Grand Prize (Daesang) - TV", "Best Drama", "Best Director (TV)", "Best Actor (TV)", "Best Actress (TV)",
            "Best Supporting Actor (TV)", "Best Supporting Actress (TV)", "Best New Actor (TV)", "Best New Actress (TV)",
            "Grand Prize (Daesang) - Film", "Best Film", "Best Director (Film)", "Best Actor (Film)", "Best Actress (Film)",
            "Best Supporting Actor (Film)", "Best Supporting Actress (Film)", "Best New Actor (Film)", "Best New Actress (Film)",
            "Most Popular Actor", "Most Popular Actress"
        ],
        "Blue Dragon Series Awards": [
            "Blue Dragon's Choice (Daesang)", "Best Drama", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress",
            "Best Entertainer", "Popular Star Award"
        ],
        "Blue Dragon Film Awards": [
            "Best Film", "Best Director", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress",
            "Popular Star Award"
        ],
        "Grand Bell Awards": [
            "Best Film", "Best Director", "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress"
        ]
    }
};

export function GroupPage({ group, members, onBack, onMemberClick, onUpdateGroup, onDeleteGroup, onUserClick }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const containerRef = useRef(null);
    const [activeImage, setActiveImage] = useState(group?.image || '');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(group || {});
    const [activeTab, setActiveTab] = useState('members');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [visibleComments, setVisibleComments] = useState(5);
    const [loadingComments, setLoadingComments] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });

    useEffect(() => {
        if (!group?.id) return;
        setLoadingComments(true);

        const q = query(
            collection(db, 'comments'),
            where('targetId', '==', group.id),
            where('targetType', '==', 'group')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isLiked: user ? (doc.data().likedBy || []).includes(user.uid || user.id) : false
            }));
            // Sort client-side to avoid Firestore index requirements
            fetchedComments.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || Date.now();
                const timeB = b.createdAt?.toMillis() || Date.now();
                return timeB - timeA;
            });
            setComments(fetchedComments);
            setLoadingComments(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setLoadingComments(false);
        });
        return () => unsubscribe();
    }, [group?.id, user]);

    const createMentions = async (text, commentId) => {
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const mentions = [...text.matchAll(mentionRegex)].map(match => match[1]);
        const uniqueMentions = [...new Set(mentions)];

        if (uniqueMentions.length === 0) return;

        try {
            await Promise.all(uniqueMentions.map(async (username) => {
                const q = query(collection(db, 'users'), where('username', '==', username));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const recipientDoc = snapshot.docs[0];
                    if (recipientDoc.id !== (user.uid || user.id)) {
                         await addDoc(collection(db, 'notifications'), {
                            recipientId: recipientDoc.id,
                            senderId: user.uid || user.id,
                            senderName: user.name || 'Anonymous',
                            senderAvatar: user.avatar || '',
                            type: 'mention',
                            targetId: group.id,
                            targetType: 'group',
                            targetName: group.name,
                            commentId: commentId,
                            text: text,
                            createdAt: serverTimestamp(),
                            read: false
                        });
                    }
                }
            }));
        } catch (error) {
            console.error("Error creating notifications:", error);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !user) return;
        try {
            const docRef = await addDoc(collection(db, 'comments'), {
                text: newComment,
                userId: user.uid || user.id,
                user: user.name || 'Anonymous',
                avatar: user.avatar || '',
                targetId: group.id,
                targetType: 'group',
                createdAt: serverTimestamp(),
                likes: 0,
                likedBy: []
            });
            await createMentions(newComment, docRef.id);
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment:", error);
        }
    };

    const handlePostReply = async (parentId) => {
        if (!replyText.trim() || !user) return;
        try {
            const docRef = await addDoc(collection(db, 'comments'), {
                text: replyText,
                userId: user.uid || user.id,
                user: user.name || 'Anonymous',
                avatar: user.avatar || '',
                targetId: group.id,
                targetType: 'group',
                parentId: parentId,
                createdAt: serverTimestamp(),
                likes: 0,
                likedBy: []
            });
            await createMentions(replyText, docRef.id);
            setReplyText('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Error posting reply:", error);
        }
    };

    const handleLikeComment = async (commentId) => {
        if (!user) return alert('Please login to like comments!');
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        const commentRef = doc(db, 'comments', commentId);
        try {
            if (comment.isLiked) {
                await updateDoc(commentRef, { likes: increment(-1), likedBy: arrayRemove(user.uid || user.id) });
            } else {
                await updateDoc(commentRef, { likes: increment(1), likedBy: arrayUnion(user.uid || user.id) });
            }
        } catch (error) {
            console.error("Error liking comment:", error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            await deleteDoc(doc(db, 'comments', commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    const handleMentionClick = (mention) => {
        const username = mention.substring(1);
        if (onUserClick) onUserClick(username);
    };

    // Sync activeImage when group data changes from Firestore
    useEffect(() => {
        if (group?.image) {
            setActiveImage(group.image);
            setFormData(group);
        }
    }, [group?.image]);

    useEffect(() => {
        setVisibleComments(5);
    }, [group?.id]);

    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const y2 = useTransform(scrollY, [0, 400], [0, -50]);

    const allImages = group ? [group.image, ...(group.gallery || [])].filter(Boolean) : [];

    // Filter root comments and replies
    const rootComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

    const currentImageIndex = allImages.indexOf(lightboxImage);

    const handleNextImage = (e) => {
        e?.stopPropagation();
        if (currentImageIndex === -1) return;
        const nextIndex = (currentImageIndex + 1) % allImages.length;
        setLightboxImage(allImages[nextIndex]);
    };

    const handlePrevImage = (e) => {
        e?.stopPropagation();
        if (currentImageIndex === -1) return;
        const prevIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
        setLightboxImage(allImages[prevIndex]);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightboxImage) return;
            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setLightboxImage(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxImage, allImages]);

    if (!group) return (
        <div className="py-20 text-center">
            <h2 className="text-4xl font-black text-white">Group not found</h2>
            <button onClick={onBack} className="mt-8 px-10 py-4 bg-brand-pink text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-pink/20">Go Back Home</button>
        </div>
    );

    const handleSaveGroup = async () => {
        await onUpdateGroup(group.id, formData);
        setIsEditing(false);
        setActiveImage(formData.image);
    };

    const handleAddAward = () => {
        if (!newAward.show || !newAward.award) return;
        setFormData({ ...formData, awards: [...(formData.awards || []), { ...newAward }] });
    };

    const handleRemoveAward = (index) => {
        setFormData({ ...formData, awards: (formData.awards || []).filter((_, i) => i !== index) });
    };

    const handleGalleryChange = (index, value) => {
        const newGallery = [...(formData.gallery || [])];
        newGallery[index] = value;
        setFormData({ ...formData, gallery: newGallery });
    };

    const addGalleryImage = () => {
        setFormData({ ...formData, gallery: [...(formData.gallery || []), ''] });
    };

    const removeGalleryImage = (index) => {
        const newGallery = (formData.gallery || []).filter((_, i) => i !== index);
        setFormData({ ...formData, gallery: newGallery });
    };

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
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={handleSaveGroup}
                                    className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-green-500/20 border-green-500/50 text-white hover:bg-green-500/40"
                                >
                                    <Save size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onDeleteGroup(group.id)}
                                    className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40 active:scale-95"
                                    title="Delete Group"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-brand-pink/20 hover:border-brand-pink/50 active:scale-95"
                                    title="Edit Group Details"
                                >
                                    <Edit2 size={20} />
                                </button>
                            </div>
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
                        {isEditing ? (
                            <div className="space-y-4 bg-black/40 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-transparent text-5xl md:text-7xl font-black text-white border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-white/20"
                                    placeholder="Group Name"
                                />
                                <input
                                    value={formData.koreanName}
                                    onChange={e => setFormData({...formData, koreanName: e.target.value})}
                                    className="w-full bg-transparent text-xl md:text-3xl font-black text-brand-pink border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-brand-pink/20"
                                    placeholder="Korean Name"
                                />
                                <div className="flex items-center gap-2">
                                    <Globe size={16} className="text-white/50" />
                                    <input
                                        value={formData.image}
                                        onChange={e => {
                                            setFormData({...formData, image: e.target.value});
                                            setActiveImage(e.target.value);
                                        }}
                                        className="w-full bg-transparent text-sm font-medium text-white/80 border-b border-white/20 focus:border-brand-pink focus:outline-none"
                                        placeholder="Hero Image URL"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white mb-2 md:mb-4 tracking-tighter leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                    {group.name}
                                </h1>
                                <p className="text-xl md:text-3xl lg:text-4xl text-brand-pink/90 font-black tracking-widest drop-shadow-2xl italic">
                                    {group.koreanName}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-4 md:gap-6">
                        <div className="px-6 md:px-8 py-4 md:py-6 rounded-[24px] md:rounded-[32px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[100px] md:min-w-[140px] group/stat hover:border-brand-pink/50 transition-colors">
                            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mb-1 md:mb-2 group-hover/stat:text-brand-pink transition-colors">Members</p>
                            <p className="text-2xl md:text-4xl font-black text-white">{members.length}</p>
                        </div>
                        <div className="px-6 md:px-8 py-4 md:py-6 rounded-[24px] md:rounded-[32px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[100px] md:min-w-[140px] group/stat hover:border-brand-blue/50 transition-colors">
                            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mb-1 md:mb-2 group-hover/stat:text-brand-blue transition-colors">Fanclub</p>
                            {isEditing ? (
                                <input
                                    value={formData.fanclub}
                                    onChange={e => setFormData({...formData, fanclub: e.target.value})}
                                    className="w-full bg-transparent text-2xl md:text-4xl font-black text-brand-blue text-center border-b border-white/20 focus:border-brand-blue focus:outline-none"
                                />
                            ) : (
                                <p className="text-2xl md:text-4xl font-black text-brand-blue drop-shadow-sm">{group.fanclub}</p>
                            )}
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
                                value={isEditing ? (
                                    <input 
                                        value={formData.company} 
                                        onChange={e => setFormData({...formData, company: e.target.value})}
                                        className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                    />
                                ) : group.company}
                                theme={theme}
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Debut Era"
                                value={isEditing ? (
                                    <input 
                                        type="date"
                                        value={formData.debutDate} 
                                        onChange={e => setFormData({...formData, debutDate: e.target.value})}
                                        className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                    />
                                ) : group.debutDate}
                                theme={theme}
                            />
                            <InfoRow
                                icon={Heart}
                                label="Status"
                                value="Active"
                                theme={theme}
                                valueClass="text-green-500 font-black tracking-[0.2em] uppercase text-xs"
                            />
                            
                            {/* Awards Section */}
                            <div className={cn("pt-6 border-t", theme === 'dark' ? "border-white/10" : "border-slate-100")}>
                                <h4 className={cn("text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                    <Trophy size={14} /> Awards
                                </h4>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className={cn("p-4 rounded-2xl border-2 space-y-3", theme === 'dark' ? "bg-slate-800/30 border-white/5" : "bg-slate-50 border-slate-100")}>
                                            <div className="grid grid-cols-2 gap-3">
                                                <select
                                                    value={newAward.category}
                                                    onChange={e => setNewAward({ ...newAward, category: e.target.value, show: '', award: '' })}
                                                    className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                                >
                                                    {Object.keys(AWARD_DATA).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={newAward.year}
                                                    onChange={e => setNewAward({ ...newAward, year: e.target.value })}
                                                    className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                                    placeholder="Year"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <select
                                                    value={newAward.show}
                                                    onChange={e => setNewAward({ ...newAward, show: e.target.value, award: '' })}
                                                    className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                                >
                                                    <option value="">Select Award Show</option>
                                                    {newAward.category && Object.keys(AWARD_DATA[newAward.category]).map(show => <option key={show} value={show}>{show}</option>)}
                                                </select>
                                                <select
                                                    value={newAward.award}
                                                    onChange={e => setNewAward({ ...newAward, award: e.target.value })}
                                                    disabled={!newAward.show}
                                                    className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                                                >
                                                    <option value="">Select Award</option>
                                                    {newAward.show && AWARD_DATA[newAward.category][newAward.show].map(award => <option key={award} value={award}>{award}</option>)}
                                                </select>
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                type="button"
                                                onClick={handleAddAward}
                                                disabled={!newAward.show || !newAward.award}
                                                className="w-full py-2 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-brand-pink/90 disabled:opacity-50"
                                            >
                                                Add Award
                                            </motion.button>
                                        </div>
                                        <div className="space-y-2">
                                            <AnimatePresence mode="popLayout" initial={false}>
                                            {(formData.awards || []).map((item, idx) => (
                                                <motion.div
                                                    layout
                                                    key={`${typeof item === 'object' ? item.year + item.show + item.award : item}-${idx}`}
                                                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    className={cn("flex items-center justify-between p-3 rounded-xl border", theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-white border-slate-100")}
                                                >
                                                    <div className="text-xs">
                                                        {typeof item === 'object' ? (
                                                            <>
                                                                <span className="font-black text-brand-pink mr-2">{item.year}</span>
                                                                <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-700")}>{item.show}</span>
                                                                <div className="text-[10px] text-slate-500 font-medium">{item.award}</div>
                                                            </>
                                                        ) : (
                                                            <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-700")}>{item}</span>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveAward(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                                </motion.div>
                                            ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(group.awards || []).length > 0 ? (
                                            [...(group.awards || [])].sort((a, b) => {
                                                const yearA = typeof a === 'object' ? Number(a.year) : 0;
                                                const yearB = typeof b === 'object' ? Number(b.year) : 0;
                                                return yearA - yearB;
                                            }).map((award, i) => (
                                                <span key={i} className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2",
                                                    theme === 'dark' ? "bg-slate-800 border-white/5 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                                                )}>
                                                    {typeof award === 'object' ? (
                                                        <>
                                                            <span className="text-brand-pink">{award.year}</span>
                                                            <span>{award.show} - {award.award}</span>
                                                        </>
                                                    ) : award}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-500 italic">No awards yet.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={cn(
                            "pt-10 border-t",
                            theme === 'dark' ? "border-white/10" : "border-slate-100"
                        )}>
                            {isEditing ? (
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className={cn(
                                        "w-full h-40 bg-transparent border-2 rounded-xl p-4 focus:outline-none resize-none",
                                        theme === 'dark' ? "border-white/10 text-slate-300 focus:border-brand-pink" : "border-slate-200 text-slate-600 focus:border-brand-pink"
                                    )}
                                />
                            ) : (
                                <p className={cn(
                                    "leading-relaxed text-lg font-medium italic relative z-10",
                                    theme === 'dark' ? "text-slate-400" : "text-slate-600"
                                )}>
                                    "{group.description}"
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Gallery Thumbnails */}
                    {(isEditing || allImages.length > 1) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className={cn(
                                "p-8 rounded-[40px] border",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black tracking-tight uppercase tracking-[0.2em] text-[10px]", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Official Archives</h3>
                                {isEditing && (
                                    <button onClick={addGalleryImage} className="text-[10px] font-black uppercase tracking-widest text-brand-pink flex items-center gap-1 hover:underline">
                                        <Plus size={12} /> Add Image
                                    </button>
                                )}
                            </div>
                            
                            {isEditing ? (
                                <div className="space-y-3">
                                    {(formData.gallery || []).map((url, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input 
                                                value={url}
                                                onChange={(e) => handleGalleryChange(idx, e.target.value)}
                                                className={cn("w-full bg-transparent border-b p-2 text-xs font-medium focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                                placeholder="Image URL..."
                                            />
                                            <button onClick={() => removeGalleryImage(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {(formData.gallery || []).length === 0 && <p className="text-xs text-slate-500 italic">No gallery images added.</p>}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-5">
                                    {allImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setLightboxImage(img)}
                                            className={cn(
                                                "aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-500 shadow-lg",
                                                "border-transparent opacity-70 hover:opacity-100 hover:scale-105 hover:rotate-1"
                                            )}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Right Column: Members List */}
                <div className="lg:col-span-8 space-y-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => setActiveTab('members')}
                                className={cn(
                                    "text-3xl md:text-5xl font-black flex items-center gap-4 transition-all",
                                    activeTab === 'members'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'members' && (
                                    <motion.div layoutId="tab-icon" className="p-3 md:p-4 rounded-3xl bg-brand-pink/10 text-brand-pink shadow-inner">
                                        <Star size={32} fill="currentColor" />
                                    </motion.div>
                                )}
                                The Stars
                            </button>
                            <button
                                onClick={() => setActiveTab('comments')}
                                className={cn(
                                    "text-3xl md:text-5xl font-black flex items-center gap-4 transition-all",
                                    activeTab === 'comments'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'comments' && (
                                    <motion.div layoutId="tab-icon" className="p-3 md:p-4 rounded-3xl bg-brand-blue/10 text-brand-blue shadow-inner">
                                        <MessageSquare size={32} fill="currentColor" />
                                    </motion.div>
                                )}
                                Fan Talk
                                <span className="text-2xl md:text-3xl opacity-30 ml-2">({comments.length})</span>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'members' ? (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0 },
                                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                            }}
                            initial="hidden"
                            animate="show"
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
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "p-8 md:p-12 rounded-[40px] border space-y-10",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl"
                            )}
                        >
                            {/* Comment Input */}
                            <div className="flex gap-6">
                                <div className={cn("w-14 h-14 rounded-full shrink-0 flex items-center justify-center shadow-lg", theme === 'dark' ? "bg-slate-800" : "bg-slate-50")}>
                                    {user?.avatar ? (
                                        <img src={convertDriveLink(user.avatar)} className="w-full h-full rounded-full object-cover" alt="" />
                                    ) : (
                                        <User size={24} className="text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 relative group">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={user ? "Share your love for the group..." : "Please login to join the conversation"}
                                        disabled={!user}
                                        className={cn(
                                            "w-full rounded-3xl p-6 pr-16 text-lg font-medium resize-none focus:outline-none border-2 transition-all shadow-inner",
                                            theme === 'dark' ? "bg-slate-950/50 border-white/5 focus:border-brand-blue text-white placeholder:text-slate-600" : "bg-slate-50 border-slate-100 focus:border-brand-blue text-slate-900"
                                        )}
                                        rows={3}
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!user || !newComment.trim()}
                                        className="absolute bottom-4 right-4 p-3 rounded-2xl bg-brand-blue text-white hover:scale-110 active:scale-90 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-brand-blue/20"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-8">
                                {loadingComments && rootComments.length === 0 ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex gap-6 animate-pulse">
                                            <div className={cn("w-14 h-14 rounded-full shrink-0", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                            <div className="space-y-3 flex-1 py-2">
                                                <div className={cn("h-4 w-32 rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                <div className={cn("h-4 w-full rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                <div className={cn("h-4 w-3/4 rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                            </div>
                                        </div>
                                    ))
                                ) : rootComments.slice(0, visibleComments).map((comment) => (
                                    <motion.div
                                        key={comment.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="space-y-6"
                                    >
                                        <div className="flex gap-6 group items-start">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-blue/20 to-brand-purple/20 p-0.5 shrink-0 shadow-lg">
                                                <img src={convertDriveLink(comment.avatar) || `https://ui-avatars.com/api/?name=${comment.user}&background=random`} className="w-full h-full rounded-full object-cover" alt="" />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-base font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>{comment.user}</span>
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{getRelativeTime(comment.createdAt?.toMillis())}</span>
                                                    </div>
                                                </div>
                                                <p className={cn("text-lg leading-relaxed font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>{renderWithMentions(comment.text, handleMentionClick)}</p>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-6 pt-2">
                                                    <button
                                                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-blue transition-colors flex items-center gap-2"
                                                    >
                                                        <MessageSquare size={14} /> Reply
                                                    </button>
                                                    <button
                                                        onClick={() => handleLikeComment(comment.id)}
                                                        className={cn("text-xs font-bold flex items-center gap-2 transition-colors", comment.isLiked ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")}
                                                    >
                                                        <Heart size={14} className={cn(comment.isLiked && "fill-current")} /> {comment.likes || 0}
                                                    </button>
                                                    {(isAdmin || (user && (user.uid === comment.userId || user.id === comment.userId))) && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Delete Comment"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reply Input */}
                                        {replyingTo === comment.id && (
                                            <div className="ml-20 flex gap-4 animate-in fade-in slide-in-from-top-2">
                                                <input
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={`Reply to ${comment.user}...`}
                                                    className={cn(
                                                        "flex-1 bg-transparent border-b-2 py-3 text-sm font-medium focus:outline-none transition-colors",
                                                        theme === 'dark' ? "border-white/10 focus:border-brand-blue text-white" : "border-slate-200 focus:border-brand-blue text-slate-900"
                                                    )}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handlePostReply(comment.id)}
                                                    disabled={!replyText.trim()}
                                                    className="text-brand-blue disabled:opacity-50 hover:scale-110 transition-transform"
                                                >
                                                    <Send size={20} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Replies List */}
                                        {getReplies(comment.id).map(reply => (
                                            <div key={reply.id} className="ml-20 flex gap-4 group/reply">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden shadow-md">
                                                    <img src={convertDriveLink(reply.avatar) || `https://ui-avatars.com/api/?name=${reply.user}&background=random`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-sm font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>{reply.user}</span>
                                                        <span className="text-xs text-slate-500 font-medium">{getRelativeTime(reply.createdAt?.toMillis())}</span>
                                                    </div>
                                                    <p className={cn("text-base mt-1 font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{renderWithMentions(reply.text, handleMentionClick)}</p>
                                                    
                                                    <div className="flex items-center gap-4 mt-2 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleLikeComment(reply.id)}
                                                            className={cn("text-xs font-bold flex items-center gap-1.5 transition-colors", reply.isLiked ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")}
                                                        >
                                                            <Heart size={12} className={cn(reply.isLiked && "fill-current")} /> {reply.likes || 0}
                                                        </button>
                                                        {(isAdmin || (user && (user.uid === reply.userId || user.id === reply.userId))) && (
                                                <button
                                                    onClick={() => handleDeleteComment(reply.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Delete Comment"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                ))}
                            </div>

                            {visibleComments < rootComments.length && (
                                <button
                                    onClick={() => setVisibleComments(prev => prev + 5)}
                                    className={cn(
                                        "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors mt-8",
                                        theme === 'dark'
                                            ? "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    Load More Comments ({rootComments.length - visibleComments})
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Lightbox Modal */}
            {createPortal(
                <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                        >
                            <X size={24} />
                        </button>
                        
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}

                        <motion.img
                            key={lightboxImage}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={convertDriveLink(lightboxImage)}
                            alt="Full size"
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

function renderWithMentions(text, onMentionClick) {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            return (
                <span
                    key={index}
                    onClick={(e) => { e.stopPropagation(); onMentionClick && onMentionClick(part); }}
                    className="text-brand-pink font-bold cursor-pointer hover:underline"
                >
                    {part}
                </span>
            );
        }
        return part;
    });
}

function getRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
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
