import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, Reorder, useAnimation } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Building2, Star, Info, ChevronRight, ChevronLeft, Music, Heart, Globe, Edit2, Loader2, MessageSquare, Send, User, Trash2, Save, X, Trophy, Plus, Disc, PlayCircle, ListMusic, ExternalLink, Youtube, Pin, Flag, Share2, Check, Search, History, Instagram, ZoomIn, ZoomOut, RefreshCw, GripVertical, ListOrdered, Newspaper, Upload, Bold, Italic, Eye, Music2, Crop as CropIcon, Maximize, Minimize, CheckSquare, Square, FileText, AlertCircle, ArrowUp, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertDriveLink } from '../lib/storage';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, getDocs, limit, getDoc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageCropper } from './ImageCropper';
import getCroppedImgDataUrl, { createImage, isDataUrl } from '../lib/cropImage';
import { ConfirmationModal } from './ConfirmationModal';
import { GroupCard } from './GroupCard';
import Cropper from 'react-easy-crop';
import { useAwards } from '../hooks/useAwards.js';
import { deleteImage, uploadImage, validateFile, compressImage, dataURLtoFile } from '../lib/upload';
import { BackgroundShapes } from './BackgroundShapes';
import { logAudit } from '../lib/audit';
import { BackToTopButton } from './BackToTopButton';

const XIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const TikTokIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

const SpotifyIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.439-1.38 9.9-0.78 13.619 1.5.42.18.6.72.122 1.321zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
);

