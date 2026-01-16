import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, Reorder } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Building2, Star, Info, ChevronRight, ChevronLeft, Music, Heart, Globe, Edit2, Loader2, MessageSquare, Send, User, Trash2, Save, X, Trophy, Plus, Disc, PlayCircle, ListMusic, ExternalLink, Youtube, Pin, Flag, Share2, Check, Search, History, Instagram, Twitter, ZoomIn, ZoomOut, RefreshCw, GripVertical, ListOrdered, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, getDocs, limit, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageCropper } from './ImageCropper';
import getCroppedImgDataUrl, { createImage, isDataUrl } from '../lib/cropImage';
import { ConfirmationModal } from './ConfirmationModal';
import { GroupCard } from './GroupCard';
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

export function GroupPage({ group, members, onBack, onMemberClick, onUpdateGroup, onDeleteGroup, onUserClick, onSearch, onGroupClick, allIdols = [] }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [displayGroup, setDisplayGroup] = useState(group);
    const [activeImage, setActiveImage] = useState(group?.image || '');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [formData, setFormData] = useState(group || {});
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('members');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [visibleComments, setVisibleComments] = useState(5);
    const [cropState, setCropState] = useState({ src: null, callback: null, aspect: 16 / 9 });
    const [loadingComments, setLoadingComments] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [newAward, setNewAward] = useState({
        year: new Date().getFullYear(),
        category: 'K-Pop & Music Awards',
        show: '',
        award: ''
    });
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        singleButton: true,
        onConfirm: null,
        confirmText: 'OK'
    });
    const [similarGroups, setSimilarGroups] = useState([]);
    const [loadingSimilarGroups, setLoadingSimilarGroups] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const [heroCrop, setHeroCrop] = useState({ x: 0, y: 0 });
    const [heroZoom, setHeroZoom] = useState(1);
    const [heroCroppedArea, setHeroCroppedArea] = useState(null);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);


    const [memberSearch, setMemberSearch] = useState('');
    const [editingMembers, setEditingMembers] = useState([]);
    const [selectedTimelineMember, setSelectedTimelineMember] = useState(null);
    const [news, setNews] = useState([]);
    const [loadingNews, setLoadingNews] = useState(false);
    const [newsSourceFilter, setNewsSourceFilter] = useState('all');

    const filteredNews = useMemo(() => {
        if (newsSourceFilter === 'all') return news;
        return news.filter(item => item.provider?.[0]?.name.toLowerCase().includes(newsSourceFilter.toLowerCase()));
    }, [news, newsSourceFilter]);

    const calculateAgeAtDate = (birthDate, targetDate) => {
        if (!birthDate || !targetDate) return null;
        const birth = new Date(birthDate);
        const target = new Date(targetDate);
        let age = target.getFullYear() - birth.getFullYear();
        const m = target.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
        return age;
    };

    const sortedMembers = useMemo(() => {
        if (!members) return [];
        const currentMemberIds = displayGroup?.members || [];
        
        const memberMap = new Map(members.map(m => [m.id, m]));
        const ordered = currentMemberIds.map(id => memberMap.get(id)).filter(Boolean);
        const orderedIds = new Set(ordered.map(m => m.id));
        const remaining = members.filter(m => !orderedIds.has(m.id));
        return [...ordered, ...remaining];
    }, [members, displayGroup?.members]);

    const editingMembersList = useMemo(() => {
        const memberIds = formData.members || [];
        const memberMap = new Map(allIdols.map(m => [m.id, m]));
        return memberIds.map(id => memberMap.get(id)).filter(Boolean);
    }, [formData.members, allIdols]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setMemberSearch('');
            }
        };

        if (memberSearch) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [memberSearch]);

    const timelineMembers = useMemo(() => {
        return [...(members || [])].sort((a, b) => {
            const dateA = new Date(a.debutDate || '9999-12-31');
            const dateB = new Date(b.debutDate || '9999-12-31');
            return dateA - dateB;
        });
    }, [members]);

    useEffect(() => {
        setSelectedTimelineMember(null);
    }, [activeTab]);

    useEffect(() => {
        if (!displayGroup?.id) return;
        setLoadingComments(true);

        const q = query(
            collection(db, 'comments'),
            where('targetId', '==', displayGroup.id),
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
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

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
    }, [displayGroup?.id, user]);

    useEffect(() => {
        if (!displayGroup?.company) return;

        const fetchSimilar = async () => {
            setLoadingSimilarGroups(true);
            try {
                const q = query(
                    collection(db, 'groups'),
                    where('company', '==', displayGroup.company),
                    limit(5)
                );
                const snapshot = await getDocs(q);
                const results = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(g => g.id !== displayGroup.id);
                setSimilarGroups(results);
            } catch (err) {
                console.error("Error fetching similar groups", err);
            } finally {
                setLoadingSimilarGroups(false);
            }
        };
        fetchSimilar();
    }, [displayGroup?.company, displayGroup?.id]);

    useEffect(() => {
        if (activeTab === 'news' && displayGroup?.name) {
            fetchNews();
        }
    }, [activeTab, displayGroup?.name]);

    const fetchNews = async () => {
        setLoadingNews(true);
        try {
            const groupNameLower = displayGroup.name.toLowerCase();
            const koreanNameLower = (displayGroup.koreanName || '').toLowerCase();
            let mappedNews = [];

            // 1. Try Koreaboo RSS via rss2json
            try {
                const rssUrl = 'https://www.koreaboo.com/feed/';
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
            
                const response = await fetch(apiUrl);
                const data = await response.json();

                if (data.status === 'ok') {
                    const filteredItems = data.items.filter(item => {
                        const title = (item.title || '').toLowerCase();
                        return title.includes(groupNameLower) || (koreanNameLower && title.includes(koreanNameLower));
                    });

                    if (filteredItems.length > 0) {
                        mappedNews = filteredItems.map(item => {
                            // Try to find image in description if not in thumbnail/enclosure
                            let contentImg = null;
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            if (imgMatch) {
                                contentImg = imgMatch[1];
                            }

                            return {
                            name: item.title,
                            url: item.link,
                            description: item.description?.replace(/<[^>]+>/g, '').substring(0, 200) + '...',
                            datePublished: item.pubDate,
                            provider: [{ name: data.feed?.title || 'Koreaboo' }],
                            image: { 
                                thumbnail: { 
                                    // Prioritize thumbnail, then enclosure, then extracted from content, then fallback
                                    contentUrl: item.thumbnail || item.enclosure?.link || contentImg || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop&q=60'
                                } 
                            }
                        }});
                    }
                }
            } catch (err) {
                console.warn("Koreaboo fetch failed, trying fallback...", err);
            }

            // 2. Fallback: Google News RSS via rss2json
            if (mappedNews.length === 0) {
                try {
                    const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(displayGroup.name + ' kpop')}&hl=en-US&gl=US&ceid=US:en`;
                    const googleApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(googleRssUrl)}`;
                    
                    const response = await fetch(googleApiUrl);
                    const data = await response.json();

                    if (data.status === 'ok') {
                        mappedNews = data.items.map(item => {
                            // Try to find image in description if not in thumbnail/enclosure
                            let contentImg = null;
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            if (imgMatch) {
                                contentImg = imgMatch[1];
                            }
                            return {
                            name: item.title,
                            url: item.link,
                            description: item.description?.replace(/<[^>]+>/g, '').substring(0, 200) + '...',
                            datePublished: item.pubDate,
                            provider: [{ name: 'Google News' }],
                            image: { 
                            thumbnail: {
                                    contentUrl: item.thumbnail || item.enclosure?.link || contentImg || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop&q=60'
                                } 
                            }
                        }});
                    }
                } catch (err) {
                    console.error("Google News fallback failed", err);
                }
            }

            setNews(mappedNews);
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoadingNews(false);
        }
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
                            targetId: displayGroup.id,
                            targetType: 'group',
                            targetName: displayGroup.name,
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
                targetId: displayGroup.id,
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
                username: (user.username || '').toLowerCase().trim(),
                avatar: user.avatar || '',
                targetId: displayGroup.id,
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

    const handlePinComment = async (commentId, currentPinnedStatus) => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, 'comments', commentId), {
                isPinned: !currentPinnedStatus
            });
        } catch (error) {
            console.error("Error pinning comment:", error);
        }
    };

    const handleReportComment = (commentId) => {
        if (!user) {
            setModalConfig({
                isOpen: true,
                title: 'Login Required',
                message: 'Please login to report comments.',
                type: 'info'
            });
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Report Comment',
            message: 'Are you sure you want to report this comment?',
            type: 'danger',
            singleButton: false,
            confirmText: 'Report',
            onConfirm: () => executeReportComment(commentId)
        });
    };

    const executeReportComment = async (commentId) => {
        try {
            await addDoc(collection(db, 'reports'), {
                targetId: commentId,
                targetType: 'comment',
                reportedBy: user.uid || user.id,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            setModalConfig({
                isOpen: true,
                title: 'Report Sent',
                message: 'Thank you. We will review this comment.',
                type: 'success'
            });
        } catch (error) {
            console.error("Error reporting comment:", error);
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: 'Failed to send report.',
                type: 'danger'
            });
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
        const u = mention.substring(1).toLowerCase().trim();
        if (!u) return;
        navigate(`/u/${u}`);
        if (onUserClick) onUserClick(u);
    };

    // Sync activeImage when group data changes from Firestore
    useEffect(() => {
        if (group) {
            setDisplayGroup(group);
            setActiveImage(group.image);
            setFormData(group);
        }
    }, [group]);

    useEffect(() => {
        setVisibleComments(5);
    }, [displayGroup?.id]);

    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const y2 = useTransform(scrollY, [0, 400], [0, -50]);

    const allImages = displayGroup ? [displayGroup.image, ...(displayGroup.gallery || [])].filter(Boolean) : [];

    // Filter root comments and replies
    const rootComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
    });

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

    const startCropping = (url, callback, aspect = 16 / 9) => {
        if (!url || isDataUrl(url)) {
            callback(url);
            return;
        }
        setCropState({ src: url, callback, aspect });
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

    if (!displayGroup) return (
        <div className="py-20 text-center">
            <h2 className="text-4xl font-black text-white">Group not found</h2>
            <button onClick={onBack} className="mt-8 px-10 py-4 bg-brand-pink text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-pink/20">Go Back Home</button>
        </div>
    );

    const handleSaveGroup = async () => {
        let imageToSave = formData.image;
        if (heroCroppedArea && activeImage) {
            try {
                const croppedImage = await getCroppedImgDataUrl(activeImage, heroCroppedArea);
                imageToSave = croppedImage;
            } catch (e) {
                console.error("Failed to crop hero image", e);
            }
        }

        // Handle Member Updates
        const originalMemberIds = group.members || [];
        const newMemberIds = formData.members || [];
        
        const addedMembers = newMemberIds.filter(id => !originalMemberIds.includes(id));
        const removedMembers = originalMemberIds.filter(id => !newMemberIds.includes(id));

        if (addedMembers.length > 0 || removedMembers.length > 0) {
            const batch = writeBatch(db);
            
            // Update added members
            addedMembers.forEach(idolId => {
                const idolRef = doc(db, 'idols', idolId);
                batch.update(idolRef, { 
                    groupId: displayGroup.id, 
                    group: formData.name 
                });
            });

            // Update removed members
            removedMembers.forEach(idolId => {
                const idolRef = doc(db, 'idols', idolId);
                batch.update(idolRef, { 
                    groupId: null, 
                    group: null 
                });
            });
            await batch.commit();
        }

        await onUpdateGroup(displayGroup.id, { ...formData, image: imageToSave, members: newMemberIds });
        setIsEditing(false);
        setIsReordering(false);
        setActiveImage(imageToSave);
    };

    const handleAddAward = () => {
        if (!newAward.show || !newAward.award) return;
        setFormData({ ...formData, awards: [...(formData.awards || []), { ...newAward }] });
    };

    const handleRemoveAward = (index) => {
        setFormData({ ...formData, awards: (formData.awards || []).filter((_, i) => i !== index) });
    };

    const handleGalleryChange = (index, value) => {
        startCropping(value, (newUrl) => {
            const newGallery = [...(formData.gallery || [])];
            newGallery[index] = newUrl;
            setFormData({ ...formData, gallery: newGallery });
        }, 1 / 1);
    };

    const addGalleryImage = () => {
        setFormData({ ...formData, gallery: [...(formData.gallery || []), ''] });
    };

    const removeGalleryImage = (index) => {
        const newGallery = (formData.gallery || []).filter((_, i) => i !== index);
        setFormData({ ...formData, gallery: newGallery });
    };

    const handleAlbumChange = (index, field, value) => {
        const newAlbums = [...(formData.albums || [])];
        if (!newAlbums[index]) newAlbums[index] = {};
        newAlbums[index][field] = value;
        setFormData({ ...formData, albums: newAlbums });
    };

    const addAlbum = () => {
        setFormData({
            ...formData,
            albums: [...(formData.albums || []), { title: '', cover: '', date: '', youtube: '', tracks: [] }]
        });
    };

    const removeAlbum = (index) => {
        const newAlbums = (formData.albums || []).filter((_, i) => i !== index);
        setFormData({ ...formData, albums: newAlbums });
    };

    const handleRefresh = async () => {
        if (!displayGroup?.id) return;
        setRefreshing(true);
        try {
            const docRef = doc(db, 'groups', displayGroup.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const newData = { id: docSnap.id, ...docSnap.data() };
                setDisplayGroup(newData);
                setFormData(newData);
                setActiveImage(newData.image);
            }
        } catch (error) {
            console.error("Error refreshing group:", error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="py-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Social Media Links (Top) */}
            {!isEditing && (displayGroup?.instagram || displayGroup?.twitter || displayGroup?.youtube) && (
                <div className="flex justify-end gap-3 px-2">
                    {displayGroup.instagram && (
                        <a href={displayGroup.instagram} target="_blank" rel="noopener noreferrer" className={cn("p-3 rounded-2xl transition-all hover:scale-110 shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest", theme === 'dark' ? "bg-slate-900 text-pink-500 hover:bg-pink-500 hover:text-white border border-white/10" : "bg-white text-pink-500 hover:bg-pink-500 hover:text-white border border-slate-100")}>
                            <Instagram size={18} />
                            <span className="hidden sm:inline">Instagram</span>
                        </a>
                    )}
                    {displayGroup.twitter && (
                        <a href={displayGroup.twitter} target="_blank" rel="noopener noreferrer" className={cn("p-3 rounded-2xl transition-all hover:scale-110 shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest", theme === 'dark' ? "bg-slate-900 text-sky-500 hover:bg-sky-500 hover:text-white border border-white/10" : "bg-white text-sky-500 hover:bg-sky-500 hover:text-white border border-slate-100")}>
                        <X size={18} />
                            <span className="hidden sm:inline">X</span>
                        </a>
                    )}
                    {displayGroup.youtube && (
                        <a href={displayGroup.youtube} target="_blank" rel="noopener noreferrer" className={cn("p-3 rounded-2xl transition-all hover:scale-110 shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-widest", theme === 'dark' ? "bg-slate-900 text-red-500 hover:bg-red-500 hover:text-white border border-white/10" : "bg-white text-red-500 hover:bg-red-500 hover:text-white border border-slate-100")}>
                            <Youtube size={18} />
                            <span className="hidden sm:inline">YouTube</span>
                        </a>
                    )}
                </div>
            )}

            {/* Header / Hero Section */}
            <section className="relative h-[40vh] min-h-[350px] md:h-[55vh] max-h-[600px] rounded-[24px] md:rounded-[48px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] group/hero perspective-1000">
                <motion.div
                    style={{ y: y1, scale }}
                    className="absolute inset-0 w-full h-full transition-all duration-700"
                >
                    {isEditing ? (
                        <div className="relative w-full h-full bg-slate-900">
                            <Cropper
                                image={activeImage}
                                crop={heroCrop}
                                zoom={heroZoom}
                                aspect={16 / 9}
                                onCropChange={setHeroCrop}
                                onCropComplete={(_, pixels) => setHeroCroppedArea(pixels)}
                                onZoomChange={setHeroZoom}
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
                                    value={heroZoom}
                                    onChange={(e) => setHeroZoom(Number(e.target.value))}
                                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                                />
                                <ZoomIn size={14} className="text-white/80" />
                            </div>
                        </div>
                    ) : (
                        <img
                            src={convertDriveLink(activeImage)}
                            alt={displayGroup.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                            }}
                        />
                    )}
                </motion.div>

                <div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className={cn(
                                "p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95",
                                refreshing && "opacity-50 cursor-not-allowed"
                            )}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className="p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95"
                            title="Share Group"
                        >
                            {isCopied ? <Check size={20} /> : <Share2 size={20} />}
                        </button>
                        {isAdmin && (
                            isEditing ? (
                                <>
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
                                </>
                            ) : (
                                <>
                                <button
                                    onClick={() => onDeleteGroup(displayGroup.id)}
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
                                </>
                            )
                        )}
                    </div>
                </div>

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
                    className="absolute bottom-6 md:bottom-12 left-4 md:left-10 right-4 md:right-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 z-10"
                >
                    <div className="max-w-3xl">
                        {isEditing ? (
                            <div className="space-y-4 bg-black/40 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                                <input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-transparent text-3xl md:text-5xl font-black text-white border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-white/20"
                                    placeholder="Group Name"
                                />
                                <input
                                    value={formData.koreanName || ''}
                                    onChange={e => setFormData({...formData, koreanName: e.target.value})}
                                    className="w-full bg-transparent text-lg md:text-2xl font-black text-brand-pink border-b border-white/20 focus:border-brand-pink focus:outline-none placeholder:text-brand-pink/20"
                                    placeholder="Korean Name"
                                />
                                <div className="flex items-center gap-2">
                                    <Globe size={16} className="text-white/50" />
                                    <input
                                        value={formData.image || ''}
                                        onChange={(e) => {
                                            const newUrl = e.target.value;
                                            setFormData({ ...formData, image: newUrl });
                                            setActiveImage(newUrl);
                                            setHeroZoom(1);
                                            setHeroCrop({ x: 0, y: 0 });
                                        }}
                                        className="w-full bg-transparent text-sm font-medium text-white/80 border-b border-white/20 focus:border-brand-pink focus:outline-none"
                                        placeholder="Hero Image URL"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-1 md:mb-2 tracking-tighter leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                    {displayGroup.name}
                                </h1>
                                <p className="text-lg md:text-2xl lg:text-3xl text-brand-pink/90 font-black tracking-widest drop-shadow-2xl italic">
                                    {displayGroup.koreanName}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 md:gap-4">
                        <div className="px-4 md:px-6 py-3 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[80px] md:min-w-[120px] group/stat hover:border-brand-pink/50 transition-colors">
                            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-1 group-hover/stat:text-brand-pink transition-colors">Members</p>
                            <p className="text-xl md:text-3xl font-black text-white">{members.length}</p>
                        </div>
                        <div className="px-4 md:px-6 py-3 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[80px] md:min-w-[120px] group/stat hover:border-brand-blue/50 transition-colors">
                            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-1 group-hover/stat:text-brand-blue transition-colors">Fanclub</p>
                            {isEditing ? (
                                <input
                                    value={formData.fanclub || ''}
                                    onChange={e => setFormData({...formData, fanclub: e.target.value})}
                                    className="w-full bg-transparent text-xl md:text-3xl font-black text-brand-blue text-center border-b border-white/20 focus:border-brand-blue focus:outline-none"
                                />
                            ) : (
                                <p className="text-xl md:text-3xl font-black text-brand-blue drop-shadow-sm">{displayGroup.fanclub || '-'}</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2 md:px-4">
                {/* Left Column: Info & Description */}
                {activeTab === 'members' && (
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                            "p-6 md:p-8 rounded-[32px] space-y-6 border shadow-xl relative overflow-hidden",
                            theme === 'dark' ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-slate-200"
                        )}
                    >
                        <div className="absolute top-0 right-0 p-8 text-brand-purple opacity-5 rotate-12">
                            <Music size={120} />
                        </div>

                        <h3 className={cn(
                            "text-xl font-black flex items-center gap-3",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                        )}>
                            <div className="p-2.5 rounded-xl bg-brand-purple/10 text-brand-purple">
                                <Info size={20} />
                            </div>
                            Information
                        </h3>

                        <div className="space-y-4">
                            <InfoRow
                                icon={Building2}
                                label="Foundation"
                                value={isEditing ? (
                                    <input 
                                        value={formData.company || ''} 
                                        onChange={e => setFormData({...formData, company: e.target.value})}
                                        className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                    />
                                ) : (displayGroup.company || '-')}
                                onClick={(!isEditing && onSearch && displayGroup.company) ? () => {
                                    onSearch(displayGroup.company);
                                    onBack();
                                } : undefined}
                                theme={theme}
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Debut Era"
                                value={isEditing ? (
                                    <input 
                                        type="date"
                                        value={formData.debutDate || ''} 
                                        onChange={e => setFormData({...formData, debutDate: e.target.value})}
                                        className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                    />
                                ) : (displayGroup.debutDate || '-')}
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
                            <div className={cn("pt-4 border-t", theme === 'dark' ? "border-white/10" : "border-slate-100")}>
                                <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                    <Trophy size={12} /> Awards
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
                                                                <div className="text-xs text-slate-500 font-medium">{item.award}</div>
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
                                        {(displayGroup.awards || []).length > 0 ? (
                                            [...(displayGroup.awards || [])].sort((a, b) => { // Sorting logic updated here
                                                const yearA = typeof a === 'object' ? Number(a.year) : 0;
                                                const yearB = typeof b === 'object' ? Number(b.year) : 0;
                                                if (yearB !== yearA) return yearB - yearA;
                                                const nameA = typeof a === 'object' ? `${a.show || ''} ${a.award || ''}` : String(a);
                                                const nameB = typeof b === 'object' ? `${b.show || ''} ${b.award || ''}` : String(b);
                                                return nameA.localeCompare(nameB);
                                            }).map((award, i) => (
                                                <span key={i} className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-2",
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
                            "pt-6 border-t",
                            theme === 'dark' ? "border-white/10" : "border-slate-100"
                        )}>
                            {isEditing ? (
                                <textarea
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className={cn(
                                        "w-full h-32 bg-transparent border-2 rounded-xl p-3 focus:outline-none resize-none text-sm",
                                        theme === 'dark' ? "border-white/10 text-slate-300 focus:border-brand-pink" : "border-slate-200 text-slate-600 focus:border-brand-pink"
                                    )}
                                />
                            ) : (
                                <p className={cn(
                                    "leading-relaxed text-base font-medium italic relative z-10",
                                    theme === 'dark' ? "text-slate-400" : "text-slate-600"
                                )}>
                                    {displayGroup.description ? `"${displayGroup.description}"` : "No description available."}
                                </p>
                            )}
                        </div>

                        {/* Social Media Section */}
                        <div className={cn(
                            "pt-6 border-t",
                            theme === 'dark' ? "border-white/10" : "border-slate-100"
                        )}>
                            <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                <Globe size={12} /> Social Media
                            </h4>
                            
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Instagram size={16} className="text-slate-400" />
                                        <input 
                                            value={formData.instagram || ''} 
                                            onChange={e => setFormData({...formData, instagram: e.target.value})}
                                            className={cn("w-full bg-transparent border-b p-2 text-sm focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                            placeholder="Instagram URL"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                    <X size={16} className="text-slate-400" />
                                        <input 
                                            value={formData.twitter || ''} 
                                            onChange={e => setFormData({...formData, twitter: e.target.value})}
                                            className={cn("w-full bg-transparent border-b p-2 text-sm focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                            placeholder="X (Twitter) URL"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Youtube size={16} className="text-slate-400" />
                                        <input 
                                            value={formData.youtube || ''} 
                                            onChange={e => setFormData({...formData, youtube: e.target.value})}
                                            className={cn("w-full bg-transparent border-b p-2 text-sm focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                            placeholder="YouTube Channel URL"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {displayGroup.instagram && (
                                        <a href={displayGroup.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-pink-500/10 to-purple-500/10 text-pink-500 hover:scale-105 transition-transform border border-pink-500/20 font-bold text-xs">
                                            <Instagram size={16} /> Instagram
                                        </a>
                                    )}
                                    {displayGroup.twitter && (
                                        <a href={displayGroup.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-sky-500/10 to-blue-500/10 text-sky-500 hover:scale-105 transition-transform border border-sky-500/20 font-bold text-xs">
                                        <X size={16} /> X
                                        </a>
                                    )}
                                    {displayGroup.youtube && (
                                        <a href={displayGroup.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-red-500/10 to-orange-500/10 text-red-500 hover:scale-105 transition-transform border border-red-500/20 font-bold text-xs">
                                            <Youtube size={16} /> YouTube
                                        </a>
                                    )}
                                    {!displayGroup.instagram && !displayGroup.twitter && !displayGroup.youtube && (
                                        <span className="text-sm text-slate-500 italic">No social media links.</span>
                                    )}
                                </div>
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
                                "p-6 rounded-[32px] border",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={cn("text-xl font-black tracking-tight uppercase tracking-[0.2em] text-xs", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Official Archives</h3>
                                {isEditing && (
                                    <button onClick={addGalleryImage} className="text-xs font-black uppercase tracking-widest text-brand-pink flex items-center gap-1 hover:underline">
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
                )}

                {/* Right Column: Members List */}
                <div className={cn("space-y-8", activeTab === 'members' ? "lg:col-span-8" : "lg:col-span-12")}>
                    <div className="flex items-center justify-between flex-wrap gap-y-3">
                        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab('members')}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab('members')}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-4xl font-black flex items-center gap-3 transition-all cursor-pointer",
                                    activeTab === 'members'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'members' ? (
                                    <motion.div layoutId="tab-icon" className="p-2.5 md:p-3 rounded-2xl bg-brand-pink/10 text-brand-pink shadow-inner">
                                        <Users size={24} />
                                    </motion.div>
                                ) : <Users size={24} />}
                                Members
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab('timeline')}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab('timeline')}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-4xl font-black flex items-center gap-3 transition-all",
                                    activeTab === 'timeline'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'timeline' ? (
                                    <motion.div layoutId="tab-icon" className="p-2.5 md:p-3 rounded-2xl bg-brand-pink/10 text-brand-pink shadow-inner">
                                        <History size={24} />
                                    </motion.div>
                                ) : <History size={24} />}
                                Timeline
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab('discography')}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab('discography')}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-4xl font-black flex items-center gap-3 transition-all",
                                    activeTab === 'discography'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'discography' ? (
                                    <motion.div layoutId="tab-icon" className="p-2.5 md:p-3 rounded-2xl bg-brand-purple/10 text-brand-purple shadow-inner">
                                        <Disc size={24} fill="currentColor" />
                                    </motion.div>
                                ) : <Disc size={24} />}
                                Discography
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab('news')}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab('news')}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-4xl font-black flex items-center gap-3 transition-all",
                                    activeTab === 'news'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'news' ? (
                                    <motion.div layoutId="tab-icon" className="p-2.5 md:p-3 rounded-2xl bg-green-500/10 text-green-500 shadow-inner">
                                        <Newspaper size={24} fill="currentColor" />
                                    </motion.div>
                                ) : <Newspaper size={24} />}
                                News
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab('comments')}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab('comments')}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-4xl font-black flex items-center gap-3 transition-all cursor-pointer",
                                    activeTab === 'comments'
                                        ? (theme === 'dark' ? "text-white" : "text-slate-900")
                                        : "text-slate-400 hover:text-slate-500 scale-90 origin-left"
                                )}
                            >
                                {activeTab === 'comments' ? (
                                    <motion.div layoutId="tab-icon" className="p-2.5 md:p-3 rounded-2xl bg-brand-blue/10 text-brand-blue shadow-inner">
                                        <MessageSquare size={24} />
                                    </motion.div>
                                ) : <MessageSquare size={24} />}
                                Fan Talk
                                <span className="text-xl md:text-2xl opacity-30 ml-2">({comments.length})</span>
                            </div>
                        </div>
                    </div>

                    {activeTab === 'members' ? (
                        <>
                            {isEditing && !isReordering && (
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => setIsReordering(!isReordering)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                            isReordering 
                                                ? "bg-brand-pink text-white shadow-lg shadow-brand-pink/20" 
                                                : (theme === 'dark' ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")
                                        )}
                                    >
                                        {isReordering ? <Check size={16} /> : <ListOrdered size={16} />}
                                        {isReordering ? "Done Reordering" : "Reorder Members"}
                                    </button>
                                </div>
                            )}

                            {isEditing && (
                                <div className="space-y-6 mb-8 p-6 rounded-2xl border border-dashed border-brand-pink/30 bg-brand-pink/5">
                                    <div className="space-y-3">
                                        <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                            <Users size={12} /> Manage Members
                                        </label>
                                        
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                            <input
                                                ref={searchInputRef}
                                                value={memberSearch}
                                                onChange={e => setMemberSearch(e.target.value)}
                                                className={cn(
                                                    "w-full rounded-2xl py-3 pl-12 pr-4 border-2 focus:outline-none transition-all text-sm font-bold",
                                                    theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
                                                )}
                                                placeholder="Search idols to add..."
                                            />
                                            {memberSearch && (
                                                <div 
                                                    ref={dropdownRef}
                                                    className={cn(
                                                    "absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto",
                                                    theme === 'dark' ? "bg-slate-800 border-white/10" : "bg-white border-slate-200"
                                                )}>
                                                    {allIdols.filter(i => 
                                                        !(formData.members || []).includes(i.id) && 
                                                        (i.name.toLowerCase().includes(memberSearch.toLowerCase()) || (i.koreanName && i.koreanName.includes(memberSearch)))
                                                    ).slice(0, 10).map(idol => (
                                                        <button
                                                            key={idol.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (idol.groupId && idol.groupId !== displayGroup.id) {
                                                                    setModalConfig({
                                                                        isOpen: true,
                                                                        title: 'Move Member',
                                                                        message: `${idol.name} is already in "${idol.group}". Do you want to move them to this group?`,
                                                                        type: 'info',
                                                                        singleButton: false,
                                                                        confirmText: 'Move',
                                                                        onConfirm: () => setFormData(prev => ({ ...prev, members: [...(prev.members || []), idol.id] }))
                                                                    });
                                                                    setMemberSearch('');
                                                                    return;
                                                                }
                                                                setFormData(prev => ({ ...prev, members: [...(prev.members || []), idol.id] }));
                                                                setMemberSearch('');
                                                                searchInputRef.current?.focus();
                                                            }}
                                                            className={cn(
                                                                "w-full p-3 flex items-center gap-3 hover:bg-brand-pink/10 transition-colors text-left",
                                                                theme === 'dark' ? "text-white" : "text-slate-900"
                                                            )}
                                                        >
                                                            <img src={convertDriveLink(idol.image)} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                            <div>
                                                                <p className="text-sm font-bold">{idol.name}</p>
                                                                <p className="text-xs text-slate-500">{idol.group || 'Soloist'}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isReordering ? (
                                <Reorder.Group 
                                    axis="y" 
                                    values={editingMembersList} 
                                    onReorder={(newOrder) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            members: newOrder.map(m => m.id)
                                        }));
                                    }}
                                    className="space-y-4"
                                >
                                    {editingMembersList.map((member) => (
                                        <Reorder.Item key={member.id} value={member}>
                                            <div className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl border cursor-grab active:cursor-grabbing",
                                                theme === 'dark' ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"
                                            )}>
                                                <GripVertical className="text-slate-400" />
                                                <img src={convertDriveLink(member.image)} className="w-12 h-12 rounded-full object-cover" alt="" />
                                                <div className="font-bold">{member.name}</div>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            ) : isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                                    {editingMembersList.map((member, idx) => (
                                        <MemberCard
                                            key={member.id || idx} member={member} theme={theme}
                                            onClick={() => onMemberClick(member)} onImageClick={(img) => setLightboxImage(img)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <motion.div
                                    key="members"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
                                    }}
                                    initial="hidden"
                                    animate="show"
                                    className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8"
                                >
                                    {sortedMembers.map((member, idx) => (
                                        <MemberCard
                                            key={member.id || idx}
                                            member={member}
                                            theme={theme}
                                            onClick={() => onMemberClick(member)}
                                            onImageClick={(img) => setLightboxImage(img)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </>
                    ) : activeTab === 'timeline' ? (
                        <motion.div
                            key="timeline"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl mx-auto py-8 relative"
                        >
                            {/* Vertical Line */}
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: "100%" }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className={cn(
                                    "absolute left-8 md:left-1/2 top-0 w-0.5 -ml-px",
                                    theme === 'dark' ? "bg-slate-800" : "bg-slate-200"
                                )} 
                            />

                            {timelineMembers.map((member, index) => {
                                const isSelected = selectedTimelineMember?.id === member.id;
                                return (
                                <div key={member.id} className={cn(
                                    "relative flex items-center mb-12 last:mb-0",
                                    index % 2 === 0 ? "md:flex-row-reverse" : ""
                                )}>
                                    {/* Spacer for alternating layout */}
                                    <div className="hidden md:block flex-1" />
                                    
                                    {/* Dot */}
                                    <div className={cn(
                                        "absolute left-8 md:left-1/2 w-4 h-4 rounded-full border-4 -ml-2 z-10 transition-colors duration-300",
                                        isSelected ? "bg-brand-pink border-brand-pink" : (theme === 'dark' ? "bg-slate-900 border-brand-pink" : "bg-white border-brand-pink")
                                    )} />

                                    {/* Content */}
                                    <div className={cn(
                                        "flex-1 ml-16 md:ml-0 pl-0",
                                        index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                                    )}>
                                        <motion.div 
                                            layout
                                            className={cn(
                                            "rounded-3xl border transition-all cursor-pointer group overflow-hidden",
                                            theme === 'dark' ? "bg-slate-900/60 border-white/5 hover:border-brand-pink/30" : "bg-white border-slate-100 hover:border-brand-pink/30 shadow-lg",
                                            isSelected && "ring-2 ring-brand-pink border-brand-pink/50"
                                        )} onClick={() => setSelectedTimelineMember(isSelected ? null : member)}>
                                            <div className={cn(
                                                "flex items-center gap-4",
                                                "p-6",
                                                index % 2 === 0 ? "md:flex-row-reverse" : ""
                                            )}>
                                                <img 
                                                    src={convertDriveLink(member.image)} 
                                                    className="w-16 h-16 rounded-2xl object-cover shadow-md"
                                                    alt={member.name}
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-brand-pink uppercase tracking-widest mb-1">
                                                        Joined {member.debutDate ? new Date(member.debutDate).getFullYear() : 'Unknown'}
                                                    </p>
                                                    <h4 className={cn("text-xl font-black group-hover:text-brand-pink transition-colors", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                                        {member.name}
                                                    </h4>
                                                    {member.birthDate && member.debutDate && (
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                                            Debut Age: {calculateAgeAtDate(member.birthDate, member.debutDate)}
                                                        </p>
                                                    )}
                                                    <p className={cn("text-xs font-bold", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                                        {member.debutDate || 'Date N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className={cn(
                                                            "border-t border-dashed",
                                                            theme === 'dark' ? "border-white/10" : "border-slate-200"
                                                        )}
                                                    >
                                                        <div className={cn("p-6 space-y-6 text-left")}>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Full Name</p>
                                                                    <p className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-slate-900")}>{member.fullEnglishName || '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Korean Name</p>
                                                                    <p className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-slate-900")}>{member.koreanName || '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Birth Date</p>
                                                                    <p className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-slate-900")}>{member.birthDate || '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Nationality</p>
                                                                    <p className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-slate-900")}>{member.nationality || '-'}</p>
                                                                </div>
                                                            </div>

                                                            {member.positions && member.positions.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider">Positions</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {member.positions.map((pos, i) => (
                                                                            <span key={i} className={cn(
                                                                                "px-2 py-1 rounded-lg text-[10px] font-bold border",
                                                                                theme === 'dark' ? "bg-slate-800 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                                                                            )}>
                                                                                {pos}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onMemberClick(member);
                                                                }}
                                                                className="w-full py-3 rounded-xl bg-brand-pink text-white font-black uppercase tracking-widest hover:bg-brand-pink/90 transition-all shadow-lg shadow-brand-pink/20 flex items-center justify-center gap-2 text-xs"
                                                            >
                                                                <User size={14} />
                                                                View Full Profile
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>
                                </div>
                            )})}
                        </motion.div>
                    ) : activeTab === 'news' ? (
                        <motion.div
                            key="news"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setNewsSourceFilter('all')} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors", newsSourceFilter === 'all' ? 'bg-brand-pink text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400')}>All</button>
                                    <button onClick={() => setNewsSourceFilter('Koreaboo')} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors", newsSourceFilter === 'Koreaboo' ? 'bg-brand-pink text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400')}>Koreaboo</button>
                                    <button onClick={() => setNewsSourceFilter('Google')} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors", newsSourceFilter === 'Google' ? 'bg-brand-pink text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400')}>Google News</button>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); fetchNews(); }} disabled={loadingNews} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <RefreshCw size={16} className={cn(loadingNews && "animate-spin")} />
                                </button>
                            </div>

                            {loadingNews ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="animate-spin text-brand-pink" size={40} />
                                </div>
                            ) : filteredNews.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredNews.map((item, idx) => (
                                        <motion.a 
                                            key={idx} 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            whileHover={{ scale: 1.02 }}
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={cn(
                                                "block rounded-3xl border transition-all hover:scale-[1.02] group overflow-hidden flex flex-col h-full",
                                                theme === 'dark' ? "bg-slate-900/40 border-white/5 hover:border-brand-pink/30" : "bg-white border-slate-100 shadow-lg hover:shadow-xl"
                                            )}
                                        >
                                            <div className="h-48 w-full relative overflow-hidden shrink-0">
                                                <img 
                                                    src={item.image?.thumbnail?.contentUrl || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop&q=60'} 
                                                    alt={item.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop&q=60';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                                     <span className="text-[10px] font-black uppercase tracking-widest text-white bg-brand-pink/90 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                                                        {item.provider?.[0]?.name.replace(' News', '') || 'News'}
                                                     </span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 font-bold">
                                                    <Calendar size={12} />
                                                    <span>{getRelativeTime(new Date(item.datePublished).getTime())}</span>
                                                </div>
                                                <h3 className={cn("text-lg font-bold mb-3 line-clamp-2 group-hover:text-brand-pink transition-colors leading-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>{item.name}</h3>
                                                <p className={cn("text-sm line-clamp-3 leading-relaxed flex-1", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{item.description}</p>
                                            </div>
                                        </motion.a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-slate-500 font-medium">No news found.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : activeTab === 'comments' ? (
                        <motion.div
                            key="comments"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "p-6 md:p-8 rounded-[32px] border space-y-8",
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
                                        <div className={cn("flex gap-6 group items-start p-4 rounded-2xl transition-colors", comment.isPinned && "bg-brand-pink/5 border border-brand-pink/10")}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const u = (comment.username || '').toLowerCase().trim();
                                                    if (!u) return;
                                                    navigate(`/u/${u}`);
                                                }}
                                                className={cn(
                                                    "w-14 h-14 rounded-full bg-gradient-to-tr from-brand-blue/20 to-brand-purple/20 p-0.5 shrink-0 shadow-lg",
                                                    !(comment.username || '').trim() && "pointer-events-none"
                                                )}
                                                title={comment.username ? `View @${comment.username}` : ''}
                                            >
                                                <img src={convertDriveLink(comment.avatar) || `https://ui-avatars.com/api/?name=${comment.user}&background=random`} className="w-full h-full rounded-full object-cover" alt="" />
                                            </button>
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const u = (comment.username || '').toLowerCase().trim();
                                                                if (!u) return;
                                                                navigate(`/u/${u}`);
                                                            }}
                                                            className={cn(
                                                                "text-base font-black hover:underline",
                                                                theme === 'dark' ? "text-white" : "text-slate-900",
                                                                !(comment.username || '').trim() && "pointer-events-none"
                                                            )}
                                                        >
                                                            {comment.user}
                                                        </button>
                                                        {comment.isPinned && (
                                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-pink/10 text-brand-pink text-[10px] font-bold uppercase tracking-wider border border-brand-pink/20">
                                                                <Pin size={10} fill="currentColor" /> Pinned
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">{getRelativeTime(comment.createdAt?.toMillis())}</span>
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
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handlePinComment(comment.id, comment.isPinned)}
                                                            className={cn("text-xs font-bold flex items-center gap-2 transition-colors", comment.isPinned ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")}
                                                            title={comment.isPinned ? "Unpin Comment" : "Pin Comment"}
                                                        >
                                                            <Pin size={14} className={cn(comment.isPinned && "fill-current")} /> {comment.isPinned ? "Unpin" : "Pin"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleReportComment(comment.id)}
                                                        className="text-xs font-bold flex items-center gap-2 transition-colors text-slate-400 hover:text-red-500"
                                                        title="Report"
                                                    >
                                                        <Flag size={14} />
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
                                            <div key={reply.id} className={cn("ml-20 flex gap-4 group/reply p-3 rounded-xl transition-colors", reply.isPinned && "bg-brand-pink/5 border border-brand-pink/10")}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const u = (reply.username || '').toLowerCase().trim();
                                                        if (!u) return;
                                                        navigate(`/u/${u}`);
                                                    }}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden shadow-md",
                                                        !(reply.username || '').trim() && "pointer-events-none"
                                                    )}
                                                    title={reply.username ? `View @${reply.username}` : ''}
                                                >
                                                    <img src={convertDriveLink(reply.avatar) || `https://ui-avatars.com/api/?name=${reply.user}&background=random`} className="w-full h-full object-cover" alt="" />
                                                </button>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const u = (reply.username || '').toLowerCase().trim();
                                                                if (!u) return;
                                                                navigate(`/u/${u}`);
                                                            }}
                                                            className={cn(
                                                                "text-sm font-black hover:underline",
                                                                theme === 'dark' ? "text-white" : "text-slate-900",
                                                                !(reply.username || '').trim() && "pointer-events-none"
                                                            )}
                                                        >
                                                            {reply.user}
                                                        </button>
                                                        {reply.isPinned && (
                                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-pink/10 text-brand-pink text-[10px] font-bold uppercase tracking-wider border border-brand-pink/20">
                                                                <Pin size={10} fill="currentColor" /> Pinned
                                                            </span>
                                                        )}
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
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handlePinComment(reply.id, reply.isPinned)}
                                                                className={cn("text-xs font-bold flex items-center gap-1.5 transition-colors", reply.isPinned ? "text-brand-pink" : "text-slate-400 hover:text-brand-pink")}
                                                                title={reply.isPinned ? "Unpin Reply" : "Pin Reply"}
                                                            >
                                                                <Pin size={12} className={cn(reply.isPinned && "fill-current")} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleReportComment(reply.id)}
                                                            className="text-xs font-bold flex items-center gap-1.5 transition-colors text-slate-400 hover:text-red-500"
                                                            title="Report"
                                                        >
                                                            <Flag size={12} />
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
                    ) : (
                        /* Discography Tab */
                        <motion.div
                            key="discography"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {isEditing ? (
                                <div className="space-y-6">
                                    {(formData.albums || []).map((album, idx) => (
                                        <div key={idx} className={cn("p-6 rounded-3xl border space-y-4", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-black text-sm uppercase tracking-widest text-brand-pink">Album #{idx + 1}</h4>
                                                <button onClick={() => removeAlbum(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl"><Trash2 size={18} /></button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input placeholder="Album Title" value={album.title || ''} onChange={e => handleAlbumChange(idx, 'title', e.target.value)} className={cn("p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <input type="date" value={album.date || ''} onChange={e => handleAlbumChange(idx, 'date', e.target.value)} className={cn("p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <input placeholder="Cover Image URL" value={album.cover || ''} onChange={e => handleAlbumChange(idx, 'cover', e.target.value)} className={cn("p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <input placeholder="YouTube Playlist/Video URL" value={album.youtube || ''} onChange={e => handleAlbumChange(idx, 'youtube', e.target.value)} className={cn("p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <div className="md:col-span-2">
                                                    <textarea 
                                                        placeholder="Tracklist (one song per line)" 
                                                        value={Array.isArray(album.tracks) ? album.tracks.join('\n') : (album.tracks || '')} 
                                                        onChange={e => handleAlbumChange(idx, 'tracks', e.target.value.split('\n'))}
                                                        className={cn("w-full p-3 rounded-xl border bg-transparent outline-none font-bold min-h-[100px]", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={addAlbum} className="w-full py-4 rounded-2xl border-2 border-dashed border-brand-pink/30 text-brand-pink font-black uppercase tracking-widest hover:bg-brand-pink/5 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={20} /> Add Album
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {(displayGroup.albums || []).length > 0 ? (
                                        (displayGroup.albums || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map((album, idx) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
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
                                        <div className="col-span-full text-center py-20">
                                            <Disc size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                                            <p className="text-slate-500 font-medium">No discography added yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Similar Groups Section */}
            {(loadingSimilarGroups || similarGroups.length > 0) && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-10">
                    <h3 className={cn(
                        "text-2xl font-black mb-8 flex items-center gap-3",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>
                        <Users className="text-brand-purple" />
                        Similar Groups from {displayGroup.company}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loadingSimilarGroups ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={cn(
                                    "aspect-[3/4.2] rounded-[48px] overflow-hidden relative",
                                    theme === 'dark' ? "bg-slate-900" : "bg-slate-100"
                                )}>
                                    <div className={cn(
                                        "absolute inset-0 animate-pulse",
                                        theme === 'dark' ? "bg-slate-800" : "bg-slate-200"
                                    )} />
                                    <div className="absolute bottom-8 left-8 right-8 space-y-4 opacity-50">
                                        <div className={cn("h-3 w-1/3 rounded-full", theme === 'dark' ? "bg-slate-700" : "bg-slate-300")} />
                                        <div className={cn("h-8 w-2/3 rounded-full", theme === 'dark' ? "bg-slate-700" : "bg-slate-300")} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            similarGroups.map(g => (
                                <GroupCard 
                                    key={g.id} 
                                    group={g} 
                                    onClick={() => onGroupClick && onGroupClick(g.id)}
                                    onFavorite={() => {}}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

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

            {cropState.src && (
                <ImageCropper
                    imageSrc={cropState.src}
                    aspect={cropState.aspect}
                    onCropComplete={(croppedUrl) => {
                        cropState.callback(croppedUrl);
                        setCropState({ src: null, callback: null, aspect: 16/9 });
                    }}
                    onCancel={() => {
                        cropState.callback(cropState.src);
                        setCropState({ src: null, callback: null, aspect: 16/9 });
                    }}
                />
            )}

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
                            className={cn("w-full max-w-4xl rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl max-h-[80vh]", theme === 'dark' ? "bg-slate-900" : "bg-white")}
                        >
                            <div className="w-full md:w-1/2 aspect-square md:aspect-auto relative">
                                <img src={convertDriveLink(selectedAlbum.cover)} className="w-full h-full object-cover" alt={selectedAlbum.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
                                <button onClick={() => setSelectedAlbum(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 md:hidden"><X size={20} /></button>
                            </div>
                            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className={cn("text-3xl font-black leading-tight mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>{selectedAlbum.title}</h3>
                                        <p className="text-sm font-bold text-brand-pink uppercase tracking-widest">{selectedAlbum.date}</p>
                                    </div>
                                    <button onClick={() => setSelectedAlbum(null)} className="hidden md:block p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><X size={24} className={theme === 'dark' ? "text-white" : "text-slate-900"} /></button>
                                </div>
                                
                                <div className="flex-1 space-y-4 mb-8">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ListMusic size={14} /> Tracklist</h4>
                                    <div className="space-y-2">
                                        {(selectedAlbum.tracks || []).map((track, i) => (
                                            <div key={i} className={cn("flex items-center gap-4 p-3 rounded-xl transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                                <span className="text-xs font-bold text-slate-500 w-6">{String(i + 1).padStart(2, '0')}</span>
                                                <span className={cn("font-bold text-sm", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{track}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedAlbum.youtube && (
                                    <a href={selectedAlbum.youtube} target="_blank" rel="noopener noreferrer" className="w-full py-4 rounded-2xl bg-[#FF0000] text-white font-black uppercase tracking-widest hover:bg-[#CC0000] transition-colors flex items-center justify-center gap-3 shadow-lg shadow-red-500/20">
                                        <PlayCircle size={20} /> Listen on YouTube
                                    </a>
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

function MemberCard({ member, theme, onClick, onImageClick }) {
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
    
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });
    const rotateX = useTransform(mouseY, [-0.5, 0.5], [25, -25]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-25, 25]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPos = e.clientX - rect.left;
        const yPos = e.clientY - rect.top;
        
        setGlowPos({ 
            x: (xPos / rect.width) * 100, 
            y: (yPos / rect.height) * 100 
        });
        
        x.set(xPos / rect.width - 0.5);
        y.set(yPos / rect.height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { 
                    opacity: 1, y: 0, scale: 1,
                    transition: { type: "spring", stiffness: 300, damping: 30 }
                }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={cn(
                "group p-5 md:p-8 rounded-[24px] md:rounded-[32px] border text-left relative overflow-hidden transition-all duration-500 cursor-pointer",
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
                <motion.div 
                    style={{ rotateX, rotateY, perspective: 1000 }}
                    className="relative shrink-0 cursor-zoom-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        onImageClick && onImageClick(member.image);
                    }}
                >
                    <div className="absolute inset-0 bg-brand-pink blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full" />
                    <img
                        src={convertDriveLink(member.image)}
                        alt={member.name}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-[24px] md:rounded-[32px] object-cover border-4 border-white/5 shadow-2xl transition-all duration-700 group-hover:scale-110"
                    />
                    {member.isFavorite && (
                        <div className="absolute -top-3 -right-3 p-3 bg-brand-pink rounded-full text-white shadow-[0_10px_30px_rgba(255,51,153,0.5)] border-4 border-slate-950">
                            <Star size={16} fill="currentColor" />
                        </div>
                    )}
                </motion.div>

                <div className="flex-1 space-y-3">
                    <p className="text-xs text-brand-pink font-black uppercase tracking-[0.4em]">
                        {(member.positions && member.positions[0]) || 'Member'}
                    </p>
                    <h4 className={cn(
                        "text-xl md:text-2xl lg:text-3xl font-black transition-colors leading-tight tracking-tight",
                        theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink"
                    )}>
                        {member.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-3">
                        {(member.positions || []).slice(1, 3).map((pos, i) => (
                            <span key={i} className={cn(
                                "text-xs px-4 py-1.5 rounded-xl font-black uppercase tracking-widest border transition-colors",
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
        </motion.div>
    );
}

function InfoRow({ icon: Icon, label, value, theme, isHighlight, valueClass, onClick }) {
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
                <p className="text-xs text-slate-500 uppercase font-black tracking-[0.3em] mb-1">{label}</p>
                {onClick ? (
                    <button 
                        onClick={onClick}
                        className={cn(
                            "font-black text-xl tracking-tight hover:text-brand-pink hover:underline text-left transition-colors flex items-center gap-2 group/link",
                            valueClass,
                            !valueClass && (theme === 'dark' ? "text-white" : "text-slate-900"),
                            isHighlight && "text-brand-purple"
                        )}
                        title="Click to search"
                    >
                        {value}
                        <Search size={16} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </button>
                ) : (
                    <p className={cn(
                        "font-black text-xl tracking-tight",
                        valueClass,
                        !valueClass && (theme === 'dark' ? "text-white" : "text-slate-900"),
                        isHighlight && "text-brand-purple"
                    )}>{value}</p>
                )}
            </div>
        </div>
    );
}
