import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence, Reorder, animate } from 'framer-motion';
import { X, Heart, Edit2, Trash2, Save, Calendar, User, Ruler, Activity, Building2, Globe, Instagram, Twitter, Youtube, Check, Star, Volume2, Loader2, Rocket, Lock, Plus, GripVertical, MessageSquare, Send, MapPin, Droplet, Trophy, Tag, Disc, PlayCircle, ListMusic, Users, Search, ZoomIn, ZoomOut, RotateCcw, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageCropper } from './ImageCropper';
import getCroppedImgDataUrl, { createImage, isDataUrl } from '../lib/cropImage';
import { ConfirmationModal } from './ConfirmationModal';
import { IdolCard } from './IdolCard';
import Cropper from 'react-easy-crop';

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
    twitter: '',
    youtube: '',
    likes: 0,
    albums: []
};

export function IdolModal({ isOpen, mode, idol, onClose, onSave, onDelete, onLike, onGroupClick, onUserClick, onSearch, onIdolClick }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(idol || {});
    const [editMode, setEditMode] = useState(mode === 'create');
    const [activeImage, setActiveImage] = useState('');
    const [floatingHearts, setFloatingHearts] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const successTimeoutRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('info');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [visibleComments, setVisibleComments] = useState(5);
    const [loadingComments, setLoadingComments] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [cropState, setCropState] = useState({ src: null, callback: null, aspect: 3 / 4 });
    const heartIdCounter = useRef(0);
    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });
    const [similarIdols, setSimilarIdols] = useState([]);

    const [imageCrop, setImageCrop] = useState({ x: 0, y: 0 });
    const [imageZoom, setImageZoom] = useState(1);
    const [imageCroppedArea, setImageCroppedArea] = useState(null);
    const [history, setHistory] = useState([]);
    const isBackRef = useRef(false);

    const [showHistory, setShowHistory] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        singleButton: true,
        onConfirm: null,
        confirmText: 'OK'
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
                if (idol && formData.id && idol.id !== formData.id) {
                    if (!isBackRef.current) {
                        setHistory(prev => [...prev, formData]);
                    } else {
                        isBackRef.current = false;
                    }
                } else if (!idol || (formData.id && !idol.id)) {
                    // Reset history if opening fresh or clearing
                    setHistory([]);
                }

                const initialData = mode === 'create' ? { ...defaultIdolData, ...(idol || {}) } : idol;
                setFormData(initialData);
                setEditMode(mode === 'create' || mode === 'edit');
                setActiveImage(initialData.image || defaultIdolData.image);
                setActiveTab('info');
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }

            // Always reset these on open
            setNewAward({
                year: new Date().getFullYear(),
                category: 'K-Pop & Music Awards',
                show: '',
                award: ''
            });
            setVisibleComments(5);
        } else {
            setHistory([]);
        }
    }, [isOpen, mode, idol, formData.id]);

    useEffect(() => {
        if (!idol?.id) return;

        const unsub = onSnapshot(doc(db, 'idols', idol.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData(prev => ({
                    ...prev,
                    likes: data.likes || 0
                }));
            }
        });

        return () => unsub();
    }, [idol?.id]);

    useEffect(() => {
        if (!idol?.id) return;

        const fetchSimilar = async () => {
            try {
                let candidates = [];
                const seenIds = new Set([idol.id]);

                // 1. Fetch by Company
                if (idol.company) {
                    const qCompany = query(
                        collection(db, 'idols'),
                        where('company', '==', idol.company),
                        limit(10)
                    );
                    const snapCompany = await getDocs(qCompany);
                    snapCompany.docs.forEach(d => {
                        if (!seenIds.has(d.id)) {
                            seenIds.add(d.id);
                            candidates.push({ id: d.id, ...d.data() });
                        }
                    });
                }

                // 2. Fetch by Position (if needed to fill up)
                if (candidates.length < 4 && idol.positions && idol.positions.length > 0) {
                    const searchPositions = idol.positions.slice(0, 10);
                    const qPos = query(
                        collection(db, 'idols'),
                        where('positions', 'array-contains-any', searchPositions),
                        limit(10)
                    );
                    const snapPos = await getDocs(qPos);
                    snapPos.docs.forEach(d => {
                        if (candidates.length < 4 && !seenIds.has(d.id)) {
                            seenIds.add(d.id);
                            candidates.push({ id: d.id, ...d.data() });
                        }
                    });
                }

                setSimilarIdols(candidates.slice(0, 4));
            } catch (err) {
                console.error("Error fetching similar idols", err);
            }
        };
        fetchSimilar();
    }, [idol?.company, idol?.id, idol?.positions]);

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
            const processedValue = value ? convertDriveLink(value) : value;
            setFormData(prev => ({ ...prev, image: processedValue }));
            setActiveImage(processedValue);
            setImageZoom(1);
            setImageCrop({ x: 0, y: 0 });
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

    const handleBack = () => {
        if (history.length > 0) {
            const prevIdol = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            isBackRef.current = true;
            if (onIdolClick) {
                onIdolClick(prevIdol);
            }
        }
    };

    const handleDiscard = () => {
        if (JSON.stringify(formData) !== JSON.stringify(idol)) {
            if (!window.confirm("Discard unsaved changes?")) return;
        }
        setFormData(idol);
        setEditMode(false);
        setActiveImage(idol.image);
        setImageCroppedArea(null);
    };

    const handleFetchHistory = async () => {
        setShowHistory(true);
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, 'auditLogs'),
                where('targetId', '==', idol.id),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const snapshot = await getDocs(q);
            setHistoryLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Failed to fetch history", err);
            // Fallback if index is missing or collection doesn't exist
            setHistoryLogs([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let imageToSave = formData.image;
        if (imageCroppedArea && activeImage) {
            try {
                const croppedImage = await getCroppedImgDataUrl(activeImage, imageCroppedArea);
                imageToSave = croppedImage;
            } catch (e) {
                console.error("Failed to crop image", e);
            }
        }

        const updatedData = { ...formData, image: imageToSave };
        onSave(updatedData);
        
        // Update local state to reflect saved data immediately
        setFormData(updatedData);
        setActiveImage(imageToSave);
        setImageCroppedArea(null);

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

    const handleSpeak = (text, lang = 'ko-KR') => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
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
                username: (user.username || '').toLowerCase().trim(),
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
                username: (user.username || '').toLowerCase().trim(),
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
        if (!user) {
            setModalConfig({
                isOpen: true,
                title: 'Login Required',
                message: 'Please login to like comments!',
                type: 'info'
            });
            return;
        }
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

    const handleSendLove = async () => {
        if (!user || !idol?.id) return;
        try {
            const idolRef = doc(db, 'idols', idol.id);
            await updateDoc(idolRef, {
                likes: increment(1)
            });
        } catch (error) {
            console.error("Error sending love:", error);
        }
    };

    const handleDeleteComment = (commentId) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Comment',
            message: 'Are you sure you want to delete this comment?',
            type: 'danger',
            singleButton: false,
            confirmText: 'Delete',
            onConfirm: () => executeDeleteComment(commentId)
        });
    };

    const executeDeleteComment = async (commentId) => {
        try {
            await deleteDoc(doc(db, 'comments', commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    const handleMentionClick = (mention) => {
        const u = mention.substring(1).toLowerCase().trim();
        if (!u) return;
        navigate(`/u/${u}`);
        if (onUserClick) onUserClick(u);
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
                        "relative w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden h-[90vh] flex flex-col md:flex-row border transition-colors duration-500",
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

                    {history.length > 0 && !editMode && (
                        <button
                            onClick={handleBack}
                            className={cn(
                                "absolute top-6 left-6 z-20 p-2.5 rounded-full transition-all duration-300 active:scale-90 shadow-lg flex items-center gap-2 pr-4",
                                theme === 'dark' ? "bg-black/40 hover:bg-black/60 text-white" : "bg-white/80 hover:bg-white text-slate-800"
                            )}
                        >
                            <ArrowLeft size={20} />
                            <span className="text-xs font-black uppercase tracking-widest">Back</span>
                        </button>
                    )}

                    <AnimatePresence mode="wait">
                    <motion.div
                        key={formData.id || 'new'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col md:flex-row w-full h-full"
                    >
                    {/* Left Column: Image & Gallery */}
                    <div className={cn(
                        "w-full md:w-5/12 h-[350px] md:h-auto relative flex flex-col overflow-hidden",
                        theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                    )}>
                        <div className="relative flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">
                                {editMode ? (
                                    <div className="relative w-full h-full bg-slate-900">
                                        <Cropper
                                            image={activeImage}
                                            crop={imageCrop}
                                            zoom={imageZoom}
                                            aspect={3 / 4}
                                            onCropChange={setImageCrop}
                                            onCropComplete={(_, pixels) => setImageCroppedArea(pixels)}
                                            onZoomChange={setImageZoom}
                                            showGrid={false}
                                            objectFit="horizontal-cover"
                                        />
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full z-50">
                                            <ZoomOut size={14} className="text-white/80" />
                                            <input
                                                type="range"
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                value={imageZoom}
                                                onChange={(e) => setImageZoom(Number(e.target.value))}
                                                className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                                            />
                                            <ZoomIn size={14} className="text-white/80" />
                                        </div>
                                    </div>
                                ) : (
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
                                )}
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
                                                    initial={{ opacity: 1, y: 0, x: "-50%", scale: 0.5, rotate: 0 }}
                                                    animate={{ 
                                                        opacity: 0, 
                                                        y: heart.y || -150, 
                                                        x: `calc(-50% + ${heart.x || 0}px)`, 
                                                        scale: heart.scale || 1.5,
                                                        rotate: heart.rotate || 0
                                                    }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 2.5, ease: "easeOut" }}
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
                                                    handleSendLove();
                                                    const burstCount = 8 + Math.floor(Math.random() * 5);
                                                    const newHearts = Array.from({ length: burstCount }).map((_, i) => {
                                                        heartIdCounter.current += 1;
                                                        return {
                                                            id: `heart-${Date.now()}-${heartIdCounter.current}`,
                                                            x: (Math.random() - 0.5) * 100,
                                                            y: -100 - Math.random() * 100,
                                                            scale: 0.5 + Math.random() * 1,
                                                            rotate: (Math.random() - 0.5) * 60
                                                        };
                                                    });
                                                    setFloatingHearts(prev => [...prev, ...newHearts]);
                                                    setTimeout(() => setFloatingHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id))), 2500);
                                                } else {
                                                    setModalConfig({
                                                        isOpen: true,
                                                        title: 'Login Required',
                                                        message: 'Please login to like idols!',
                                                        type: 'info'
                                                    });
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
                                        <p className="text-2xl font-black text-white drop-shadow-lg"><CountUp value={formData.likes || 0} /></p>
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
                    <div ref={scrollContainerRef} className="w-full md:w-7/12 p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col">
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
                                                    if (!user) {
                                                        setModalConfig({
                                                            isOpen: true,
                                                            title: 'Login Required',
                                                            message: 'Please login to manage favorites!',
                                                            type: 'info'
                                                        });
                                                        return;
                                                    }
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
                                            onClick={() => {
                                                if (formData.groupId) {
                                                    onGroupClick(formData.groupId);
                                                    onClose();
                                                }
                                            }}
                                            className={cn(
                                                "text-xl font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 group",
                                                formData.groupId ? "text-brand-pink hover:text-brand-pink/80 cursor-pointer" : "text-slate-400"
                                            )}
                                        >
                                            <Building2 size={18} className="transition-transform group-hover:-translate-y-0.5" />
                                            {formData.group || 'Soloist'}
                                            {formData.groupId && <Activity size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>

                                        {!editMode && idol?.id && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigate(`/idol/${idol.id}`);
                                                    onClose();
                                                }}
                                                className={cn(
                                                    "mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-lg",
                                                    theme === 'dark'
                                                        ? "bg-white text-slate-900 hover:bg-slate-200"
                                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                                )}
                                            >
                                                <Rocket size={16} />
                                                <span>View more</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!editMode && isAdmin && (
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={handleFetchHistory}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-90",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                        title="View Edit History"
                                    >
                                        <History size={20} />
                                    </button>
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
                            <div className={cn(!editMode && activeTab !== 'info' && "hidden", editMode && "block")}>
                                {editMode ? (
                                    <div className="space-y-8">
                                        {/* Section 1: Basic Info */}
                                        <div className="space-y-4">
                                            <h3 className={cn("text-sm font-black uppercase tracking-widest border-b pb-2", theme === 'dark' ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200")}>Basic Information</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <DetailItem icon={User} label="Stage Name" value={formData.name} editMode={editMode} name="name" onChange={handleChange} theme={theme} />
                                                <DetailItem icon={User} label="Full Name" value={formData.fullEnglishName} editMode={editMode} name="fullEnglishName" onChange={handleChange} theme={theme} />
                                                <DetailItem
                                                    icon={Globe}
                                                    label="Korean Name"
                                                    value={formData.koreanName}
                                                    editMode={editMode}
                                                    name="koreanName"
                                                    onChange={handleChange}
                                                    theme={theme}
                                                    onAction={() => handleSpeak(formData.koreanName, 'ko-KR')}
                                                />
                                                <DetailItem
                                                    icon={Globe}
                                                    label="Thai Name"
                                                    value={formData.thaiName}
                                                    editMode={editMode}
                                                    name="thaiName"
                                                    onChange={handleChange}
                                                    theme={theme}
                                                    onAction={() => handleSpeak(formData.thaiName, 'th-TH')}
                                                />
                                                <DetailItem icon={Tag} label="Other Name(s)" value={formData.otherNames} editMode={editMode} name="otherNames" onChange={handleChange} theme={theme} />
                                                {!editMode && (
                                                    <DetailItem 
                                                        icon={Users} 
                                                        label="Group" 
                                                        value={formData.group} 
                                                        theme={theme}
                                                        onClick={(formData.groupId && onGroupClick) ? () => {
                                                            onGroupClick(formData.groupId);
                                                            onClose();
                                                        } : undefined}
                                                    />
                                                )}
                                                <DetailItem icon={Globe} label="Nationality" value={formData.nationality} editMode={editMode} name="nationality" onChange={handleChange} theme={theme} />
                                                <DetailItem icon={MapPin} label="Birth Place" value={formData.birthPlace} editMode={editMode} name="birthPlace" onChange={handleChange} theme={theme} />
                                                <DetailItem icon={Calendar} label="Birth Date" value={formData.birthDate} editMode={editMode} name="birthDate" type="date" onChange={handleChange} theme={theme} />
                                            </div>
                                        </div>

                                        {/* Section 2: Physical Stats */}
                                        <div className="space-y-4">
                                            <h3 className={cn("text-sm font-black uppercase tracking-widest border-b pb-2", theme === 'dark' ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200")}>Physical Stats</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <DetailItem icon={Ruler} label="Height" value={formData.height} editMode={editMode} name="height" onChange={handleChange} theme={theme} />
                                                <DetailItem icon={Droplet} label="Blood Type" value={formData.bloodType} editMode={editMode} name="bloodType" onChange={handleChange} theme={theme} />
                                            </div>
                                        </div>

                                        {/* Section 3: Career */}
                                        <div className="space-y-4">
                                            <h3 className={cn("text-sm font-black uppercase tracking-widest border-b pb-2", theme === 'dark' ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200")}>Career</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <DetailItem 
                                                    icon={Building2} 
                                                    label="Company" 
                                                    value={formData.company} 
                                                    editMode={editMode} 
                                                    name="company" 
                                                    onChange={handleChange} 
                                                    theme={theme} 
                                                    onClick={(!editMode && onSearch && formData.company) ? () => {
                                                        onSearch(formData.company);
                                                        onClose();
                                                    } : undefined}
                                                />
                                                <DetailItem icon={Activity} label="Debut Date" value={formData.debutDate} editMode={editMode} name="debutDate" type="date" onChange={handleChange} theme={theme} />
                                                <div className="sm:col-span-2 space-y-2">
                                                    <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block">Positions</label>
                                                    <input
                                                        value={formData.positions?.join(', ') || ''}
                                                        onChange={handlePositionsChange}
                                                        className={cn(
                                                            "w-full rounded-2xl p-4 transition-all duration-300 focus:outline-none border-2 text-sm font-bold",
                                                            theme === 'dark'
                                                                ? "bg-slate-800/50 text-white border-white/5 focus:border-brand-pink"
                                                                : "bg-slate-50 text-slate-900 border-slate-100 focus:border-brand-pink"
                                                        )}
                                                        placeholder="Lead Vocalist, Main Dancer..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 4: Media & Links */}
                                        <div className="space-y-4">
                                            <h3 className={cn("text-sm font-black uppercase tracking-widest border-b pb-2", theme === 'dark' ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200")}>Media & Links</h3>
                                            <div className="space-y-4">
                                            <DetailItem icon={Instagram} label="Instagram URL" value={formData.instagram} editMode={editMode} name="instagram" onChange={handleChange} theme={theme} />
                                            <DetailItem icon={X} label="X (Twitter) URL" value={formData.twitter} editMode={editMode} name="twitter" onChange={handleChange} theme={theme} />
                                                <div>
                                                    <DetailItem icon={Youtube} label="YouTube URL" value={formData.youtube} editMode={editMode} name="youtube" onChange={handleChange} theme={theme} />
                                                    {editMode && <p className="text-[10px] text-slate-500 mt-1 ml-1 font-medium">* แนะนำลิงก์รูปแบบ https://www.youtube.com/watch?v=... หรือ https://youtu.be/...</p>}
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between mb-1"> 
                                                        <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                                            <Globe size={12} />
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
                                                </div>

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
                                        </div>

                                        {/* Section 5: Awards */}
                                        <div className="space-y-4">
                                            <h3 className={cn("text-sm font-black uppercase tracking-widest border-b pb-2", theme === 'dark' ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200")}>Awards</h3>
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
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <DetailItem icon={User} label="Stage Name" value={formData.name} theme={theme} />
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
                                        <DetailItem 
                                            icon={Building2} 
                                            label="Company" 
                                            value={formData.company} 
                                            editMode={editMode} 
                                            name="company" 
                                            onChange={handleChange} 
                                            theme={theme} 
                                            onClick={(!editMode && onSearch && formData.company) ? () => {
                                                onSearch(formData.company);
                                                onClose();
                                            } : undefined}
                                        />
                                        <DetailItem icon={Globe} label="Nationality" value={formData.nationality} editMode={editMode} name="nationality" onChange={handleChange} theme={theme} />
                                        <DetailItem icon={MapPin} label="Birth Place" value={formData.birthPlace} editMode={editMode} name="birthPlace" onChange={handleChange} theme={theme} />
                                        <DetailItem icon={Calendar} label="Birth Date" value={formData.birthDate} editMode={editMode} name="birthDate" type="date" onChange={handleChange} theme={theme} />
                                        <DetailItem icon={User} label="Age" value={formData.birthDate ? `${calculateAge(formData.birthDate)} years old` : ''} theme={theme} />
                                        <DetailItem 
                                            icon={Star} 
                                            label="Zodiac" 
                                            value={calculateZodiac(formData.birthDate)} 
                                            theme={theme} 
                                            onClick={onSearch ? () => {
                                                onSearch(calculateZodiac(formData.birthDate).split(' ')[0]);
                                                onClose();
                                            } : undefined}
                                        />
                                        <DetailItem icon={Activity} label="Debut Date" value={formData.debutDate} editMode={editMode} name="debutDate" type="date" onChange={handleChange} theme={theme} />
                                        <DetailItem icon={Ruler} label="Height" value={formData.height} editMode={editMode} name="height" onChange={handleChange} theme={theme} />
                                        <DetailItem icon={Droplet} label="Blood Type" value={formData.bloodType} editMode={editMode} name="bloodType" onChange={handleChange} theme={theme} />

                                        <div className="sm:col-span-2 space-y-3">
                                            <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block">Positions</label>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.positions?.map((p, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={onSearch ? () => {
                                                            onSearch(p);
                                                            onClose();
                                                        } : undefined}
                                                        className={cn(
                                                        "px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all hover:scale-105 shadow-sm",
                                                        theme === 'dark'
                                                            ? "bg-slate-800 border-white/5 text-slate-300"
                                                            : "bg-white border-slate-200 text-slate-600",
                                                        onSearch && "cursor-pointer hover:text-brand-pink hover:border-brand-pink/30 hover:bg-brand-pink/5"
                                                    )}>
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2 space-y-3">
                                            <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-1 block flex items-center gap-2">
                                                <Trophy size={12} /> Awards
                                            </label>
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
                                        </div>

                                        {formData.youtube && (
                                            <div className="sm:col-span-2 space-y-3 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block flex items-center gap-2">
                                                    <Youtube size={12} /> Latest Video
                                                </label>
                                                <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative group/player">
                                                    <ReactPlayer
                                                        url={formData.youtube}
                                                        width="100%"
                                                        height="100%"
                                                        controls
                                                        config={{
                                                            youtube: {
                                                                playerVars: { showinfo: 1 }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Social Links Section */}
                                        {(formData.instagram || formData.twitter) && (
                                            <div className="sm:col-span-2 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                <h3 className={cn(
                                                    "text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2",
                                                    theme === 'dark' ? "text-slate-400" : "text-slate-500"
                                                )}>
                                                    <Globe size={14} />
                                                    Social Media
                                                </h3>
                                                <div className="flex flex-wrap gap-3">
                                                {formData.instagram && (
                                                    <a
                                                        href={formData.instagram}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-tr from-brand-pink/10 to-brand-purple/10 border border-brand-pink/20 text-brand-pink font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                                                    >
                                                        <Instagram size={20} /> Instagram
                                                    </a>
                                                )}
                                                {formData.twitter && (
                                                    <a
                                                        href={formData.twitter}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-tr from-sky-500/10 to-blue-500/10 border border-sky-500/20 text-sky-500 font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                                                    >
                                                        <X size={20} /> X
                                                    </a>
                                                )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Similar Idols Section */}
                                        {similarIdols.length > 0 && (
                                            <div className="sm:col-span-2 pt-8 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                <h3 className={cn(
                                                    "text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2",
                                                    theme === 'dark' ? "text-slate-400" : "text-slate-500"
                                                )}>
                                                    <Users size={14} />
                                                    Similar Artists
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {similarIdols.map(simIdol => (
                                                        <IdolCard
                                                            key={simIdol.id}
                                                            idol={simIdol}
                                                            onLike={onLike}
                                                            onClick={(clickedIdol) => {
                                                                if (onIdolClick) {
                                                                    onIdolClick(clickedIdol);
                                                                } else {
                                                                    navigate(`/idol/${clickedIdol.id}`);
                                                                    onClose();
                                                                }
                                                            }}
                                                            searchTerm=""
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Discography Tab Content */}
                            {!editMode && activeTab === 'discography' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {(formData.albums || []).length > 0 ? (
                                            (formData.albums || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map((album, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    whileHover={{ y: -8 }}
                                                    onClick={() => setSelectedAlbum(album)}
                                                    className={cn(
                                                        "group cursor-pointer rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300",
                                                        theme === 'dark' ? "bg-slate-800/50 border-white/5 hover:border-brand-pink/50" : "bg-white border-slate-100 hover:border-brand-pink/50"
                                                    )}
                                                >
                                                    <div className="aspect-square overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                                                        <img 
                                                            src={convertDriveLink(album.cover)} 
                                                            alt={album.title} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-2" 
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                                                            <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl">
                                                                <PlayCircle size={24} fill="currentColor" />
                                                            </div>
                                                        </div>

                                                        {album.date && (
                                                            <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                                {new Date(album.date).getFullYear()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="p-3 relative">
                                                        <h4 className={cn("font-bold text-xs leading-tight mb-1 line-clamp-1 group-hover:text-brand-pink transition-colors", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>
                                                            {album.title}
                                                        </h4>
                                                        <div className="flex items-center justify-between">
                                                             <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                                                                {album.tracks?.length || 0} Tracks
                                                            </p>
                                                            {album.youtube && <Youtube size={12} className="text-red-500" />}
                                                        </div>
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
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const u = (comment.username || '').toLowerCase().trim();
                                                            if (!u) return;
                                                            navigate(`/u/${u}`);
                                                        }}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full bg-gradient-to-tr from-brand-pink/20 to-brand-purple/20 p-0.5 shrink-0",
                                                            !(comment.username || '').trim() && "pointer-events-none"
                                                        )}
                                                        title={comment.username ? `View @${comment.username}` : ''}
                                                    >
                                                        <img src={convertDriveLink(comment.avatar) || `https://ui-avatars.com/api/?name=${comment.user}&background=random`} className="w-full h-full rounded-full object-cover" alt="" />
                                                    </button>
                                                    <div className="space-y-1 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const u = (comment.username || '').toLowerCase().trim();
                                                                    if (!u) return;
                                                                    navigate(`/u/${u}`);
                                                                }}
                                                                className={cn(
                                                                    "text-xs font-black hover:underline",
                                                                    theme === 'dark' ? "text-white" : "text-slate-900",
                                                                    !(comment.username || '').trim() && "pointer-events-none"
                                                                )}
                                                            >
                                                                {comment.user}
                                                            </button>
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
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const u = (reply.username || '').toLowerCase().trim();
                                                                if (!u) return;
                                                                navigate(`/u/${u}`);
                                                            }}
                                                            className={cn(
                                                                "w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden",
                                                                !(reply.username || '').trim() && "pointer-events-none"
                                                            )}
                                                            title={reply.username ? `View @${reply.username}` : ''}
                                                        >
                                                            <img src={convertDriveLink(reply.avatar) || `https://ui-avatars.com/api/?name=${reply.user}&background=random`} className="w-full h-full object-cover" alt="" />
                                                        </button>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const u = (reply.username || '').toLowerCase().trim();
                                                                        if (!u) return;
                                                                        navigate(`/u/${u}`);
                                                                    }}
                                                                    className={cn(
                                                                        "text-[10px] font-black hover:underline",
                                                                        theme === 'dark' ? "text-white" : "text-slate-900",
                                                                        !(reply.username || '').trim() && "pointer-events-none"
                                                                    )}
                                                                >
                                                                    {reply.user}
                                                                </button>
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

                            {editMode && (
                                <div className={cn(
                                    "pt-8 flex justify-end gap-4 border-t",
                                    theme === 'dark' ? "border-white/5" : "border-slate-100"
                                )}>
                                    <button
                                        type="button"
                                        onClick={() => mode === 'create' ? onClose() : handleDiscard()}
                                        className={cn(
                                            "px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-sm flex items-center gap-2",
                                            theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        {mode === 'create' ? <X size={16} /> : <RotateCcw size={16} />}
                                        {mode === 'create' ? 'Cancel' : 'Discard Changes'}
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
                    </AnimatePresence>
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

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowHistory(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className={cn("w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col shadow-2xl max-h-[80vh]", theme === 'dark' ? "bg-slate-900" : "bg-white")}
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>Edit History</h3>
                                <button onClick={() => setShowHistory(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                    <X size={20} className={theme === 'dark' ? "text-white" : "text-slate-900"} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                                {loadingHistory ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-pink" /></div>
                                ) : historyLogs.length === 0 ? (
                                    <p className="text-center text-slate-500">No history found.</p>
                                ) : (
                                    historyLogs.map(log => (
                                        <div key={log.id} className={cn("p-4 rounded-2xl border", theme === 'dark' ? "border-white/5 bg-slate-800/50" : "border-slate-100 bg-slate-50")}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                    {log.action || 'Update'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {log.createdAt ? new Date(log.createdAt.toMillis()).toLocaleString() : 'Unknown date'}
                                                </span>
                                            </div>
                                            <p className={cn("text-sm", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                                by <span className="font-bold">{log.userName || 'Unknown'}</span>
                                            </p>
                                            {log.changes && (
                                                <div className="mt-2 text-xs font-mono opacity-70">
                                                    {Object.keys(log.changes).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                {...modalConfig}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </AnimatePresence>
    );
}

function CountUp({ value }) {
    const ref = useRef(null);
    const prevValue = useRef(0);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const controls = animate(prevValue.current, value, {
            duration: 1.2,
            ease: [0.25, 0.1, 0.25, 1],
            onUpdate: (v) => {
                node.textContent = Math.round(v).toLocaleString();
            }
        });

        prevValue.current = value;
        return () => controls.stop();
    }, [value]);

    return <span ref={ref}>{Math.round(prevValue.current).toLocaleString()}</span>;
}

function calculateAge(dateString) {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function calculateZodiac(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries ♈";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus ♉";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini ♊";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer ♋";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo ♌";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo ♍";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra ♎";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio ♏";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius ♐";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn ♑";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius ♒";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces ♓";
    return null;
}

function DetailItem({ icon: Icon, label, value, editMode, onChange, name, type = "text", theme, onAction, onClick }) {
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
                {onClick && !editMode ? (
                    <button 
                        type="button"
                        onClick={onClick}
                        className={cn(
                            "font-black text-lg transition-colors hover:text-brand-pink hover:underline text-left flex items-center gap-2 group/link",
                            theme === 'dark' ? "text-slate-100" : "text-slate-900"
                        )}
                        title="Click to search"
                    >
                        {value || '-'}
                        <Search size={16} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </button>
                ) : (
                    <p className={cn(
                        "font-black text-lg transition-colors group-hover/detail:text-brand-pink",
                        theme === 'dark' ? "text-slate-100" : "text-slate-900"
                    )}>
                        {value || '-'}
                    </p>
                )}
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