export function GroupPage({ group, members, onBack, onMemberClick, onUpdateGroup, onDeleteGroup, onUserClick, onSearch, onGroupClick, allIdols = [], onSearchPosition, onFavoriteMember, onEditMember }) {
    const { isAdmin, user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [displayGroup, setDisplayGroup] = useState(group);
    const [activeImage, setActiveImage] = useState(group?.image || '');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
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
    const [isCopied, setIsCopied] = useState(false);

    const [heroCrop, setHeroCrop] = useState({ x: 0, y: 0 });
    const [heroZoom, setHeroZoom] = useState(1);
    const [heroCroppedArea, setHeroCroppedArea] = useState(null);
    const [heroObjectFit, setHeroObjectFit] = useState('horizontal-cover');

    const [memberSearch, setMemberSearch] = useState('');
    const [editingMembers, setEditingMembers] = useState([]);
    const [selectedTimelineMember, setSelectedTimelineMember] = useState(null);
    const [news, setNews] = useState([]);
    const [loadingNews, setLoadingNews] = useState(false);
    const [newsSourceFilter, setNewsSourceFilter] = useState('all');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isHeroUploading, setIsHeroUploading] = useState(false);
    const [heroUploadProgress, setHeroUploadProgress] = useState(0);
    const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
    const heroFileInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const [galleryItems, setGalleryItems] = useState([]);
    const [videoList, setVideoList] = useState([]);
    const [albumList, setAlbumList] = useState([]);
    const [videoPage, setVideoPage] = useState(1);
    const videosPerPage = 6;
    const [videoSearch, setVideoSearch] = useState('');
    const [socialLinksOrder, setSocialLinksOrder] = useState([]);
    const [isPreviewDescription, setIsPreviewDescription] = useState(false);
    const [isAwardAdded, setIsAwardAdded] = useState(false);
    const [selectedGalleryIndices, setSelectedGalleryIndices] = useState(new Set());
    
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [editReason, setEditReason] = useState('');
    const [groupChanges, setGroupChanges] = useState(null);
    const { awards: awardData } = useAwards();

    const calculateAgeAtDate = (birthDate, targetDate) => {
        if (!birthDate || !targetDate) return null;
        const birth = new Date(birthDate);
        const target = new Date(targetDate);
        let age = target.getFullYear() - birth.getFullYear();
        const m = target.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
        return age;
    };

    const handleTimelineDotClick = (memberId) => {
        setActiveTab('members');
        setTimeout(() => {
            const element = document.getElementById(`member-${memberId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        let videoId = null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'www.youtube.com' && urlObj.pathname === '/watch') {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.substring(1);
            } else if (urlObj.hostname === 'www.youtube.com' && urlObj.pathname.startsWith('/embed/')) {
                videoId = urlObj.pathname.substring('/embed/'.length);
            }
        } catch (e) {
            if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
                videoId = url;
            }
        }
        return videoId;
    };

    const sortedMembers = useMemo(() => {
        if (!members) return [];
        const currentMemberIds = isEditing ? (formData.members || []) : (displayGroup?.members || []);
        
        const memberMap = new Map(members.map(m => [m.id, m]));
        const ordered = currentMemberIds.map(id => memberMap.get(id)).filter(Boolean);
        const orderedIds = new Set(ordered.map(m => m.id));
        const remaining = members.filter(m => !orderedIds.has(m.id));
        return [...ordered, ...remaining];
    }, [members, isEditing, formData.members, displayGroup?.members]);

    const timelineMembers = useMemo(() => {
        return [...(members || [])].sort((a, b) => {
            const dateA = new Date(a.debutDate || '9999-12-31');
            const dateB = new Date(b.debutDate || '9999-12-31');
            return dateA - dateB;
        });
    }, [members]);

    useEffect(() => {
        if (members) {
            setEditingMembers(members);
        }
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
            }
        };
        fetchSimilar();
    }, [displayGroup?.company, displayGroup?.id]);

    useEffect(() => {
        const controller = new AbortController();
        if (activeTab === 'news' && displayGroup?.name) {
            fetchNews(controller.signal);
        }
        return () => controller.abort();
    }, [activeTab, displayGroup?.name]);

    const fetchNews = async (signal) => {
        setLoadingNews(true);
        setNews([]);
        try {
            const groupNameLower = displayGroup.name.toLowerCase();
            const koreanNameLower = (displayGroup.koreanName || '').toLowerCase();
            let mappedNews = [];

            // 1. Try Koreaboo RSS via rss2json
            try {
                const rssUrl = 'https://www.koreaboo.com/feed/';
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
            
                const response = await fetch(apiUrl, { signal });
                const data = await response.json();

                if (data.status === 'ok') {
                    let filteredItems = data.items.filter(item => {
                        const title = (item.title || '').toLowerCase();
                        return title.includes(groupNameLower) || (koreanNameLower && title.includes(koreanNameLower));
                    });

                    // If no news found with group name, try searching by member names
                    if (filteredItems.length > 0 && members.length > 0) {
                        const memberNames = members.map(m => m.name.toLowerCase());
                        filteredItems = data.items.filter(item => {
                            const title = (item.title || '').toLowerCase();
                            return memberNames.some(name => title.includes(name));
                        });
                    }

                    const extractThumbnail = async (url) => {
                        try {
                            // Note: Direct fetching might be blocked by CORS policies on the client-side.
                            // A proxy would be required for this to work reliably for all URLs.
                            const response = await fetch(url, { signal });
                            const html = await response.text();
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');

                            // Try og:image
                            let thumbnail = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                                            doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
                            
                            if (!thumbnail) {
                                // Fallback: find first large enough image
                                const images = Array.from(doc.querySelectorAll('img'));
                                for (const img of images) {
                                    const src = img.getAttribute('src');
                                    // Skip small icons, tracking pixels, etc.
                                    if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('pixel')) {
                                        thumbnail = src;
                                        break;
                                    }
                                }
                            }
                            if (thumbnail && !thumbnail.startsWith('http')) {
                                thumbnail = new URL(thumbnail, new URL(url).origin).href;
                            }
                            return thumbnail || null;
                        } catch (err) {
                            if (err.name === 'AbortError') return null;
                            console.warn(`Failed to extract thumbnail for ${url}:`, err);
                            return null;
                        }
                    };

                    if (filteredItems.length > 0) {
                        const enrichedItems = await Promise.all(filteredItems.map(async (item) => {
                            const thumbnail = await extractThumbnail(item.link);
                            let contentImg = null;
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            if (imgMatch) contentImg = imgMatch[1];
                            
                            // Check for enclosure or media:content from rss2json structure
                            const enclosureImg = item.enclosure?.link || item.thumbnail;
                            const finalThumbnail = thumbnail || enclosureImg || contentImg;

                            return {
                                name: item.title,
                                url: item.link,
                                description: item.description?.replace(/<[^>]+>/g, '').substring(0, 200) + '...',
                                datePublished: item.pubDate,
                                provider: [{ name: data.feed?.title || 'Koreaboo' }],
                                image: {
                                    thumbnail: {
                                        contentUrl: finalThumbnail
                                    }
                                }
                            };
                        }));
                        mappedNews = enrichedItems
                            .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
                            .slice(0, 10);
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                console.warn("Koreaboo fetch failed, trying fallback...", err);
                }
            }

            // 2. Fallback: Google News RSS via rss2json
            if (mappedNews.length === 0) {
                try {
                    // Use a broader search query for Google News to get more results
                    const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(displayGroup.name + ' kpop')}&hl=en-US&gl=US&ceid=US:en&when:7d`;
                    const googleApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(googleRssUrl)}`;
                    
                    const response = await fetch(googleApiUrl, { signal });
                    const data = await response.json();

                    if (data.status === 'ok') {
                        const googleNews = data.items.map(item => {
                            // Try to find image in description if not in thumbnail/enclosure
                            let contentImg = null;
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            if (imgMatch) contentImg = imgMatch[1];

                            // Google News often puts images in description HTML but not as enclosure
                            // We can try to extract it, or use a better fallback
                            let thumbnail = item.enclosure?.link || item.thumbnail || contentImg;

                            // If still no image, try to extract from content if available
                            if (!thumbnail && item.content) {
                                const contentMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                                if (contentMatch) thumbnail = contentMatch[1];
                            }

                            return {
                            name: item.title,
                            url: item.link,
                            description: item.description?.replace(/<[^>]+>/g, '').substring(0, 200) + '...',
                            datePublished: item.pubDate,
                            provider: [{ name: 'Google News' }],
                            image: { 
                            thumbnail: {
                                    contentUrl: thumbnail
                                } 
                            }
                        }});
                        // Google News results are already specific to the query, so we might not need strict filtering again.
                        // But let's keep a loose filter just in case.
                        mappedNews = googleNews
                            .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
                            .slice(0, 20); // Show up to 20 news items from Google
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                    console.error("Google News fallback failed", err);
                    }
                }
            }

            setNews(mappedNews);
        } catch (error) {
            if (error.name !== 'AbortError') {
            console.error("Error fetching news:", error);
            }
        } finally {
            setLoadingNews(false);
        }
    };

    const filteredNews = useMemo(() => {
        if (newsSourceFilter === 'all') return news;
        return news.filter(item => item.provider?.[0]?.name.toLowerCase().includes(newsSourceFilter.toLowerCase()));
    }, [news, newsSourceFilter]);


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

    // Utility function to generate stable IDs
    const generateId = (prefix, index) => `${prefix}-${index}-${Date.now()}`;

    // Sync activeImage when group data changes from Firestore
    useEffect(() => {
        if (group) {
            setDisplayGroup(group);
            setActiveImage(group.image);
            setFormData(group);
            setGalleryItems((group.gallery || []).map((url, index) => ({ id: generateId('item', index), url })));
            setVideoList((group.videos || []).map((v, i) => ({ ...v, internalId: generateId('vid', i) })));
            setAlbumList((group.albums || []).map((a, i) => ({ ...a, internalId: generateId('alb', i) })));
            setVideoPage(1);
            
            // Initialize social links order if not present or update it
            const defaultOrder = [
                { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500', hover: 'hover:text-pink-600' },
                { id: 'twitter', label: 'X', icon: XIcon, color: 'text-sky-500', hover: 'hover:text-sky-600' },
                { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500', hover: 'hover:text-red-600' },
                { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-black dark:text-white', hover: 'hover:text-gray-700 dark:hover:text-gray-300' },
                { id: 'appleMusic', label: 'Apple Music', icon: Music2, color: 'text-rose-500', hover: 'hover:text-rose-600' },
                { id: 'spotify', label: 'Spotify', icon: SpotifyIcon, color: 'text-green-500', hover: 'hover:text-green-600' }
            ];
            
            // If group has a saved order, use it (you'd need to save this to DB), otherwise use default
            // For now, we'll just use default order but allow reordering in UI state
            if (group.socialOrder) {
                // Reconstruct icons for saved order
                const savedOrderWithIcons = group.socialOrder.map(item => {
                    const defaultItem = defaultOrder.find(d => d.id === item.id);
                    return defaultItem ? { ...defaultItem, ...item } : null;
                }).filter(Boolean);
                
                // Add any new default items that might be missing from saved order
                const missingItems = defaultOrder.filter(d => !savedOrderWithIcons.find(s => s.id === d.id));
                
                setSocialLinksOrder([...savedOrderWithIcons, ...missingItems]);
            } else {
                setSocialLinksOrder(defaultOrder);
            }
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

    const handleHeroFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            validateFile(file, 5);
        } catch (error) {
            alert(error.message);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setActiveImage(objectUrl);
        setHeroZoom(1);
        setHeroCrop({ x: 0, y: 0 });
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        for (const file of files) {
            try {
                validateFile(file, 5);
            } catch (error) {
                alert(`File ${file.name} is too large. Max 5MB.`);
                return;
            }
        }

        setIsUploading(true);
        setGalleryUploadProgress(0);
        try {
            const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
            
            // Track progress for each file to calculate total progress
            const fileProgress = new Array(compressedFiles.length).fill(0);
            
            const uploadPromises = compressedFiles.map((file, index) => uploadImage(file, 'groups/gallery', (progress) => {
                fileProgress[index] = progress;
                const totalProgress = fileProgress.reduce((a, b) => a + b, 0) / fileProgress.length;
                setGalleryUploadProgress(totalProgress);
            }));
            
            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), ...urls] }));
            
            // Update galleryItems to show new images immediately
            const newItems = urls.map(url => ({ id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, url }));
            setGalleryItems(prev => [...prev, ...newItems]);
        } catch (error) {
            console.error("Gallery upload error", error);
            alert("Failed to upload images");
        } finally {
            setIsUploading(false);
            setGalleryUploadProgress(0);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
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

    const handleSaveGroup = async () => {
        if (!isAdmin) {
            // Calculate changes for User Suggestion
            const changes = {};
            const fieldsToCheck = ['name', 'koreanName', 'company', 'debutDate', 'fanclub', 'description', 'instagram', 'twitter', 'youtube', 'tiktok', 'appleMusic', 'spotify', 'image', 'status', 'disbandDate'];
            
            let hasChanges = false;
            fieldsToCheck.forEach(field => {
                const original = displayGroup[field] || '';
                const current = formData[field] || '';
                if (original !== current) {
                    changes[field] = { old: original, new: current };
                    hasChanges = true;
                }
            });

            if (!hasChanges) {
                setModalConfig({ isOpen: true, title: 'No Changes', message: 'You haven\'t made any changes to submit.', type: 'info' });
                return;
            }
            
            setGroupChanges(changes);
            setShowReasonModal(true);
            return;
        }

        let imageToSave = formData.image;
        // Only crop if it's a local file (blob) or data URL to avoid CORS issues with remote images
        if (heroCroppedArea && activeImage && (activeImage.startsWith('blob:') || activeImage.startsWith('data:'))) {
            setIsHeroUploading(true);
            setHeroUploadProgress(0);
            try {
                const croppedImage = await getCroppedImgDataUrl(activeImage, heroCroppedArea);
                
                // Upload cropped image
                const file = dataURLtoFile(croppedImage, `hero_${Date.now()}.jpg`);
                const compressedFile = await compressImage(file);

                // Delete old image if exists
                if (displayGroup.image && displayGroup.image.includes('firebasestorage')) {
                    await deleteImage(displayGroup.image);
                }

                const uploadedUrl = await uploadImage(compressedFile, 'groups', (progress) => setHeroUploadProgress(progress));
                imageToSave = uploadedUrl;
                
            } catch (e) {
                console.error("Failed to crop hero image", e);
            } finally {
                setIsHeroUploading(false);
                setHeroUploadProgress(0);
            }
        }

        // Handle Member Updates
        const currentMemberIds = members.map(m => m.id);
        const newMemberIds = editingMembers.map(m => m.id);
        
        const addedMembers = newMemberIds.filter(id => !currentMemberIds.includes(id));
        const removedMembers = currentMemberIds.filter(id => !newMemberIds.includes(id));

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

        // Strip out icon components before saving to Firestore
        const socialOrderToSave = socialLinksOrder.map(({ icon, ...rest }) => rest);

        await onUpdateGroup(displayGroup.id, { ...formData, image: imageToSave, members: newMemberIds, socialOrder: socialOrderToSave });
        setIsEditing(false);
        setIsReordering(false);
        setActiveImage(imageToSave);
    };

    const confirmSubmitEdit = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'editRequests'), {
                targetId: displayGroup.id,
                targetType: 'group',
                targetName: displayGroup.name,
                submitterId: user.uid || user.id,
                submitterName: user.name || 'Anonymous',
                submitterEmail: user.email || '',
                submittedAt: serverTimestamp(),
                status: 'pending',
                changes: groupChanges,
                reason: editReason
            });
            await logAudit({
                action: 'submit_update',
                targetType: 'group',
                targetId: displayGroup.id,
                user: user,
                details: { changes: groupChanges, reason: editReason, requestId: docRef.id }
            });
            setShowReasonModal(false);
            setIsEditing(false);
            setGroupChanges(null);
            setEditReason('');
            setModalConfig({
                isOpen: true,
                title: 'Request Submitted',
                message: 'Your edit request has been submitted for approval.',
                type: 'success'
            });
        } catch (error) {
            console.error("Error submitting edit request:", error);
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: 'Failed to submit request.',
                type: 'danger'
            });
        }
    };

    const handleAddAward = () => {
        if (!newAward.show || !newAward.award) return;
        setFormData(prev => ({ ...prev, awards: [...(prev.awards || []), { ...newAward }] }));
        setNewAward(prev => ({ ...prev, award: '' }));
        setIsAwardAdded(true);
        setTimeout(() => setIsAwardAdded(false), 2000);
    };

    const handleRemoveAward = (index) => {
        setFormData({ ...formData, awards: (formData.awards || []).filter((_, i) => i !== index) });
    };

    const handleGalleryChange = (index, value) => {
        startCropping(value, async (newUrl) => {
            let finalUrl = newUrl;
            if (newUrl && newUrl.startsWith('data:')) {
                setIsUploading(true);
                setGalleryUploadProgress(0);
                try {
                    const file = dataURLtoFile(newUrl, `gallery_cropped_${Date.now()}.jpg`);
                    const compressedFile = await compressImage(file);
                    finalUrl = await uploadImage(compressedFile, 'groups/gallery', (progress) => setGalleryUploadProgress(progress));
                } catch (error) {
                    console.error("Failed to upload cropped gallery image", error);
                } finally {
                    setIsUploading(false);
                    setGalleryUploadProgress(0);
                }
            }
            
            const newItems = [...galleryItems];
            newItems[index] = { ...newItems[index], url: finalUrl };
            setGalleryItems(newItems);
            setFormData(prev => ({ ...prev, gallery: newItems.map(i => i.url) }));
        }, 1);
    };

    const addGalleryImage = () => {
        const newItems = [...galleryItems, { id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, url: '' }];
        setGalleryItems(newItems);
        setFormData(prev => ({ ...prev, gallery: newItems.map(i => i.url) }));
    };

    const toggleGallerySelection = (index) => {
        const newSelection = new Set(selectedGalleryIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedGalleryIndices(newSelection);
    };

    const deleteSelectedGalleryImages = () => {
        if (selectedGalleryIndices.size === 0) return;
        
        setModalConfig({
            isOpen: true,
            title: 'Delete Selected Images',
            message: `Are you sure you want to delete ${selectedGalleryIndices.size} images?`,
            type: 'danger',
            singleButton: false,
            confirmText: 'Delete',
            onConfirm: async () => {
                const indices = Array.from(selectedGalleryIndices).sort((a, b) => b - a); // Delete from end to avoid index shift issues if processing sequentially, though filter is better
                
                // Optional: Delete from storage if needed
                for (const idx of indices) {
                    const urlToRemove = galleryItems[idx]?.url;
                    if (urlToRemove && urlToRemove.includes('firebasestorage')) {
                        await deleteImage(urlToRemove);
                    }
                }

                const newItems = galleryItems.filter((_, i) => !selectedGalleryIndices.has(i));
                setGalleryItems(newItems);
                setFormData(prev => ({ ...prev, gallery: newItems.map(i => i.url) }));
                setSelectedGalleryIndices(new Set());
            }
        });
    };

    const selectAllGalleryImages = () => {
        if (selectedGalleryIndices.size === galleryItems.length) {
            setSelectedGalleryIndices(new Set());
        } else {
            setSelectedGalleryIndices(new Set(galleryItems.map((_, i) => i)));
        }
    };

    const removeGalleryImage = (index) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Image',
            message: 'Are you sure you want to delete this image? This action cannot be undone.',
            type: 'danger',
            singleButton: false,
            confirmText: 'Delete',
            onConfirm: async () => {
                const urlToRemove = galleryItems[index]?.url;
                if (urlToRemove) {
                    await deleteImage(urlToRemove);
                }
                const newItems = galleryItems.filter((_, i) => i !== index);
                setGalleryItems(newItems);
                setFormData(prev => ({ ...prev, gallery: newItems.map(i => i.url) }));
            }
        });
    };

    const handleAlbumChange = (index, field, value) => {
        const newList = [...albumList];
        if (!newList[index]) return;
        newList[index] = { ...newList[index], [field]: value };
        setAlbumList(newList);
        
        // Sync to formData
        const newAlbums = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, albums: newAlbums }));
    };

    const addAlbum = () => {
        const newAlbum = { title: '', cover: '', date: '', youtube: '', tracks: [], internalId: `alb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
        const newList = [...albumList, newAlbum];
        setAlbumList(newList);
        
        const newAlbums = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, albums: newAlbums }));
    };

    const removeAlbum = (index) => {
        const newList = albumList.filter((_, i) => i !== index);
        setAlbumList(newList);
        
        const newAlbums = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, albums: newAlbums }));
    };

    const handleVideoChange = (index, field, value) => {
        const newList = [...videoList];
        if (!newList[index]) return;
        newList[index] = { ...newList[index], [field]: value };
        setVideoList(newList);
        
        // Sync to formData
        const newVideos = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, videos: newVideos }));
    };

    const insertFormat = (tag) => {
        const textarea = document.getElementById('group-description');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.description || '';
        
        const prefix = `<${tag}>`;
        const suffix = `</${tag}>`;
        
        const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
        setFormData(prev => ({ ...prev, description: newText }));
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const fetchVideoDate = async (index, url) => {
        if (!url) return;
        try {
            // Try using noembed service which supports CORS and returns basic info including upload date sometimes, 
            // or just use current date as fallback if not found. 
            // YouTube oEmbed doesn't always return upload date directly in a standard format.
            // For a robust solution without API key, we might just set it to today or let user input.
            // But let's try to fetch title at least.
            
            // Since fetching upload date from YouTube client-side without API key is tricky due to CORS and scraping limits,
            // we will just focus on letting the user input it easily, or maybe default to today.
            // If you have a backend, you could proxy this request.
            
            // For now, let's just ensure the date field is there and maybe auto-fill today if empty.
        } catch (e) {
            console.error("Failed to fetch video date", e);
        }
    };

    const addVideo = () => {
        const newVideo = { title: '', url: '', date: new Date().toISOString().split('T')[0], internalId: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
        const newList = [...videoList, newVideo];
        setVideoList(newList);
        
        const newVideos = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, videos: newVideos }));
    };

    const removeVideo = (index) => {
        const newList = videoList.filter((_, i) => i !== index);
        setVideoList(newList);
        
        const newVideos = newList.map(({ internalId, ...rest }) => rest);
        setFormData(prev => ({ ...prev, videos: newVideos }));
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
                setGalleryItems((newData.gallery || []).map((url, index) => ({ id: `item-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, url })));
                setVideoList((newData.videos || []).map((v, i) => ({ ...v, internalId: `vid-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })));
                setAlbumList((newData.albums || []).map((a, i) => ({ ...a, internalId: `alb-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })));
                setVideoPage(1);
                const defaultOrder = [
                    { id: 'instagram', label: 'Instagram', icon: Instagram },
                    { id: 'twitter', label: 'X', icon: XIcon },
                    { id: 'youtube', label: 'YouTube', icon: Youtube },
                    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
                    { id: 'appleMusic', label: 'Apple Music', icon: Music2 },
                    { id: 'spotify', label: 'Spotify', icon: SpotifyIcon }
                ];
                
                if (newData.socialOrder) {
                    const savedOrderWithIcons = newData.socialOrder.map(item => {
                        const defaultItem = defaultOrder.find(d => d.id === item.id);
                        return defaultItem ? { ...defaultItem, ...item } : null;
                    }).filter(Boolean);
                    const missingItems = defaultOrder.filter(d => !savedOrderWithIcons.find(s => s.id === d.id));
                    setSocialLinksOrder([...savedOrderWithIcons, ...missingItems]);
                } else {
                    setSocialLinksOrder(defaultOrder);
                }
            }
        } catch (error) {
            console.error("Error refreshing group:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const displayVideos = useMemo(() => {
        const list = [];
        if (displayGroup?.themeSongUrl) {
            list.push({ title: 'Theme Song', url: displayGroup.themeSongUrl });
        }
        if (displayGroup?.videos && Array.isArray(displayGroup.videos)) {
            list.push(...displayGroup.videos);
        }
        return list;
    }, [displayGroup]);

    const filteredVideos = useMemo(() => {
        if (!videoSearch.trim()) return displayVideos;
        return displayVideos.filter(v => 
            (v.title || '').toLowerCase().includes(videoSearch.toLowerCase())
        );
    }, [displayVideos, videoSearch]);

    const totalVideoPages = Math.ceil(filteredVideos.length / videosPerPage);
    const currentVideos = filteredVideos.slice((videoPage - 1) * videosPerPage, videoPage * videosPerPage);

    const groupedAwards = useMemo(() => {
        const awards = displayGroup?.awards || [];
        const groups = {};
        const legacy = [];

        awards.forEach(award => {
            if (typeof award === 'object' && award.year) {
                const y = award.year;
                if (!groups[y]) groups[y] = [];
                groups[y].push(award);
            } else {
                legacy.push(award);
            }
        });

        const sortedYears = Object.keys(groups).sort((a, b) => b - a);
        return { sortedYears, groups, legacy };
    }, [displayGroup?.awards]);

    if (!displayGroup) {
        return (
            <div className="py-20 text-center">
                <h2 className="text-4xl font-black text-white">Group not found</h2>
                <button onClick={onBack} className="mt-8 px-10 py-4 bg-brand-pink text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-pink/20">Go Back Home</button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="py-4 md:py-6 space-y-8 md:space-y-10"
        >
            <BackgroundShapes />

            {/* Header / Hero Section */}
            <section className="relative h-[35vh] min-h-[300px] md:h-[55vh] max-h-[600px] rounded-[24px] md:rounded-[48px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] group/hero perspective-1000">
                <motion.div
                    style={{ y: y1, scale }}
                    className="absolute inset-0 w-full h-full transition-all duration-700"
                >
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
                    {isEditing && isAdmin ? (
                        <div className="relative w-full h-full bg-slate-900">
                            <Cropper
                                image={activeImage}
                                crop={heroCrop}
                                zoom={heroZoom}
                                aspect={16 / 9}
                                onCropChange={setHeroCrop}
                                onCropComplete={(_, pixels) => setHeroCroppedArea(pixels)}
                                onZoomChange={setHeroZoom}
                                            cropShape="rect"
                                            restrictPosition={false}
                                showGrid={false}
                                objectFit={heroObjectFit}
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
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button
                                    type="button"
                                    onClick={() => setHeroObjectFit(prev => prev === 'contain' ? 'horizontal-cover' : 'contain')}
                                    className="text-white/80 hover:text-white transition-colors"
                                    title={heroObjectFit === 'contain' ? "Fill Frame" : "Fit Image"}
                                >
                                    {heroObjectFit === 'contain' ? <Maximize size={14} /> : <Minimize size={14} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={convertDriveLink(activeImage)}
                            alt={displayGroup.name}
                            loading="eager"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                            }}
                        />
                    )}
                </motion.div>

                <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className={cn(
                                "p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95",
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
                            className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-95"
                            title="Share Group"
                        >
                            {isCopied ? <Check size={20} /> : <Share2 size={20} />}
                        </button>
                        {user && (
                            isEditing ? (
                                <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData(displayGroup);
                                        setActiveImage(displayGroup.image);
                                    }}
                                    className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40"
                                    title="Cancel"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={handleSaveGroup}
                                    className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-green-500/20 border-green-500/50 text-white hover:bg-green-500/40"
                                    title={isAdmin ? "Save Changes" : "Submit Request"}
                                >
                                    <Save size={20} />
                                </button>
                                </>
                            ) : (
                                <>
                                {isAdmin && (
                                <button
                                    onClick={() => onDeleteGroup(displayGroup.id)}
                                    className="p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/40 active:scale-95"
                                    title="Delete Group"
                                >
                                    <Trash2 size={20} />
                                </button>
                                )}
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className={cn(
                                        "p-2.5 md:p-4 rounded-2xl backdrop-blur-3xl border transition-all shadow-2xl flex items-center justify-center active:scale-95",
                                        isAdmin 
                                            ? "bg-white/10 border-white/20 text-white hover:bg-brand-pink/20 hover:border-brand-pink/50"
                                            : "bg-brand-purple/20 border-brand-purple/50 text-white hover:bg-brand-purple/40"
                                    )}
                                    title={isAdmin ? "Edit Group Details" : "Suggest Edit"}
                                >
                                    {isAdmin ? <Edit2 size={20} /> : <FileText size={20} />}
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
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 rounded-2xl bg-white/10 backdrop-blur-2xl text-white hover:bg-white/20 transition-all z-20 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] border border-white/20 shadow-2xl"
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
                                <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white mb-1 md:mb-2 tracking-tighter leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] break-words">
                                    {displayGroup.name}
                                </h1>
                                <p className="text-base sm:text-xl md:text-2xl lg:text-3xl text-brand-pink/90 font-black tracking-widest drop-shadow-2xl italic">
                                    {displayGroup.koreanName}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 md:gap-4">
                        <div className="px-3 md:px-6 py-2 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[70px] md:min-w-[120px] group/stat hover:border-brand-pink/50 transition-colors">
                            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-1 group-hover/stat:text-brand-pink transition-colors">Members</p>
                            <p className="text-xl md:text-3xl font-black text-white">{members.length}</p>
                        </div>
                        <div className="px-3 md:px-6 py-2 md:py-4 rounded-[16px] md:rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl min-w-[70px] md:min-w-[120px] group/stat hover:border-brand-blue/50 transition-colors">
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
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30, delay: 0.2 } }}
                            viewport={{ once: true }}
                            className={cn(
                                "p-5 md:p-8 rounded-[32px] space-y-6 border shadow-xl relative overflow-hidden",
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
                                        // onBack(); // Optional: go back if needed
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
                                    value={isEditing ? (
                                        <select
                                            value={formData.status || 'Active'}
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                            className={cn(
                                                "w-full bg-transparent border-b focus:outline-none py-1 text-base font-bold appearance-none cursor-pointer",
                                                theme === 'dark' ? "border-white/20 text-white [&>option]:bg-slate-900" : "border-slate-300 text-slate-900 [&>option]:bg-white"
                                            )}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    ) : (displayGroup.status || 'Active')}
                                    theme={theme}
                                    valueClass={cn(
                                        "font-black tracking-[0.2em] uppercase text-xs",
                                        !isEditing && ((displayGroup.status === 'Inactive') ? "text-red-500" : "text-green-500")
                                    )}
                                />
                                {(isEditing ? formData.status === 'Inactive' : displayGroup.status === 'Inactive') && (
                                    <InfoRow
                                        icon={Calendar}
                                        label="Disband Date"
                                        value={isEditing ? (
                                            <input 
                                                type="date"
                                                value={formData.disbandDate || ''} 
                                                onChange={e => setFormData({...formData, disbandDate: e.target.value})}
                                                className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                                            />
                                        ) : (displayGroup.disbandDate || 'N/A')}
                                        theme={theme}
                                        valueClass="text-red-500"
                                    />
                                )}

                                {/* Social Media Links */}
                                {!isEditing && socialLinksOrder.some(link => displayGroup?.[link.id]) && (
                                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-white/10 space-y-3">
                                        <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                            <Globe size={12} /> Social Media
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {socialLinksOrder.map(link => {
                                                const url = displayGroup[link.id];
                                                if (!url) return null;
                                                
                                                let colorClass = theme === 'dark' ? "bg-slate-800 text-slate-300 border-white/5" : "bg-slate-50 text-slate-600 border-slate-100";
                                                if (link.id === 'instagram') colorClass = theme === 'dark' ? "bg-slate-800 text-pink-500 hover:bg-pink-500 hover:text-white border-white/5" : "bg-slate-50 text-pink-500 hover:bg-pink-500 hover:text-white border-slate-100";
                                                else if (link.id === 'twitter') colorClass = theme === 'dark' ? "bg-slate-800 text-sky-500 hover:bg-sky-500 hover:text-white border-white/5" : "bg-slate-50 text-sky-500 hover:bg-sky-500 hover:text-white border-slate-100";
                                                else if (link.id === 'youtube') colorClass = theme === 'dark' ? "bg-slate-800 text-red-500 hover:bg-red-500 hover:text-white border-white/5" : "bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white border-slate-100";

                                                return (
                                                    <a key={link.id} href={url} target="_blank" rel="noopener noreferrer" title={url} className={cn("px-3 py-2 rounded-xl transition-all hover:scale-105 shadow-sm flex items-center gap-2 font-bold text-xs uppercase tracking-widest border", colorClass)}>
                                                        <link.icon size={14} /> {link.label}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Description / Biography */}
                        <div className={cn(
                            "p-5 md:p-8 rounded-[32px] border",
                            theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xl"
                        )}>
                            <h3 className={cn("text-xl font-black mb-6 flex items-center gap-3", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                Biography
                            </h3>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => insertFormat('b')} className={cn("p-2 rounded-lg border transition-colors", theme === 'dark' ? "border-white/10 hover:bg-white/10 text-white" : "border-slate-200 hover:bg-slate-100 text-slate-700")} title="Bold"><Bold size={16} /></button>
                                        <button type="button" onClick={() => insertFormat('i')} className={cn("p-2 rounded-lg border transition-colors", theme === 'dark' ? "border-white/10 hover:bg-white/10 text-white" : "border-slate-200 hover:bg-slate-100 text-slate-700")} title="Italic"><Italic size={16} /></button>
                                        <div className="flex-1" />
                                        <button type="button" onClick={() => setIsPreviewDescription(!isPreviewDescription)} className={cn("px-3 py-2 rounded-lg border transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2", isPreviewDescription ? "bg-brand-pink text-white border-brand-pink" : (theme === 'dark' ? "border-white/10 hover:bg-white/10 text-white" : "border-slate-200 hover:bg-slate-100 text-slate-700"))}>
                                            {isPreviewDescription ? <Edit2 size={14} /> : <Eye size={14} />}
                                            {isPreviewDescription ? "Edit" : "Preview"}
                                        </button>
                                    </div>
                                    {!isPreviewDescription ? (
                                        <textarea
                                            id="group-description"
                                            value={formData.description || ''}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                            className={cn("w-full h-96 bg-transparent border-2 rounded-xl p-4 focus:outline-none resize-none text-sm leading-relaxed font-mono", theme === 'dark' ? "border-white/10 text-slate-300 focus:border-brand-pink" : "border-slate-200 text-slate-600 focus:border-brand-pink")}
                                            placeholder="Enter group history..."
                                        />
                                    ) : (
                                        <div className={cn("w-full h-96 overflow-y-auto border-2 rounded-xl p-4 text-sm leading-relaxed", theme === 'dark' ? "border-white/10 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                                            {(formData.description || "No description.").split('\n').map((paragraph, idx) => {
                                                if (!paragraph.trim()) return <div key={idx} className="h-4" />;
                                                const __html = paragraph.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;b&gt;/g, "<strong class='font-black text-brand-pink'>").replace(/&lt;\/b&gt;/g, "</strong>").replace(/&lt;i&gt;/g, "<em class='italic opacity-80'>").replace(/&lt;\/i&gt;/g, "</em>");
                                                return <p key={idx} dangerouslySetInnerHTML={{ __html }} className="mb-2" />;
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn("leading-loose text-lg font-medium relative z-10 text-justify space-y-4", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                                    {(displayGroup.description || "No description available.").split('\n').map((paragraph, idx) => {
                                        if (!paragraph.trim()) return <div key={idx} className="h-4" />;
                                        const __html = paragraph.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;b&gt;/g, "<strong class='font-black text-brand-pink'>").replace(/&lt;\/b&gt;/g, "</strong>").replace(/&lt;i&gt;/g, "<em class='italic opacity-80'>").replace(/&lt;\/i&gt;/g, "</em>");
                                        return <p key={idx} dangerouslySetInnerHTML={{ __html }} />;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Right Column: Content */}
                <div className={cn("space-y-8", activeTab === 'members' ? "lg:col-span-8" : "lg:col-span-12")}>
                    {/* Tabs Navigation */}
                    <div className="w-full">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 w-full">
                            <button onClick={() => setActiveTab('members')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'members' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'members' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-brand-pink/10 text-brand-pink shadow-inner"><Star size={20} fill="currentColor" /></motion.div>}
                                Members
                            </button>
                            <button onClick={() => setActiveTab('gallery')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'gallery' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'gallery' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue shadow-inner"><ImageIcon size={20} fill="currentColor" /></motion.div>}
                                Gallery
                            </button>
                            <button onClick={() => setActiveTab('timeline')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'timeline' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'timeline' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-brand-pink/10 text-brand-pink shadow-inner"><History size={20} /></motion.div>}
                                Timeline
                            </button>
                            <button onClick={() => setActiveTab('discography')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'discography' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'discography' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple shadow-inner"><Disc size={20} fill="currentColor" /></motion.div>}
                                Discography
                            </button>
                            <button onClick={() => setActiveTab('videos')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'videos' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'videos' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-red-500/10 text-red-500 shadow-inner"><Youtube size={20} fill="currentColor" /></motion.div>}
                                Video Gallery
                            </button>
                            <div onClick={() => setActiveTab('news')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all cursor-pointer shrink-0", activeTab === 'news' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'news' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-green-500/10 text-green-500 shadow-inner"><Newspaper size={20} fill="currentColor" /></motion.div>}
                                <div className="flex items-center gap-3">
                                    News
                                    {activeTab === 'news' && (
                                        <button onClick={(e) => { e.stopPropagation(); fetchNews(); }} disabled={loadingNews} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                            <RefreshCw size={16} className={cn(loadingNews && "animate-spin")} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setActiveTab('comments')} className={cn("text-base sm:text-xl md:text-2xl lg:text-4xl font-black flex items-center gap-2 transition-all shrink-0", activeTab === 'comments' ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-400 hover:text-slate-500 scale-90 origin-left")}>
                                {activeTab === 'comments' && <motion.div layoutId="tab-icon" className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue shadow-inner"><MessageSquare size={20} fill="currentColor" /></motion.div>}
                                Fan Talk
                                <span className="text-base md:text-xl opacity-30 ml-2">({comments.length})</span>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'members' ? (
                        <>
                            {isEditing && isAdmin && (
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

                            {isReordering && isAdmin ? (
                                <Reorder.Group 
                                    axis="y" 
                                    values={sortedMembers} 
                                    onReorder={(newOrder) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            members: newOrder.map(m => m.id)
                                        }));
                                    }}
                                    className="space-y-4"
                                >
                                    {sortedMembers.map((member) => (
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
                            ) : (
                                <motion.div
                                    key="members-content"
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
                                            id={`member-${member.id}`}
                                            member={member}
                                            theme={theme}
                                            onClick={() => onMemberClick(member)}
                                            onImageClick={(img) => setLightboxImage(img)}
                                            onSearchPosition={onSearchPosition}
                                            user={user}
                                            onFavorite={() => onFavoriteMember && onFavoriteMember(member.id)}
                                            onEdit={() => onEditMember && onEditMember(member)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </>
                    ) : activeTab === 'gallery' ? (
                        <motion.div
                            key="gallery"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {isEditing && isAdmin ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-slate-900")}>Edit Gallery</h3>
                                        <div className="flex gap-2">
                                            {selectedGalleryIndices.size > 0 && (
                                                <button onClick={deleteSelectedGalleryImages} className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <Trash2 size={14} /> Delete ({selectedGalleryIndices.size})
                                                </button>
                                            )}
                                            <button onClick={selectAllGalleryImages} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                {selectedGalleryIndices.size === galleryItems.length ? <CheckSquare size={14} /> : <Square size={14} />}
                                                Select All
                                            </button>
                                        </div>
                                    </div>
                                    <Reorder.Group axis="y" values={galleryItems} onReorder={(newOrder) => {
                                        setGalleryItems(newOrder);
                                        setFormData(prev => ({ ...prev, gallery: newOrder.map(i => i.url) }));
                                    }} className="space-y-3">
                                        {galleryItems.map((item, idx) => (
                                            <Reorder.Item key={item.id} value={item} className={cn("p-3 rounded-2xl border flex items-center gap-3", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                                                <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1">
                                                    <GripVertical size={20} />
                                                </div>
                                                <button type="button" onClick={() => toggleGallerySelection(idx)} className="p-1">
                                                    {selectedGalleryIndices.has(idx) ? <CheckSquare size={20} className="text-brand-pink" /> : <Square size={20} className="text-slate-400" />}
                                                </button>
                                                <img src={convertDriveLink(item.url)} className="w-16 h-16 rounded-lg object-cover" alt="" />
                                                <input
                                                    value={item.url}
                                                    onChange={e => handleGalleryChange(idx, e.target.value)}
                                                    className={cn("flex-1 p-2 rounded-lg border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                                                    placeholder="Image URL"
                                                />
                                                <button type="button" onClick={() => removeGalleryImage(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl"><Trash2 size={16} /></button>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                    <div className="flex gap-2">
                                        <button onClick={addGalleryImage} className="flex-1 py-3 rounded-xl border-2 border-dashed border-brand-blue/30 text-brand-blue font-black uppercase tracking-widest hover:bg-brand-blue/5 transition-colors flex items-center justify-center gap-2">
                                            <Plus size={16} /> Add Image Field
                                        </button>
                                        <input type="file" multiple ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload} accept="image/*" />
                                        <button onClick={() => galleryInputRef.current?.click()} disabled={isUploading} className="flex-1 py-3 rounded-xl border-2 border-dashed border-brand-pink/30 text-brand-pink font-black uppercase tracking-widest hover:bg-brand-pink/5 transition-colors flex items-center justify-center gap-2 relative overflow-hidden">
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-brand-pink/10">
                                                    <motion.div 
                                                        className="h-full bg-brand-pink/20" 
                                                        initial={{ width: 0 }} 
                                                        animate={{ width: `${galleryUploadProgress}%` }} 
                                                    />
                                                </div>
                                            )}
                                            <div className="relative z-10 flex items-center gap-2">
                                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                {isUploading ? `Uploading ${Math.round(galleryUploadProgress)}%` : 'Upload Files'}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {allImages.slice(1).map((img, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05 }}
                                            onClick={() => setLightboxImage(img)}
                                            className="aspect-square rounded-2xl overflow-hidden shadow-md cursor-pointer group relative"
                                        >
                                            <img src={convertDriveLink(img)} alt={`Gallery image ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ZoomIn className="text-white" size={32} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                            {(allImages.length <= 1 && !isEditing) && (
                                <div className="text-center py-20">
                                    <ImageIcon size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                                    <p className="text-slate-500 font-medium">No gallery images yet.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : activeTab === 'timeline' ? (
                        <motion.div
                            key="timeline"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl mx-auto py-8 relative"
                        >
                            {/* Vertical Line Background */}
                            <div className={cn(
                                "absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 -ml-px",
                                theme === 'dark' ? "bg-slate-800" : "bg-slate-200"
                            )} />

                            {/* Animated Vertical Line */}
                            <motion.div 
                                initial={{ height: 0 }}
                                whileInView={{ height: "100%" }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="absolute left-4 md:left-1/2 top-0 w-0.5 -ml-px bg-gradient-to-b from-brand-pink via-brand-purple to-transparent shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                            />

                            {timelineMembers.map((member, index) => {
                                const isSelected = selectedTimelineMember?.id === member.id;
                                return (
                                <motion.div 
                                    key={member.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className={cn(
                                    "relative flex items-center mb-12 last:mb-0",
                                    index % 2 === 0 ? "md:flex-row-reverse" : ""
                                )}>
                                    {/* Spacer for alternating layout */}
                                    <div className="hidden md:block flex-1" />
                                    
                                    {/* Dot */}
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        whileHover={{ scale: 1.5 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: (index * 0.1) + 0.2 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTimelineDotClick(member.id);
                                        }}
                                        className={cn(
                                        "absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-4 -ml-2 z-10 cursor-pointer",
                                        isSelected ? "bg-brand-pink border-brand-pink" : (theme === 'dark' ? "bg-slate-900 border-brand-pink" : "bg-white border-brand-pink")
                                    )} title="Click to view member card" />

                                    {/* Content */}
                                    <div className={cn(
                                        "flex-1 ml-10 md:ml-0 pl-0",
                                        index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                                    )}>
                                        <motion.div 
                                            layout
                                            whileHover={{ y: -5, scale: 1.02 }}
                                            className={cn(
                                            "rounded-3xl border transition-colors cursor-pointer group overflow-hidden",
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
                                                    loading="lazy"
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
                                </motion.div>
                            )})}
                        </motion.div>
                    ) : activeTab === 'news' ? (
                        <motion.div
                            key="news"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
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
                                            animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25, delay: idx * 0.05 } }}
                                            whileHover={{ scale: 1.02 }}
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={cn(
                                                "block rounded-3xl border transition-all hover:scale-[1.02] group overflow-hidden flex flex-col h-full",
                                                theme === 'dark' ? "bg-slate-900/40 border-white/5 hover:border-brand-pink/30" : "bg-white border-slate-100 shadow-lg hover:shadow-xl"
                                            )}
                                        >
                                            {item.image?.thumbnail?.contentUrl && (
                                            <div className="h-48 w-full relative overflow-hidden shrink-0">
                                                <img 
                                                    src={item.image?.thumbnail?.contentUrl} 
                                                    alt={item.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                                     <span className="text-[10px] font-black uppercase tracking-widest text-white bg-brand-pink/90 px-2 py-1 rounded-lg backdrop-blur-md shadow-lg">
                                                        {item.provider?.[0]?.name || 'News'}
                                                     </span>
                                                </div>
                                            </div>
                                            )}
                                            
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
                    ) : activeTab === 'videos' ? (
                        <motion.div
                            key="videos"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {isEditing && isAdmin ? (
                                <div className="space-y-6"> 
                                    <Reorder.Group axis="y" values={videoList} onReorder={(newOrder) => {
                                        setVideoList(newOrder);
                                        setFormData(prev => ({ ...prev, videos: newOrder.map(({ internalId, ...rest }) => rest) }));
                                    }} className="space-y-6">
                                    {videoList.map((video, idx) => (
                                        <Reorder.Item key={video.internalId} value={video} className={cn("p-6 rounded-3xl border space-y-4", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1">
                                                        <GripVertical size={20} />
                                                    </div>
                                                    <h4 className="font-black text-sm uppercase tracking-widest text-red-500">Video #{idx + 1}</h4>
                                                </div>
                                                <button onClick={() => removeVideo(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl"><Trash2 size={18} /></button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input placeholder="Video Title" value={video.title || ''} onChange={e => handleVideoChange(idx, 'title', e.target.value)} className={cn("p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                <div className="flex gap-2">
                                                    <input type="date" value={video.date || ''} onChange={e => handleVideoChange(idx, 'date', e.target.value)} className={cn("flex-1 p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                    <button type="button" onClick={() => handleVideoChange(idx, 'date', new Date().toISOString().split('T')[0])} className={cn("p-3 rounded-xl border font-bold text-xs uppercase", theme === 'dark' ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50")}>
                                                        Today
                                                    </button>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input placeholder="YouTube URL" value={video.url || ''} onChange={e => handleVideoChange(idx, 'url', e.target.value)} className={cn("w-full p-3 rounded-xl border bg-transparent outline-none font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                                                </div>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                    </Reorder.Group>
                                    <button onClick={addVideo} className="w-full py-4 rounded-2xl border-2 border-dashed border-red-500/30 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={20} /> Add Video
                                    </button>
                                </div>
                            ) : (
                                <>
                                <div className="relative max-w-lg mx-auto mb-8">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search videos..."
                                        value={videoSearch}
                                        onChange={(e) => { setVideoSearch(e.target.value); setVideoPage(1); }}
                                        className={cn("w-full pl-12 pr-4 py-3 rounded-2xl border focus:outline-none transition-all font-medium shadow-sm", theme === 'dark' ? "bg-slate-900/50 border-white/10 focus:border-brand-pink/50 text-white placeholder:text-slate-600" : "bg-white border-slate-200 focus:border-brand-pink/50 text-slate-900")}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentVideos.length > 0 ? (
                                        currentVideos.map((video, idx) => {
                                            const videoId = getYouTubeVideoId(video.url);
                                            const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
                                            
                                            return (
                                            <div key={`${videoPage}-${idx}`} className="group cursor-pointer space-y-3">
                                                <div 
                                                    className="rounded-2xl overflow-hidden aspect-video bg-black relative shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1"
                                                    onClick={() => setSelectedVideo(video)}
                                                >
                                                    {thumbnailUrl ? (
                                                        <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                            <Youtube size={48} className="text-slate-600" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                            <PlayCircle size={28} fill="currentColor" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className={cn("font-bold text-base truncate group-hover:text-brand-pink transition-colors", theme === 'dark' ? "text-white" : "text-slate-900")}>{video.title || 'Untitled Video'}</h4>
                                                    {video.date && (
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>{video.date}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )})
                                    ) : (
                                        <div className="col-span-full text-center py-20">
                                            <Youtube size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                                            <p className="text-slate-500 font-medium">No videos found.</p>
                                        </div>
                                    )}
                                    
                                    {totalVideoPages > 1 && (
                                        <div className="col-span-full flex justify-center items-center gap-4 mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                                            <button
                                                onClick={() => setVideoPage(prev => Math.max(prev - 1, 1))}
                                                disabled={videoPage === 1}
                                                className={cn(
                                                    "p-2 rounded-full transition-colors",
                                                    theme === 'dark' ? "hover:bg-white/10 disabled:opacity-30 text-white" : "hover:bg-slate-100 disabled:opacity-30 text-slate-900"
                                                )}
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <span className={cn("text-sm font-bold uppercase tracking-widest", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                                Page {videoPage} of {totalVideoPages}
                                            </span>
                                            <button
                                                onClick={() => setVideoPage(prev => Math.min(prev + 1, totalVideoPages))}
                                                disabled={videoPage === totalVideoPages}
                                                className={cn(
                                                    "p-2 rounded-full transition-colors",
                                                    theme === 'dark' ? "hover:bg-white/10 disabled:opacity-30 text-white" : "hover:bg-slate-100 disabled:opacity-30 text-slate-900"
                                                )}
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                </>
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
                                        <img src={convertDriveLink(user.avatar)} className="w-full h-full rounded-full object-cover" alt="" loading="lazy" />
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
                                                <img src={convertDriveLink(comment.avatar) || `https://ui-avatars.com/api/?name=${comment.user}&background=random`} className="w-full h-full rounded-full object-cover" alt="" loading="lazy" />
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
                                                    <img src={convertDriveLink(reply.avatar) || `https://ui-avatars.com/api/?name=${reply.user}&background=random`} className="w-full h-full object-cover" alt="" loading="lazy" />
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
                    ) : activeTab === 'discography' ? (
                        /* Discography Tab */
                        <motion.div
                            key="discography"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {isEditing && isAdmin ? (
                                <div className="space-y-6">
                                    <Reorder.Group axis="y" values={albumList} onReorder={(newOrder) => {
                                        setAlbumList(newOrder);
                                        setFormData(prev => ({ ...prev, albums: newOrder.map(({ internalId, ...rest }) => rest) }));
                                    }} className="space-y-6">
                                    {albumList.map((album, idx) => (
                                        <Reorder.Item key={album.internalId} value={album} className={cn("p-6 rounded-3xl border space-y-4", theme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200")}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1">
                                                        <GripVertical size={20} />
                                                    </div>
                                                    <h4 className="font-black text-sm uppercase tracking-widest text-brand-pink">Album #{idx + 1}</h4>
                                                </div>
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
                                        </Reorder.Item>
                                    ))}
                                    </Reorder.Group>
                                    <button onClick={addAlbum} className="w-full py-4 rounded-2xl border-2 border-dashed border-brand-pink/30 text-brand-pink font-black uppercase tracking-widest hover:bg-brand-pink/5 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={20} /> Add Album
                                    </button>
                                </div>
                            ) : (
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                    }}
                                    initial="hidden"
                                    animate="show"
                                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                                >
                                    {(displayGroup.albums || []).length > 0 ? (
                                        (displayGroup.albums || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map((album, idx) => (
                                            <motion.div
                                                layout
                                                variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                                key={idx}
                                                whileHover={{ y: -8 }}
                                                onClick={() => {
                                                    if (album.youtube) {
                                                        setSelectedVideo({ title: album.title, url: album.youtube });
                                                    } else {
                                                        setSelectedAlbum(album);
                                                    }
                                                }}
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
                                </motion.div>
                            )}
                        </motion.div>
                    ) : null}
                </div>
            </div>

            {/* Similar Groups Section */}
            {similarGroups.length > 0 && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-10">
                    <h3 className={cn(
                        "text-2xl font-black mb-8 flex items-center gap-3",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>
                        <Users className="text-brand-purple" />
                        Similar Groups from {displayGroup.company}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {similarGroups.map(g => (
                            <GroupCard 
                                key={g.id} 
                                group={g} 
                                onClick={() => onGroupClick && onGroupClick(g.id)}
                                onFavorite={() => {}}
                            />
                        ))}
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
                            loading="lazy"
                            alt="Full size"
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}

            {/* Video Lightbox */}
            {createPortal(
                <AnimatePresence>
                {selectedVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedVideo(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                        >
                            <X size={24} />
                        </button>
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.url)}?autoplay=1`}
                                title={selectedVideo.title || "YouTube video player"}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="absolute inset-0"
                            />
                        </motion.div>
                        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none px-4">
                            <h3 className="text-2xl font-black text-white drop-shadow-lg">{selectedVideo.title}</h3>
                        </div>
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
                                <img src={convertDriveLink(selectedAlbum.cover)} className="w-full h-full object-cover" alt={selectedAlbum.title || 'Album Cover'} loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
                                <button onClick={() => setSelectedAlbum(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 md:hidden"><X size={20} /></button>
                            </div>
                            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className={cn("text-2xl md:text-3xl font-black leading-tight mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>{selectedAlbum.title}</h3>
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
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block flex items-center gap-2">
                                            <Youtube size={12} /> Album Preview
                                        </label>
                                        <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedAlbum.youtube)}`}
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                className="absolute inset-0"
                                            />
                                        </div>
                                    </div>
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

            {/* Reason Modal */}
            <AnimatePresence>
                {showReasonModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={cn("w-full max-w-md p-6 rounded-3xl shadow-2xl border overflow-hidden", theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200")}
                        >
                            <div className="flex items-center gap-3 mb-4 text-brand-pink">
                                <AlertCircle size={24} />
                                <h3 className="text-xl font-black">Reason for Edit</h3>
                            </div>
                            <p className={cn("text-sm mb-4 font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Please provide a reason or source for your changes to help admins verify them.</p>
                            <textarea
                                value={editReason}
                                onChange={e => setEditReason(e.target.value)}
                                className={cn("w-full h-32 p-4 rounded-2xl resize-none focus:outline-none border-2 transition-all font-medium mb-6", theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900")}
                                placeholder="e.g. Updated from official website..."
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowReasonModal(false)} className={cn("px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors", theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>Cancel</button>
                                <button onClick={confirmSubmitEdit} className="px-6 py-2 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20">Submit Request</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BackToTopButton />
        </motion.div>
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

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const MemberCard = React.memo(function MemberCard({ member, theme, onClick, onImageClick, id, onSearchPosition, user, onFavorite, onEdit }) {
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
    
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });
    const rotateX = useTransform(mouseY, [-0.5, 0.5], [25, -25]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-25, 25]);
    const imgX = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);
    const imgY = useTransform(mouseY, [-0.5, 0.5], [-15, 15]);

    const controls = useAnimation();
    const prevIsFavorite = usePrevious(member.isFavorite);

    useEffect(() => {
        if (member.isFavorite && !prevIsFavorite) {
            controls.start({
                scale: [1, 1.5, 1.2, 1.5, 1.2],
                rotate: [0, -10, 10, -10, 0],
                transition: { duration: 0.5, ease: "easeInOut" }
            });
        }
    }, [member.isFavorite, prevIsFavorite, controls]);

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

    const handlePositionClick = (e, pos) => {
        e.stopPropagation();
        if (onSearchPosition) onSearchPosition(pos);
    };

    const handleFavoriteClick = e => {
        e.stopPropagation();
        onFavorite();
    };

    const handleEditClick = e => {
        e.stopPropagation();
        onEdit();
    };

    const getPositionStyle = (position) => {
        // Minimal style for all positions
        // Using a subtle background and border for a clean look
        // Dark mode: slightly transparent white bg with subtle border
        // Light mode: very light slate bg with subtle border
        return theme === 'dark'
            ? "bg-slate-800/80 text-slate-500 border-white/5 group-hover:border-brand-pink/20"
            : "bg-slate-50 text-slate-400 border-slate-100 group-hover:border-brand-pink/10";
    };

    return (
        <motion.div
            id={id}
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { 
                    opacity: 1, y: 0, scale: 1,
                    transition: { type: "spring", stiffness: 300, damping: 30 }
                }
            }}
            whileInView={{
                scale: [1, 1.03, 1],
            }}
            onClick={() => {
                if (onClick) {
                    onClick(member);
                }
            }}
            className={cn(
                "relative group rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 min-h-[280px]",
                theme === 'dark' 
                    ? "bg-slate-900/40 border border-white/10 hover:border-brand-pink/30" 
                    : "bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-slate-200"
            )}
        >
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 z-10"
                style={{
                    background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`
                }}
            />

            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-pink/5 rounded-full blur-[90px] -mr-24 -mt-24 transition-all duration-700 group-hover:bg-brand-pink/20" />

            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-10 relative z-10 h-full">
                <motion.div 
                    style={{ rotateX, rotateY, perspective: 1000 }}
                    className="relative shrink-0 cursor-zoom-in min-w-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onImageClick && onImageClick(member.image);
                    }}
                >
                    <div className="absolute inset-0 bg-brand-pink blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl" />
                    <motion.div style={{ x: imgX, y: imgY }} className="relative z-10">
                        <img
                            src={convertDriveLink(member.image)}
                            alt={member.name}
                            loading="lazy"
                            className="w-36 h-48 md:w-48 md:h-64 rounded-2xl object-cover object-center border-4 border-white/10 shadow-xl transition-all duration-700 group-hover:scale-105"
                        />
                    </motion.div>
                    {user && (
                        <div className="absolute -top-2 -right-2 z-20 flex flex-col gap-2">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleFavoriteClick}
                                className={cn(
                                    "p-3 rounded-full border-4 transition-all duration-300",
                                    member.isFavorite
                                        ? "bg-brand-pink text-white shadow-[0_10px_30px_rgba(255,51,153,0.5)] border-slate-950"
                                        : "bg-black/20 backdrop-blur-sm border-transparent text-white/70 hover:bg-brand-pink/50 hover:text-white"
                                )}
                                title={member.isFavorite ? "Unfavorite" : "Favorite"}
                            >
                                <motion.div animate={controls}>
                                    <Star 
                                        size={16} 
                                        className={cn(
                                            "transition-all duration-200", 
                                            member.isFavorite 
                                                ? "fill-white stroke-white" 
                                                : "fill-transparent stroke-white"
                                        )} 
                                    />
                                </motion.div>
                            </motion.button>
                        </div>
                    )}
                </motion.div>

                <div className="flex-1 space-y-3 min-w-0 flex flex-col justify-center">
                    <p className="text-[15px] text-brand-pink font-black uppercase tracking-widest" title={(member.positions && member.positions[0]) || 'Member'}>
                        {(member.positions && member.positions[0]) || 'Member'}
                    </p>
                    <h4 className={cn(
                        "text-2xl md:text-3xl lg:text-4xl font-black transition-colors leading-tight tracking-tight",
                        theme === 'dark' ? "text-white group-hover:text-brand-pink" : "text-slate-900 group-hover:text-brand-pink"
                    )}>
                        {member.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-3">
                        {(member.positions || []).map((pos, i) => (
                            <span 
                                key={i} 
                                onClick={(e) => handlePositionClick(e, pos)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors cursor-pointer hover:opacity-80",
                                    getPositionStyle(pos)
                                )}
                            >
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
});

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
                        "font-black text-lg md:text-xl tracking-tight",
                        valueClass,
                        !valueClass && (theme === 'dark' ? "text-white" : "text-slate-900"),
                        isHighlight && "text-brand-purple"
                    )}>{value}</p>
                )}
            </div>
        </div>
    );
}
