import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, Heart, Edit2, Trash2, Save, Calendar, User, Ruler, Activity, Building2, Globe, Instagram, Check, Star, Volume2, Loader2, Rocket, Lock, Plus, GripVertical, MessageSquare, Send, MapPin, Droplet, Trophy, Tag, Disc, PlayCircle, ListMusic } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageCropper } from './ImageCropper';
import { createImage, isDataUrl } from '../lib/cropImage';

const AWARD_DATA = {
    "K-Pop & Music Awards": {
        "MAMA Awards": [
            "Artist of the Year", "Song of the Year", "Album of the Year", "Worldwide Icon of the Year",
            "Best Male Artist", "Best Female Artist", "Best Male Group", "Best Female Group", "Best New Artist",
            "Best New Male Artist", "Best New Female Artist",
            "Best Dance Performance (Solo)", "Best Dance Performance (Group)", "Best Dance Performance Male Group", "Best Dance Performance Female Group",
            "Best Vocal Performance (Solo)", "Best Vocal Performance (Group)", "Best Band Performance", "Best Collaboration", "Best OST",
            "Best Music Video", "Best Choreography", "Favorite New Artist", "Worldwide Fans' Choice", "Fans' Choice - Female", "Fans' Choice - Male"
        ],
        "Melon Music Awards (MMA)": [
            "Record of the Year (Daesang)",
            "Song of the Year (Daesang)",
            "Album of the Year (Daesang)",
            "Artist of the Year (Daesang)",
            "Best Group (Female)",
            "New Artist of the Year",
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
            "Rookie of the Year",
            "Main Award (Bonsang)",
            "Best Performance Award",
            "World Best Artist Award",
            "Grand Award (Daesang)", "Main Award (Bonsang)", "Rookie of the Year",
            "Best Song Award", "Best Album Award", "R&B/Hip-Hop Award", "Ballad Award", "OST Award",
            "Popularity Award", "K-Wave Special Award", "Discovery of the Year"
        ],
        "Circle Chart Music Awards": [
            "Artist of the Year (Global Digital)", "Artist of the Year (Physical Album)", "Artist of the Year (Unique Listeners)",
            "Rookie of the Year", "World K-Pop Star", "Social Hot Star", "Retail Album of the Year", "Music Steady Seller"
        ],
        "The Fact Music Awards (TMA)": [
            "Artist of the Year (Bonsang)",
            "Worldwide Icon",
            "Hot Trend Award",
            "Next Leader Award",
            "Grand Prize (Daesang)", "Artist of the Year (Bonsang)", "Next Leader Award",
            "Listener's Choice Award", "Worldwide Icon", "Best Performer", "Popularity Award"
        ],
        "Asia Artist Awards (AAA)": [
            "Stage of the Year (Daesang)",
            "Hot Trend Award",
            "Rookie of the Year",
            "Best New Artist (Singer)",
            "Actor of the Year (Daesang)", "Artist of the Year (Daesang)", "Album of the Year (Daesang)", "Song of the Year (Daesang)",
            "Performance of the Year (Daesang)", "Stage of the Year (Daesang)", "Fandom of the Year (Daesang)",
            "Best Artist", "Best Musician", "Rookie of the Year", "Best Icon", "Best Choice", "Popularity Award", "Asia Celebrity", "Hot Trend"
        ],
        "Hanteo Music Awards": [
            "Artist of the Year (Bonsang)",
            "Best Performance (Group)",
            "Rookie of the Year (Female)"
        ],
        "K-World Dream Awards": [
            "K-World Dream Super Rookie Award", "K-World Dream Bonsang", "K-World Dream Best Artist",
            "K-World Dream Best Performance", "K-World Dream Best Music Video", "K-World Dream Producer Award"
        ],
        "Korea Grand Music Awards": [
            "Grand Honour's Choice", "Best Artist", "Best Group", "Best Solo Artist", "Best Rookie",
            "Best Song", "Best Album", "Most Popular Artist", "K-Pop Global Leader"
        ],
        "TikTok Awards Korea": [
            "Best Viral Song", "Artist of the Year", "Creator of the Year", "Video of the Year"
        ],
        "Billboard Music Awards": [
            "Top Artist", "Top New Artist", "Top Duo/Group", "Top Social Artist", "Top K-Pop Artist", "Top K-Pop Album", "Top K-Pop Song", "Top Global K-Pop Artist", "Top Global K-Pop Album", "Top Global K-Pop Song", "Top K-Pop Touring Artist", "Top Selling Song"
        ],
        "MTV Video Music Awards": [
            "Video of the Year", "Artist of the Year", "Song of the Year", "Best New Artist", "Push Performance of the Year", "Best Collaboration", "Best Pop", "Best K-Pop", "Best Group", "Song of Summer"
        ]
    },
    "Acting & Arts Awards": {
        "Baeksang Arts Awards": ["Grand Prize (Daesang) - TV", "Best Drama", "Best Director (TV)", "Best Actor (TV)", "Best Actress (TV)", "Best Supporting Actor (TV)", "Best Supporting Actress (TV)", "Best New Actor (TV)", "Best New Actress (TV)", "Grand Prize (Daesang) - Film", "Best Film", "Best Director (Film)", "Best Actor (Film)", "Best Actress (Film)", "Best Supporting Actor (Film)", "Best Supporting Actress (Film)", "Best New Actor (Film)", "Best New Actress (Film)", "Most Popular Actor", "Most Popular Actress"],
        "Blue Dragon Series Awards": ["Blue Dragon's Choice (Daesang)", "Best Drama", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress", "Best Entertainer", "Popular Star Award"],
        "Blue Dragon Film Awards": ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress", "Popular Star Award"],
        "Grand Bell Awards": ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best New Actor", "Best New Actress"]
    }
};

const defaultIdolData = {
    name: '',
    koreanName: '',
    fullEnglishName: '',
    group: '',
    groupId: '',
    positions: [],
    company: '',
    nationality: '',
    debutDate: '',
    birthDate: '',
    height: '',
    bloodType: '',
    gender: 'F',
    otherNames: '',
    birthPlace: '',
    awards: [],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    gallery: [],
    instagram: '',
    likes: 0,
    albums: []
};

export function IdolModal({ isOpen, mode, idol, onClose, onSave, onDelete, onLike, onGroupClick, onUserClick }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const [formData, setFormData] = useState(idol || {});
    const [editMode, setEditMode] = useState(mode === 'create');
    const [activeImage, setActiveImage] = useState('');
    const [floatingHearts, setFloatingHearts] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const successTimeoutRef = useRef(null);
    const [activeTab, setActiveTab] = useState('info');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [visibleComments, setVisibleComments] = useState(5);
    const [loadingComments, setLoadingComments] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [cropState, setCropState] = useState({ src: null, callback: null, aspect: 3 / 4 });
    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });

    useEffect(() => {
        if (!idol?.id) return;
        setLoadingComments(true);

        const q = query(
            collection(db, 'comments'),
            where('targetId', '==', idol.id),
            where('targetType', '==', 'idol')
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
    }, [idol?.id, user]);

    useEffect(() => {
        if (isOpen) {
            const shouldReset = (mode === 'create' && !formData.id) || (idol && idol.id !== formData.id);

            if (shouldReset) {
                const initialData = mode === 'create' ? defaultIdolData : idol;
                setFormData(initialData);
                setEditMode(mode === 'create' || mode === 'edit');
                setActiveImage(initialData.image || defaultIdolData.image);
                setActiveTab('info');
            }

            // Always reset these on open
            setNewAward({
                year: new Date().getFullYear(),
                category: 'K-Pop & Music Awards',
                show: '',
                award: ''
            });
            setVisibleComments(5);
        }
    }, [isOpen, mode, idol, formData.id]);

    const startCropping = (url, callback, aspect = 3 / 4) => {
        if (!url || isDataUrl(url)) {
            callback(url);
            return;
        }
        setCropState({ src: url, callback, aspect });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'image') {
            startCropping(value, (newUrl) => {
                const processedValue = newUrl ? convertDriveLink(newUrl) : newUrl;
                setFormData(prev => ({ ...prev, image: processedValue }));
                setActiveImage(processedValue);
            }, 3 / 4);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGalleryChange = (index, value) => {
        startCropping(value, (newUrl) => {
            const newGallery = [...(formData.gallery || [])];
            newGallery[index] = newUrl ? convertDriveLink(newUrl) : newUrl;
            setFormData(prev => ({ ...prev, gallery: newGallery }));
        }, 1 / 1);
    };

    const addGalleryImage = () => {
        setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), ''] }));
    };

    const removeGalleryImage = (index) => {
        setFormData(prev => ({ ...prev, gallery: (prev.gallery || []).filter((_, i) => i !== index) }));
    };

    const handlePositionsChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, positions: val.split(',').map(s => s.trim()) }));
    };

    const handleAddAward = () => {
        if (!newAward.show || !newAward.award) return;
        setFormData(prev => ({ ...prev, awards: [...(prev.awards || []), { ...newAward }] }));
        setNewAward(prev => ({ ...prev, award: '' })); // Reset for next entry
    };

    const handleRemoveAward = (index) => {
        setFormData(prev => ({ ...prev, awards: (prev.awards || []).filter((_, i) => i !== index) }));
    };

    const handleAlbumChange = (index, field, value) => {
        const newAlbums = [...(formData.albums || [])];
        if (!newAlbums[index]) newAlbums[index] = {};
        newAlbums[index][field] = value;
        setFormData(prev => ({ ...prev, albums: newAlbums }));
    };

    const addAlbum = () => {
        setFormData(prev => ({
            ...prev,
            albums: [...(prev.albums || []), { title: '', cover: '', date: '', youtube: '', tracks: [] }]
        }));
    };

    const removeAlbum = (index) => {
        const newAlbums = (formData.albums || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, albums: newAlbums }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        setEditMode(false);

        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }
        setShowSuccess(true);
        successTimeoutRef.current = setTimeout(() => {
            setShowSuccess(false);
            successTimeoutRef.current = null;
        }, 3000);
    };

    const handleCloseSuccess = () => {
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }
        setShowSuccess(false);
    };

    const handleSpeak = (text) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

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
                            targetId: idol.id,
                            targetType: 'idol',
                            targetName: idol.name,
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
                targetId: idol.id,
                targetType: 'idol',
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
                targetId: idol.id,
                targetType: 'idol',
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

    if (!isOpen) return null;

    const allImages = [formData.image, ...(formData.gallery || [])].filter(Boolean);

    // Filter root comments and replies
    const rootComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className={cn(
                        "absolute inset-0 backdrop-blur-md",
                        theme === 'dark' ? "bg-slate-950/80" : "bg-slate-900/40"
                    )}
                />

                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            className="fixed top-8 right-8 z-[60] bg-emerald-500 text-white pl-6 pr-3 py-3 rounded-2xl shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] flex items-center justify-between gap-4 font-black uppercase text-xs tracking-widest border border-white/20 backdrop-blur-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/20 rounded-full">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                                <span>บันทึกสำเร็จ</span>
                            </div>
                            <button onClick={handleCloseSuccess} className="p-1.5 -mr-1 rounded-full hover:bg-white/20 transition-colors active:scale-90">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className={cn(
                        "relative w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row border transition-colors duration-500",
                        theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className={cn(
                            "absolute top-6 right-6 z-20 p-2.5 rounded-full transition-all duration-300 active:scale-90 shadow-lg",
                            theme === 'dark' ? "bg-black/40 hover:bg-black/60 text-white" : "bg-white/80 hover:bg-white text-slate-800"
                        )}
                    >
                        <X size={20} />
                    </button>

                    {/* Left Column: Image & Gallery */}
                    <div className={cn(
                        "w-full md:w-5/12 h-[350px] md:h-auto relative flex flex-col overflow-hidden",
                        theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                    )}>
                        <div className="relative flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeImage}
                                    initial={{ opacity: 0, scale: 1.15 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={convertDriveLink(activeImage) || null}
                                    alt={formData.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/500x800?text=No+Image';
                                    }}
                                />
                            </AnimatePresence>
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-80",
                                theme === 'dark' ? "from-slate-900" : "from-black/60"
                            )} />

                            {!editMode && (
                                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10">
                                    <div className="relative">
                                        <AnimatePresence>
                                            {floatingHearts.map(heart => (
                                                <motion.div
                                                    key={heart.id}
                                                    initial={{ opacity: 1, y: 0, x: "-50%", scale: 0.5 }}
                                                    animate={{ opacity: 0, y: -150, x: "-50%", scale: 1.5 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="absolute top-0 left-1/2 pointer-events-none"
                                                >
                                                    <Heart className="w-6 h-6 fill-brand-pink text-brand-pink" />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (user) {
                                                    onLike(idol.id);
                                                    const id = Date.now() + Math.random();
                                                    setFloatingHearts(prev => [...prev, { id }]);
                                                    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== id)), 1000);
                                                } else {
                                                    alert('Please login to like idols!');
                                                }
                                            }}
                                            className={cn(
                                                "relative z-10 p-4 rounded-3xl backdrop-blur-xl transition-all duration-500 group shadow-2xl border",
                                                user ? "hover:scale-110 active:scale-90" : "opacity-50 cursor-not-allowed",
                                                "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-brand-pink/50"
                                            )}
                                        >
                                            <Heart className="w-7 h-7 transition-all group-hover:text-brand-pink group-active:scale-125" />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/60 uppercase font-black tracking-widest mb-1">Fan Love</p>
                                        <p className="text-2xl font-black text-white drop-shadow-lg">{(formData.likes || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {!editMode && allImages.length > 1 && (
                            <div className={cn(
                                "p-5 flex gap-3 overflow-x-auto custom-scrollbar transition-colors duration-500",
                                theme === 'dark' ? "bg-slate-950/60 backdrop-blur-xl border-t border-white/5" : "bg-white/40 backdrop-blur-md border-t border-slate-200"
                            )}>
                                {allImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={cn(
                                            "w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all duration-500 shadow-md",
                                            activeImage === img
                                                ? "border-brand-pink scale-90 rotate-2 shadow-brand-pink/30"
                                                : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                        )}
                                    >
                                        <img src={convertDriveLink(img)} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Details or Form */}
                    <div className="w-full md:w-7/12 p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex-1 mr-4">
                                {editMode ? (
                                    <div className="space-y-4">
                                        <input
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleChange}
                                            className={cn(
                                                "bg-transparent text-5xl font-black border-b-2 focus:outline-none w-full transition-colors",
                                                theme === 'dark' ? "text-white border-white/10 focus:border-brand-pink" : "text-slate-900 border-slate-200 focus:border-brand-pink"
                                            )}
                                            placeholder="Stage Name"
                                        />
                                        <div className="space-y-3">
                                            <input
                                                name="group"
                                                value={formData.group || ''}
                                                onChange={handleChange}
                                                className={cn(
                                                    "bg-transparent text-lg font-black tracking-widest uppercase border-b w-full focus:outline-none",
                                                    theme === 'dark' ? "text-brand-pink border-white/5" : "text-brand-pink border-slate-100"
                                                )}
                                                placeholder="Group Name"
                                            />
                                            <input
                                                name="groupId"
                                                value={formData.groupId || ''}
                                                onChange={handleChange}
                                                className={cn(
                                                    "bg-transparent text-xs font-mono border-b w-full focus:outline-none",
                                                    theme === 'dark' ? "text-slate-600 border-white/5" : "text-slate-400 border-slate-100"
                                                )}
                                                placeholder="group-id-slug"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h2 className={cn("text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                {formData.name}
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!user) return alert('Please login to manage favorites!');
                                                    onLike(idol.id);
                                                }}
                                                className="hover:scale-110 transition-transform focus:outline-none active:scale-90"
                                                title={formData.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                                            >
                                                <motion.div
                                                    initial={false}
                                                    animate={{ rotate: formData.isFavorite ? 360 : 0 }}
                                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                                >
                                                    <Star className={cn("transition-colors", formData.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-300 hover:text-yellow-400")} size={24} />
                                                </motion.div>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => formData.groupId && onGroupClick(formData.groupId)}
                                            className={cn(
                                                "text-xl font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 group",
                                                formData.groupId ? "text-brand-pink hover:text-brand-pink/80 cursor-pointer" : "text-slate-400"
                                            )}
                                        >
                                            <Building2 size={18} className="transition-transform group-hover:-translate-y-0.5" />
                                            {formData.group || 'Soloist'}
                                            {formData.groupId && <Activity size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!editMode && isAdmin && (
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-90",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => { onDelete(idol.id); onClose(); }}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-90",
                                            theme === 'dark' ? "bg-slate-800 text-red-400 hover:bg-red-900/40" : "bg-red-50 text-red-500 hover:bg-red-100"
                                        )}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Tabs (Only in View Mode) */}
                        {!editMode && (
                            <div className={cn(
                                "flex items-center flex-wrap gap-x-6 gap-y-2 mb-8 border-b",
                                theme === 'dark' ? "border-white/10" : "border-slate-100"
                            )}>
                                {['info', 'discography', 'comments'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative",
                                            activeTab === tab
                                                ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                                : "text-slate-400 hover:text-slate-500"
                                        )}
                                    >
                                        {tab === 'info' ? 'Artist Info' : tab === 'discography' ? 'Discography' : (
                                            <span>
                                                Fan Comments
                                                <span className="ml-1.5 opacity-50">({comments.length})</span>
                                            </span>
                                        )}
                                        {activeTab === tab && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-pink" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-10 flex-1">
                            {/* Info Tab Content */}
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-8", !editMode && activeTab !== 'info' && "hidden", editMode && "block")}>
                                <DetailItem icon={User} label="Full Name" value={formData.fullEnglishName} editMode={editMode} name="fullEnglishName" onChange={handleChange} theme={theme} />
                                <DetailItem
                                    icon={Globe}
                                    label="Korean Name"
                                    value={formData.koreanName}
                                    editMode={editMode}
                                    name="koreanName"
                                    onChange={handleChange}
                                    theme={theme}
                                    onAction={() => handleSpeak(formData.koreanName)}
                                />
                                <DetailItem icon={Tag} label="Other Name(s)" value={formData.otherNames} editMode={editMode} name="otherNames" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Building2} label="Company" value={formData.company} editMode={editMode} name="company" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Globe} label="Nationality" value={formData.nationality} editMode={editMode} name="nationality" onChange={handleChange} theme={theme} />
                                <DetailItem icon={MapPin} label="Birth Place" value={formData.birthPlace} editMode={editMode} name="birthPlace" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Calendar} label="Birth Date" value={formData.birthDate} editMode={editMode} name="birthDate" type="date" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Activity} label="Debut Date" value={formData.debutDate} editMode={editMode} name="debutDate" type="date" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Ruler} label="Height" value={formData.height} editMode={editMode} name="height" onChange={handleChange} theme={theme} />
                                <DetailItem icon={Droplet} label="Blood Type" value={formData.bloodType} editMode={editMode} name="bloodType" onChange={handleChange} theme={theme} />

                                <div className="sm:col-span-2 space-y-3">
                                    <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block">Positions</label>
                                    {editMode ? (
                                        <input
                                            value={formData.positions?.join(', ') || ''}
                                            onChange={handlePositionsChange}
                                            className={cn(
                                                "w-full rounded-2xl p-4 transition-all duration-300 focus:outline-none border-2",
                                                theme === 'dark'
                                                    ? "bg-slate-800/50 text-white border-white/5 focus:border-brand-pink"
                                                    : "bg-slate-50 text-slate-900 border-slate-100 focus:border-brand-pink"
                                            )}
                                            placeholder="Lead Vocalist, Main Dancer..."
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.positions?.map((p, i) => (
                                                <span key={i} className={cn(
                                                    "px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all hover:scale-105 shadow-sm",
                                                    theme === 'dark'
                                                        ? "bg-slate-800 border-white/5 text-slate-300"
                                                        : "bg-white border-slate-200 text-slate-600"
                                                )}>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="sm:col-span-2 space-y-3">
                                    <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block flex items-center gap-2">
                                        <Trophy size={12} /> Awards
                                    </label>
                                    {editMode ? (
                                        <div className="space-y-4">
                                            <div className={cn("p-4 rounded-2xl border-2 space-y-3", theme === 'dark' ? "bg-slate-800/30 border-white/5" : "bg-slate-50 border-slate-100")}>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <select value={newAward.category} onChange={e => setNewAward({ ...newAward, category: e.target.value, show: '', award: '' })} className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}>
                                                        {Object.keys(AWARD_DATA).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                    <input type="number" value={newAward.year} onChange={e => setNewAward({ ...newAward, year: e.target.value })} className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} placeholder="Year" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <select value={newAward.show} onChange={e => setNewAward({ ...newAward, show: e.target.value, award: '' })} className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}>
                                                        <option value="">Select Award Show</option>
                                                        {newAward.category && Object.keys(AWARD_DATA[newAward.category]).map(show => <option key={show} value={show}>{show}</option>)}
                                                    </select>
                                                    <select value={newAward.award} onChange={e => setNewAward({ ...newAward, award: e.target.value })} disabled={!newAward.show} className={cn("p-2 rounded-xl text-xs font-bold outline-none border", theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}>
                                                        <option value="">Select Award</option>
                                                        {newAward.show && AWARD_DATA[newAward.category][newAward.show].map(award => <option key={award} value={award}>{award}</option>)}
                                                    </select>
                                                </div>
                                                <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={handleAddAward} disabled={!newAward.show || !newAward.award} className="w-full py-2 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-brand-pink/90 disabled:opacity-50">
                                                    Add Award
                                                </motion.button>
                                            </div>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                <AnimatePresence mode="popLayout" initial={false}>
                                                    {(formData.awards || []).map((item, idx) => (
                                                        <motion.div layout key={`${item.year}-${item.show}-${item.award}-${idx}`} initial={{ opacity: 0, x: -20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("flex items-center justify-between p-3 rounded-xl border", theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-white border-slate-100")}>
                                                            <div className="text-xs">
                                                                <span className="font-black text-brand-pink mr-2">{item.year}</span>
                                                                <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-700")}>{item.show}</span>
                                                                <div className="text-xs text-slate-500 font-medium">{item.award}</div>
                                                            </div>
                                                            <button type="button" onClick={() => handleRemoveAward(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {(formData.awards || []).length > 0 ? (
                                                [...(formData.awards || [])].sort((a, b) => {
                                                    const yearA = typeof a === 'object' ? Number(a.year) : 0;
                                                    const yearB = typeof b === 'object' ? Number(b.year) : 0;
                                                    if (yearB !== yearA) return yearB - yearA;
                                                    const nameA = typeof a === 'object' ? `${a.show || ''} ${a.award || ''}` : String(a);
                                                    const nameB = typeof b === 'object' ? `${b.show || ''} ${b.award || ''}` : String(b);
                                                    return nameA.localeCompare(nameB);
                                                }).map((award, i) => (
                                                    <div key={i} className={cn("px-5 py-3 rounded-2xl text-sm font-medium border transition-all flex items-center gap-3", theme === 'dark' ? "bg-slate-800/50 border-white/5 text-slate-300" : "bg-white border-slate-200 text-slate-600")}>
                                                        <Trophy size={14} className="text-yellow-500 shrink-0" />
                                                        <div className="flex-1">
                                                            {typeof award === 'object' ? (
                                                                <>
                                                                    <span className="font-bold text-brand-pink mr-2">{award.year}</span>
                                                                    <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-700")}>{award.show}</span>
                                                                    <div className="text-xs text-slate-500">{award.award}</div>
                                                                </>
                                                            ) : award}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-slate-500 italic text-sm">No awards recorded yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {editMode && (
                                    <>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-1"> 
                                                <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                                    <Instagram size={12} />
                                                    Photo URL
                                                </label>
                                            </div>

                                            <div className="relative group/input">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-pink transition-colors">
                                                    <Globe size={18} />
                                                </div>
                                                <input
                                                    name="image"
                                                    value={formData.image}
                                                    onChange={handleChange}
                                                    className={cn(
                                                        "w-full rounded-2xl py-4 pl-12 pr-6 border-2 focus:outline-none transition-all text-sm font-bold",
                                                        theme === 'dark'
                                                            ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white"
                                                            : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                                                    )}
                                                    placeholder="Paste image URL..."
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium pl-1">
                                                💡 Tip: คุณสามารถใช้ลิงก์จากเว็บฝากรูป เช่น <a href="https://postimages.org/" target="_blank" className="text-brand-pink hover:underline">postimages.org</a> ได้ครับ
                                            </p>

                                            {/* Gallery Management */}
                                            <div className="pt-4 space-y-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center justify-between"> 
                                                    <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                                        <Globe size={12} />
                                                        Gallery Images
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={addGalleryImage}
                                                        className="flex items-center gap-1 text-xs text-brand-pink font-black uppercase tracking-wider hover:underline"
                                                    >
                                                        <Plus size={12} /> Add Image
                                                    </button>
                                                </div>
                                                <Reorder.Group axis="y" values={formData.gallery || []} onReorder={(newGallery) => setFormData(prev => ({...prev, gallery: newGallery}))} className="space-y-2">
                                                {(formData.gallery || []).map((url, idx) => (
                                                    <Reorder.Item
                                                        key={idx}
                                                        value={url}
                                                        className="flex gap-2 items-center"
                                                    >
                                                        <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <input
                                                            value={url}
                                                            onChange={(e) => handleGalleryChange(idx, e.target.value)}
                                                            className={cn(
                                                                "w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-xs font-bold",
                                                                theme === 'dark'
                                                                    ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white"
                                                                    : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                                                            )}
                                                            placeholder={`Gallery Image ${idx + 1} URL...`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGalleryImage(idx)}
                                                            className={cn(
                                                                "p-3 rounded-2xl transition-colors shrink-0",
                                                                theme === 'dark' ? "bg-slate-800 text-red-400 hover:bg-red-900/40" : "bg-red-50 text-red-500 hover:bg-red-100"
                                                            )}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </Reorder.Item>
                                                ))}
                                                </Reorder.Group>
                                            </div>
                                        </div>
                                        <DetailItem icon={Instagram} label="Instagram URL" value={formData.instagram} editMode={editMode} name="instagram" onChange={handleChange} theme={theme} />
                                    </>
                                )}
                            </div>

                            {/* Discography Tab Content */}
                            {!editMode && activeTab === 'discography' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(formData.albums || []).length > 0 ? (
                                            (formData.albums || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map((album, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    whileHover={{ y: -5 }}
                                                    onClick={() => setSelectedAlbum(album)}
                                                    className={cn(
                                                        "group cursor-pointer rounded-2xl overflow-hidden border shadow-md transition-all",
                                                        theme === 'dark' ? "bg-slate-900 border-white/5 hover:border-brand-pink/50" : "bg-white border-slate-100 hover:border-brand-pink/50"
                                                    )}
                                                >
                                                    <div className="aspect-square overflow-hidden relative">
                                                        <img src={convertDriveLink(album.cover)} alt={album.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-75" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <PlayCircle size={32} className="text-white drop-shadow-lg transition-transform scale-75 group-hover:scale-100" />
                                                        </div>
                                                    </div>
                                                    <div className="p-3">
                                                        <h4 className={cn("font-black text-sm leading-tight mb-1 truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{album.title}</h4>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{album.date ? new Date(album.date).getFullYear() : 'Unknown'}</p>
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-10">
                                                <Disc size={32} className="mx-auto text-slate-300 mb-3 opacity-50" />
                                                <p className="text-sm text-slate-500 font-medium">No discography added yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Edit Mode Discography Section */}
                            {editMode && (
                                <div className="space-y-6 pt-8 border-t border-dashed border-slate-200 dark:border-slate-800"> 
                                    <div className="flex items-center justify-between"> 
                                        <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                            <Disc size={12} /> Discography
                                        </label>
                                        <button type="button" onClick={addAlbum} className="text-xs font-black uppercase tracking-widest text-brand-pink flex items-center gap-1 hover:underline">
                                            <Plus size={12} /> Add Album
                                        </button>
                                    </div>
                                    
                                    {(formData.albums || []).map((album, idx) => (
                                        <div key={idx} className={cn("p-4 rounded-2xl border space-y-3", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-black text-xs uppercase tracking-widest text-brand-pink">Album #{idx + 1}</h4>
                                                <button type="button" onClick={() => removeAlbum(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <input placeholder="Album Title" value={album.title || ''} onChange={e => handleAlbumChange(idx, 'title', e.target.value)} className={cn("p-2 rounded-xl border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="date" value={album.date || ''} onChange={e => handleAlbumChange(idx, 'date', e.target.value)} className={cn("p-2 rounded-xl border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                    <input placeholder="Cover URL" value={album.cover || ''} onChange={e => handleAlbumChange(idx, 'cover', e.target.value)} className={cn("p-2 rounded-xl border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                </div>
                                                <input placeholder="YouTube Link" value={album.youtube || ''} onChange={e => handleAlbumChange(idx, 'youtube', e.target.value)} className={cn("p-2 rounded-xl border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <textarea 
                                                    placeholder="Tracklist (one song per line)" 
                                                    value={Array.isArray(album.tracks) ? album.tracks.join('\n') : (album.tracks || '')} 
                                                    onChange={e => handleAlbumChange(idx, 'tracks', e.target.value.split('\n'))}
                                                    className={cn("w-full p-2 rounded-xl border bg-transparent outline-none text-xs font-bold min-h-[60px]", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Comments Tab Content */}
                            {!editMode && activeTab === 'comments' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex gap-4">
                                        <div className={cn("w-10 h-10 rounded-full shrink-0 flex items-center justify-center", theme === 'dark' ? "bg-slate-800" : "bg-slate-100")}>
                                            {user?.avatar ? (
                                                <img src={convertDriveLink(user.avatar)} className="w-full h-full rounded-full object-cover" alt="" />
                                            ) : (
                                                <User size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder={user ? "Write a comment..." : "Please login to comment"}
                                                disabled={!user}
                                                className={cn(
                                                    "w-full rounded-2xl p-4 pr-12 text-sm font-medium resize-none focus:outline-none border-2 transition-all",
                                                    theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white placeholder:text-slate-600" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                                )}
                                                rows={3}
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePostComment}
                                                disabled={!user || !newComment.trim()}
                                                className="absolute bottom-4 right-4 p-2 rounded-xl bg-brand-pink text-white hover:scale-110 active:scale-90 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {loadingComments && rootComments.length === 0 ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex gap-4 animate-pulse">
                                                    <div className={cn("w-10 h-10 rounded-full shrink-0", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                    <div className="space-y-2 flex-1 py-1">
                                                        <div className={cn("h-3 w-24 rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                        <div className={cn("h-3 w-full rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                        <div className={cn("h-3 w-2/3 rounded-full", theme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : rootComments.slice(0, visibleComments).map((comment) => (
                                            <motion.div
                                                key={comment.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, ease: "easeOut" }}
                                                className="space-y-4"
                                            >
                                                <div className="flex gap-4 group items-start">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-pink/20 to-brand-purple/20 p-0.5 shrink-0">
                                                        <img src={convertDriveLink(comment.avatar) || `https://ui-avatars.com/api/?name=${comment.user}&background=random`} className="w-full h-full rounded-full object-cover" alt="" />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-xs font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>{comment.user}</span>
                                                            <span className="text-xs text-slate-500 font-bold">{getRelativeTime(comment.createdAt?.toMillis())}</span>
                                                        </div>
                                                        <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>{renderWithMentions(comment.text, handleMentionClick)}</p>
                                                        
                                                        {/* Action Buttons */}
                                                        <div className="flex items-center gap-4 pt-1">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} 
                                                                className="text-xs font-bold text-slate-400 hover:text-brand-pink transition-colors flex items-center gap-1" 
                                                            > 
                                                                <MessageSquare size={12} /> Reply
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleLikeComment(comment.id)} 
                                                                className={cn("text-xs font-bold flex items-center gap-1 transition-colors", comment.isLiked ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")} 
                                                            > 
                                                                <Heart size={12} className={cn(comment.isLiked && "fill-current")} /> {comment.likes || 0}
                                                            </button>
                                                            {(isAdmin || (user && (user.uid === comment.userId || user.id === comment.userId))) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                                    title="Delete Comment"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Reply Input */}
                                                {replyingTo === comment.id && (
                                                    <div className="ml-14 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                                        <input
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            placeholder={`Reply to ${comment.user}...`}
                                                            className={cn(
                                                                "flex-1 bg-transparent border-b py-2 text-xs focus:outline-none transition-colors",
                                                                theme === 'dark' ? "border-white/10 focus:border-brand-pink text-white" : "border-slate-200 focus:border-brand-pink text-slate-900"
                                                            )}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePostReply(comment.id)}
                                                            disabled={!replyText.trim()}
                                                            className="text-brand-pink disabled:opacity-50"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Replies List */}
                                                {getReplies(comment.id).map(reply => (
                                                    <div key={reply.id} className="ml-14 flex gap-3 group/reply">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden">
                                                            <img src={convertDriveLink(reply.avatar) || `https://ui-avatars.com/api/?name=${reply.user}&background=random`} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("text-[10px] font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>{reply.user}</span>
                                                                <span className="text-[9px] text-slate-500">{getRelativeTime(reply.createdAt?.toMillis())}</span>
                                                            </div>
                                                            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{renderWithMentions(reply.text, handleMentionClick)}</p>
                                                            
                                                            <div className="flex items-center gap-3 mt-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleLikeComment(reply.id)}
                                                                    className={cn("text-[9px] font-bold flex items-center gap-1 transition-colors", reply.isLiked ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")}
                                                                >
                                                                    <Heart size={10} className={cn(reply.isLiked && "fill-current")} /> {reply.likes || 0}
                                                                </button>
                                                                {(isAdmin || (user && (user.uid === reply.userId || user.id === reply.userId))) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteComment(reply.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Delete Comment"
                                                        >
                                                            <Trash2 size={10} />
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
                                            type="button"
                                            onClick={() => setVisibleComments(prev => prev + 5)}
                                            className={cn(
                                                "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors mt-4",
                                                theme === 'dark'
                                                    ? "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                            Load More Comments ({rootComments.length - visibleComments})
                                        </button>
                                    )}
                                </div>
                            )}

                            {!editMode && activeTab === 'info' && formData.instagram && (
                                <a
                                    href={formData.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-tr from-brand-pink/10 to-brand-purple/10 border border-brand-pink/20 text-brand-pink font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                                >
                                    <Instagram size={20} /> Official Instagram
                                </a>
                            )}

                            {editMode && (
                                <div className={cn(
                                    "pt-8 flex justify-end gap-4 border-t",
                                    theme === 'dark' ? "border-white/5" : "border-slate-100"
                                )}>
                                    <button
                                        type="button"
                                        onClick={() => mode === 'create' ? onClose() : setEditMode(false)}
                                        className={cn(
                                            "px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-sm",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-3 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-purple text-white font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all flex items-center gap-3 shadow-xl shadow-brand-pink/20 active:scale-95"
                                    >
                                        <Save size={20} /> Save Changes
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </motion.div>
            </div>

            {/* Album Detail Modal */}
            <AnimatePresence>
                {selectedAlbum && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedAlbum(null)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className={cn("w-full max-w-2xl rounded-[32px] overflow-hidden flex flex-col shadow-2xl max-h-[80vh]", theme === 'dark' ? "bg-slate-900" : "bg-white")}
                        >
                            <div className="relative h-48 sm:h-64 shrink-0">
                                <img
                                    src={convertDriveLink(selectedAlbum.cover)}
                                    className="w-full h-full object-cover"
                                    alt={selectedAlbum.title}
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/500x500?text=No+Cover'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <button onClick={() => setSelectedAlbum(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"><X size={20} /></button>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <h3 className="text-2xl font-black text-white leading-tight mb-1">{selectedAlbum.title}</h3>
                                    <p className="text-xs font-bold text-brand-pink uppercase tracking-widest">{selectedAlbum.date}</p>
                                </div>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-4 mb-6"> 
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ListMusic size={12} /> Tracklist</h4>
                                    <div className="space-y-1">
                                        {(selectedAlbum.tracks || []).map((track, i) => (
                                            <div key={i} className={cn("flex items-center gap-3 p-2 rounded-lg transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                                <span className="text-sm font-bold text-slate-500 w-5">{String(i + 1).padStart(2, '0')}</span>
                                                <span className={cn("font-bold text-xs", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{track}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedAlbum.youtube && (
                                    <a href={selectedAlbum.youtube} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl bg-[#FF0000] text-white font-black uppercase text-xs tracking-widest hover:bg-[#CC0000] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                                        <PlayCircle size={16} /> Listen on YouTube
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {cropState.src && (
                <ImageCropper
                    imageSrc={cropState.src}
                    aspect={cropState.aspect}
                    onCropComplete={(croppedUrl) => {
                        cropState.callback(croppedUrl);
                        setCropState({ src: null, callback: null, aspect: 3 / 4 });
                    }}
                    onCancel={() => {
                        cropState.callback(cropState.src);
                        setCropState({ src: null, callback: null, aspect: 3 / 4 });
                    }}
                />
            )}
        </AnimatePresence>
    );
}

function DetailItem({ icon: Icon, label, value, editMode, onChange, name, type = "text", theme, onAction }) {
    if (editMode) {
        return (
            <div className="space-y-2"> 
                <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                    <Icon size={12} />
                    {label}
                </label>
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    className={cn("w-full rounded-2xl py-3 px-4 transition-all duration-300 focus:outline-none border-2 text-sm font-bold", theme === 'dark' ? "bg-slate-800/50 text-white border-white/5 focus:border-brand-pink" : "bg-slate-50 text-slate-900 border-slate-100 focus:border-brand-pink")}
                />
            </div>
        );
    }

    return (
        <div className="group/detail">
            <p className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2 mb-1.5 opacity-80">
                <Icon size={12} className="group-hover/detail:text-brand-pink transition-colors" />
                {label}
            </p>
            <div className="flex items-center gap-3">
                <p className={cn(
                    "font-black text-lg transition-colors group-hover/detail:text-brand-pink",
                    theme === 'dark' ? "text-slate-100" : "text-slate-900"
                )}>
                    {value || '-'}
                </p>
                {onAction && value && (
                    <button
                        type="button"
                        onClick={onAction}
                        className={cn(
                            "p-1.5 rounded-lg transition-all active:scale-90",
                            theme === 'dark' ? "text-slate-400 hover:text-brand-pink hover:bg-white/5" : "text-slate-400 hover:text-brand-pink hover:bg-slate-100"
                        )}
                        title="Listen Pronunciation"
                    >
                        <Volume2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

function Tracklist({ tracks, theme }) {
    return (
        <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4"><ListMusic size={14} /> Tracklist</h4>
            <div className="space-y-2">
                {(tracks || []).map((track, i) => (
                    <div key={i} className={cn("flex items-center gap-4 p-3 rounded-xl transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                        <span className="text-sm font-bold text-slate-500 w-6 text-center">{String(i + 1).padStart(2, '0')}</span>
                        <span className={cn("font-bold text-sm", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{track}</span>
                    </div>
                ))}
            </div>
        </div>
    );
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
