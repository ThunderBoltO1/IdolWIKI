import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Search, UserPlus, Users, X, UserMinus } from 'lucide-react';
import { collection, doc, documentId, endAt, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAt, updateDoc, where, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { ConfirmationModal } from './ConfirmationModal';

const requestId = (fromUid, toUid) => `${fromUid}__${toUid}`;

export function FriendDropdown() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [searchValue, setSearchValue] = useState('');
    const normalizedSearch = useMemo(() => (searchValue || '').toLowerCase().trim().replace(/^@/, ''), [searchValue]);

    const [suggestions, setSuggestions] = useState([]);
    const [suggestLoading, setSuggestLoading] = useState(false);

    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequest, setOutgoingRequest] = useState(null);
    const [targetUid, setTargetUid] = useState(null);
    const [isFriend, setIsFriend] = useState(false);
    const [sending, setSending] = useState(false);
    const [friendsList, setFriendsList] = useState([]);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    // Modal State
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
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'friendRequests'),
            where('toUid', '==', user.uid)
        );

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((r) => r.status === 'pending');

                const enriched = items.map((r) => ({
                    ...r,
                    fromName: r.fromName || 'Unknown',
                    fromUsername: r.fromUsername || 'unknown',
                    fromAvatar: r.fromAvatar || '',
                })).filter(req => req.fromUsername !== 'unknown');
                setIncomingRequests(enriched);
            },
            (err) => console.error('Incoming requests error:', err)
        );

        return () => unsub();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const unsub = onSnapshot(
            friendsRef,
            async (snapshot) => {
                const friends = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        uid: data.uid || doc.id,
                        name: data.name || 'Unknown',
                        username: data.username || 'unknown',
                        avatar: data.avatar || '',
                        ...data,
                    };
                }).filter(friend => friend.username !== 'unknown');
                setFriendsList(friends);
            },
            (err) => console.error('Friends list error:', err)
        );

        return () => unsub();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'users'), where('isOnline', '==', true));
        const unsub = onSnapshot(q, (snapshot) => {
            setOnlineUserIds(new Set(snapshot.docs.map(d => d.id)));
        });

        return () => unsub();
    }, [user?.uid]);

    const onlineCount = useMemo(() => {
        return friendsList.filter(f => onlineUserIds.has(f.uid)).length;
    }, [friendsList, onlineUserIds]);

    useEffect(() => {
        if (!user?.uid || !normalizedSearch) {
            setOutgoingRequest(null);
            setTargetUid(null);
            setIsFriend(false);
            return;
        }

        let cancelled = false;
        let unsubscribeOutgoing = null;
        let unsubscribeFriend = null;

        const run = async () => {
            try {
                const usernameSnap = await getDoc(doc(db, 'usernames', normalizedSearch));
                const toUid = usernameSnap.exists() ? usernameSnap.data()?.uid : null;
                if (!toUid || cancelled) {
                    if (!cancelled) setOutgoingRequest(null);
                    if (!cancelled) setTargetUid(null);
                    if (!cancelled) setIsFriend(false);
                    return;
                }

                if (!cancelled) setTargetUid(toUid);

                unsubscribeFriend = onSnapshot(
                    doc(db, 'users', user.uid, 'friends', toUid),
                    (snap) => {
                        if (cancelled) return;
                        setIsFriend(snap.exists());
                    },
                    (err) => console.error('Friend doc error:', err)
                );

                unsubscribeOutgoing = onSnapshot(
                    doc(db, 'friendRequests', requestId(user.uid, toUid)),
                    (snap) => {
                        if (cancelled) return;
                        setOutgoingRequest(snap.exists() ? { id: snap.id, ...snap.data(), toUid } : null);
                    },
                    (err) => console.error('Outgoing request error:', err)
                );
            } catch (err) {
                console.error('Outgoing request lookup error:', err);
                if (!cancelled) setOutgoingRequest(null);
                if (!cancelled) setTargetUid(null);
                if (!cancelled) setIsFriend(false);
            }
        };

        run();

        return () => {
            cancelled = true;
            if (unsubscribeOutgoing) unsubscribeOutgoing();
            if (unsubscribeFriend) unsubscribeFriend();
        };
    }, [user?.uid, normalizedSearch]);

    useEffect(() => {
        if (!isOpen || !normalizedSearch || normalizedSearch.length < 2) {
            setSuggestions([]);
            return;
        }

        let cancelled = false;
        const run = async () => {
            setSuggestLoading(true);
            try {
                const q = query(
                    collection(db, 'usernames'),
                    orderBy(documentId()),
                    startAt(normalizedSearch),
                    endAt(`${normalizedSearch}\uf8ff`),
                    limit(8)
                );
                const snap = await getDocs(q);
                if (cancelled) return;
                const items = snap.docs.map((d) => ({
                    username: d.id,
                    uid: d.data()?.uid || null,
                })).filter((x) => !!x.uid);
                setSuggestions(items);
            } catch (err) {
                console.error('Username suggestions error:', err);
                if (!cancelled) setSuggestions([]);
            } finally {
                if (!cancelled) setSuggestLoading(false);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [isOpen, normalizedSearch]);

    const unreadCount = incomingRequests.length;

    const acceptFriendRequest = async (req) => {
        if (!user?.uid || !req?.fromUid || !req?.id) return;
        try {
            // These operations should succeed for the current user
            await updateDoc(doc(db, 'friendRequests', req.id), {
                status: 'accepted',
                respondedAt: serverTimestamp(),
            });

            // Add friend to current user's list
            await setDoc(doc(db, 'users', user.uid, 'friends', req.fromUid), {
                uid: req.fromUid,
                createdAt: serverTimestamp(),
                name: req.fromName || 'Unknown',
                username: req.fromUsername || 'unknown',
                avatar: req.fromAvatar || '',
            });
            await updateDoc(doc(db, 'users', user.uid), { friendCount: increment(1) });

            // Send notification to the requester that they are now friends
            await addDoc(collection(db, 'notifications'), {
                recipientId: req.fromUid,
                type: 'friend_accepted',
                title: 'Friend Request Accepted',
                message: `${user.name || user.email} accepted your friend request!`,
                data: {
                    fromUid: user.uid,
                    fromName: user.name || user.email,
                    fromUsername: user.username,
                },
                read: false,
                createdAt: serverTimestamp(),
            });

            // Try to update the other user's data. This might fail due to permissions.
            try {
                await setDoc(doc(db, 'users', req.fromUid, 'friends', user.uid), {
                    uid: user.uid,
                    createdAt: serverTimestamp(),
                    name: user.name || 'Anonymous',
                    username: (user.username || '').toLowerCase().trim(),
                    avatar: user.avatar || '',
                });
                await updateDoc(doc(db, 'users', req.fromUid), { friendCount: increment(1) });
            } catch (e) {
                console.warn("Could not update friend's data (permissions may be restricted, this is expected for non-admins):", e);
            }
        } catch (err) {
            console.error('Accept friend request error:', err);
            if (err.code === 'permission-denied') {
                setModalConfig({
                    isOpen: true,
                    title: 'Permission Denied',
                    message: 'Could not accept friend request. Please check your security rules.',
                    type: 'danger'
                });
            } else {
                setModalConfig({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to accept friend request',
                    type: 'danger'
                });
            }
        }
    };

    const declineFriendRequest = async (req) => {
        if (!user?.uid || !req?.id) return;
        try {
            await updateDoc(doc(db, 'friendRequests', req.id), {
                status: 'declined',
                respondedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Decline friend request error:', err);
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: 'Failed to decline friend request',
                type: 'danger'
            });
        }
    };

    const sendFriendRequestToUid = async (toUid) => {
        if (!user?.uid || !toUid) return;
        if (toUid === user.uid) {
            setModalConfig({
                isOpen: true,
                title: 'Action not allowed',
                message: "You can't add yourself",
                type: 'info'
            });
            return;
        }

        setSending(true);
        try {
            const reqRef = doc(db, 'friendRequests', requestId(user.uid, toUid));
            const reqSnap = await getDoc(reqRef);

            if (reqSnap.exists()) {
                const data = reqSnap.data();
                if (data.status === 'pending') {
                    setModalConfig({
                        isOpen: true,
                        title: 'Request Pending',
                        message: 'Friend request already sent!',
                        type: 'info'
                    });
                    return;
                }
                if (data.status === 'accepted') {
                    setModalConfig({
                        isOpen: true,
                        title: 'Already Friends',
                        message: 'You are already friends!',
                        type: 'success'
                    });
                    return;
                }
                // If declined, delete the old request so we can create a new one
                await deleteDoc(reqRef);
            }

            await setDoc(reqRef, {
                fromUid: user.uid,
                toUid: toUid,
                fromUsername: (user.username || '').toLowerCase().trim(),
                fromName: user.name || '',
                fromAvatar: user.avatar || '',
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            
            setModalConfig({
                isOpen: true,
                title: 'Request Sent',
                message: 'Friend request sent successfully!',
                type: 'success'
            });
        } catch (err) {
            console.error('Send friend request error:', err);
            if (err.code === 'permission-denied') {
                setModalConfig({
                    isOpen: true,
                    title: 'Permission Denied',
                    message: 'Please check Firestore Security Rules.',
                    type: 'danger'
                });
            } else {
                setModalConfig({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to send friend request',
                    type: 'danger'
                });
            }
        } finally {
            setSending(false);
        }
    };

    const removeFriend = async (friendId) => {
        if (!user?.uid || !friendId) return;
        
        setModalConfig({
            isOpen: true,
            title: 'Remove Friend',
            message: 'Are you sure you want to remove this friend?',
            type: 'danger',
            singleButton: false,
            confirmText: 'Remove',
            onConfirm: () => executeRemoveFriend(friendId)
        });
    };

    const executeRemoveFriend = async (friendId) => {
        try {
            // 1. Remove from current user's friend list (Should always succeed if rules allow writing to own doc)
            await deleteDoc(doc(db, 'users', user.uid, 'friends', friendId));
            // Decrement own friend count
            await updateDoc(doc(db, 'users', user.uid), { friendCount: increment(-1) });
        } catch (err) {
            console.error('Error removing friend from your list:', err);
            // Error handling is silent or can be added here if needed
            return;
        }

        try {
            // 2. Try to remove from the other user's friend list (Might fail due to permissions, which is fine)
            await deleteDoc(doc(db, 'users', friendId, 'friends', user.uid));
            // Decrement the other user's friend count
            await updateDoc(doc(db, 'users', friendId), { friendCount: increment(-1) });
        } catch (e) {
            console.warn('Could not remove from friend\'s list (expected if restricted):', e);
        }
    };

    const sendFriendRequest = async () => {
        if (!user?.uid) return;

        const u = normalizedSearch;
        if (!u) return;

        setSending(true);
        try {
            const usernameSnap = await getDoc(doc(db, 'usernames', u));
            if (!usernameSnap.exists()) {
                setModalConfig({
                    isOpen: true,
                    title: 'Not Found',
                    message: 'User not found',
                    type: 'danger'
                });
                return;
            }

            const toUid = usernameSnap.data()?.uid;
            if (!toUid) {
                setModalConfig({
                    isOpen: true,
                    title: 'Not Found',
                    message: 'User not found',
                    type: 'danger'
                });
                return;
            }

            await sendFriendRequestToUid(toUid);
        } catch (err) {
            console.error('Send friend request error:', err);
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: 'Failed to send friend request',
                type: 'danger'
            });
        } finally {
            setSending(false);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-2.5 rounded-full transition-all duration-300 active:scale-95 relative",
                    theme === 'dark'
                        ? "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
                title="Friends"
            >
                <Users size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-brand-pink text-white rounded-full border-2 border-slate-900 text-[10px] font-black flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            "absolute right-0 mt-4 w-80 md:w-96 rounded-3xl shadow-2xl border overflow-hidden z-50",
                            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"
                        )}
                    >
                        <div className={cn(
                            "p-4 border-b",
                            theme === 'dark' ? "border-white/5 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"
                        )}>
                            <h3 className={cn("font-black text-sm uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-slate-900")}>
                                Friends
                            </h3>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", theme === 'dark' ? "text-slate-500" : "text-slate-500")}>
                                Add by username and manage requests
                            </p>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className={cn(
                                "rounded-2xl border p-3",
                                theme === 'dark' ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-white"
                            )}>
                                <div className="flex items-center gap-2">
                                    <Search size={16} className={cn(theme === 'dark' ? 'text-slate-500' : 'text-slate-400')} />
                                    <input
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        placeholder="@username"
                                        className={cn(
                                            "flex-1 bg-transparent focus:outline-none text-sm font-bold",
                                            theme === 'dark' ? "text-white placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                                        )}
                                    />
                                </div>

                                {(suggestLoading || suggestions.length > 0) && (
                                    <div className={cn(
                                        "mt-3 rounded-2xl border overflow-hidden",
                                        theme === 'dark' ? "border-white/10 bg-slate-950/20" : "border-slate-200 bg-slate-50"
                                    )}>
                                        {suggestLoading ? (
                                            <div className="p-3 flex items-center gap-2">
                                                <Loader2 size={14} className="animate-spin text-brand-pink" />
                                                <span className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Searching…</span>
                                            </div>
                                        ) : (
                                            <div className="max-h-44 overflow-auto custom-scrollbar">
                                                {suggestions.map((s) => (
                                                    <div
                                                        key={s.username}
                                                        className={cn(
                                                            "flex items-center gap-2 p-3 border-b last:border-b-0",
                                                            theme === 'dark' ? "border-white/5" : "border-slate-200"
                                                        )}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchValue(`@${s.username}`)}
                                                            className={cn(
                                                                "flex-1 min-w-0 text-left text-xs font-black uppercase tracking-widest truncate hover:underline",
                                                                theme === 'dark' ? "text-white" : "text-slate-900"
                                                            )}
                                                        >
                                                            @{s.username}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsOpen(false);
                                                                navigate(`/u/${s.username}`);
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors",
                                                                theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-white"
                                                            )}
                                                        >
                                                            See
                                                        </button>
                                                        {!(s.uid === user.uid) && !(outgoingRequest?.status === 'pending' && outgoingRequest.toUid === s.uid) && !(isFriend && targetUid === s.uid) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => sendFriendRequestToUid(s.uid)}
                                                                disabled={sending || s.uid === user.uid}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors",
                                                                    "border-transparent bg-brand-purple text-white hover:bg-brand-purple/90",
                                                                    (sending || s.uid === user.uid) && "opacity-60"
                                                                )}
                                                            >
                                                                Add
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                             </div>

                            <div>
                                <div className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    Incoming requests
                                </div>
                                <div className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>
                                    {incomingRequests.length} pending
                                </div>

                                {incomingRequests.length === 0 ? (
                                    <div className={cn(
                                        "mt-3 rounded-2xl border p-4 text-center",
                                        theme === 'dark' ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-slate-50"
                                    )}>
                                        <p className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>No pending requests</p>
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        <AnimatePresence mode="popLayout">
                                        {incomingRequests.map((req) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                key={req.id}
                                                className={cn(
                                                    "rounded-2xl border p-3 flex items-center gap-3",
                                                    theme === 'dark' ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-white"
                                                )}
                                            >
                                                {(req.fromAvatar && req.fromAvatar.trim()) && (
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border shrink-0">
                                                        {(() => {
                                                            const avatarUrl = convertDriveLink(req.fromAvatar);
                                                            return avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '';
                                                                    }}
                                                                />
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className={cn("text-xs font-black truncate", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                                        {req.fromName || 'Unknown'}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const u = (req.fromUsername || '').toLowerCase().trim();
                                                        if (!u || u === 'unknown') return;
                                                            setIsOpen(false);
                                                            navigate(`/u/${u}`);
                                                        }}
                                                        className={cn(
                                                            "text-[10px] font-bold uppercase tracking-widest truncate hover:underline",
                                                            theme === 'dark' ? 'text-slate-500' : 'text-slate-500',
                                                            (!(req.fromUsername || '').trim() || req.fromUsername === 'unknown') && 'opacity-50 pointer-events-none'
                                                        )}
                                                    >
                                                        @{req.fromUsername || 'unknown'}
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const u = (req.fromUsername || '').toLowerCase().trim();
                                                    if (!u || u === 'unknown') return;
                                                            setIsOpen(false);
                                                            navigate(`/u/${u}`);
                                                        }}
                                                disabled={!(req.fromUsername || '').trim() || req.fromUsername === 'unknown'}
                                                        className={cn(
                                                            "p-2 rounded-xl border transition-colors",
                                                            theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-slate-50",
                                                    (!(req.fromUsername || '').trim() || req.fromUsername === 'unknown') && 'opacity-50'
                                                        )}
                                                        title="See profile"
                                                    >
                                                        <Search size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => declineFriendRequest(req)}
                                                        className={cn(
                                                            "p-2 rounded-xl border transition-colors",
                                                            theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-slate-50"
                                                        )}
                                                        title="Decline"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => acceptFriendRequest(req)}
                                                        className={cn(
                                                            "p-2 rounded-xl border transition-colors",
                                                            "border-transparent bg-brand-pink text-white hover:bg-brand-pink/90"
                                                        )}
                                                        title="Accept"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Friends List */}
                            <div>
                                <div className={cn("text-xs font-black uppercase tracking-widest", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    Your Friends
                                </div>
                                <div className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>
                                    {friendsList.length} friends 
                                    <span className="text-emerald-500 inline-flex items-center gap-1 ml-1">
                                        <motion.span 
                                            animate={{ opacity: [0.5, 1, 0.5] }} 
                                            transition={{ duration: 2, repeat: Infinity }} 
                                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" 
                                        /> 
                                        {onlineCount} online
                                    </span>
                                </div>

                                {friendsList.length === 0 ? (
                                    <div className={cn(
                                        "mt-3 rounded-2xl border p-4 text-center",
                                        theme === 'dark' ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-slate-50"
                                    )}>
                                        <p className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>No friends yet</p>
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        <AnimatePresence mode="popLayout">
                                        {friendsList.map((friend) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                                key={friend.uid || friend.id}
                                                className={cn(
                                                    "rounded-2xl border p-3 flex items-center gap-3",
                                                    theme === 'dark' ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-white"
                                                )}
                                            >
                                                {(friend.avatar && friend.avatar.trim()) && (
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border shrink-0">
                                                        {(() => {
                                                            const avatarUrl = convertDriveLink(friend.avatar);
                                                            return avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '';
                                                                    }}
                                                                />
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className={cn("text-xs font-black truncate", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                                        {friend.name || 'Unknown'}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const u = (friend.username || '').toLowerCase().trim();
                                                            if (!u || u === 'unknown') return;
                                                            setIsOpen(false);
                                                            navigate(`/u/${u}`);
                                                        }}
                                                        className={cn(
                                                            "text-[10px] font-bold uppercase tracking-widest truncate hover:underline",
                                                            theme === 'dark' ? 'text-slate-500' : 'text-slate-500',
                                                        (!(friend.username || '').trim() || friend.username === 'unknown') && 'opacity-50 pointer-events-none'
                                                        )}
                                                    >
                                                        @{friend.username || 'unknown'}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const u = (friend.username || '').toLowerCase().trim();
                                                            if (!u || u === 'unknown') return;
                                                            setIsOpen(false);
                                                            navigate(`/u/${u}`);
                                                        }}
                                                        disabled={!(friend.username || '').trim() || friend.username === 'unknown'}
                                                        className={cn(
                                                            "p-2 rounded-xl border transition-colors",
                                                            theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-slate-50",
                                                            (!(friend.username || '').trim() || friend.username === 'unknown') && 'opacity-50'
                                                        )}
                                                        title="See profile"
                                                    >
                                                        <Search size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFriend(friend.uid)}
                                                        className={cn("p-2 rounded-xl border transition-colors", theme === 'dark' ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-100")}
                                                        title="Remove friend">
                                                        <UserMinus size={14} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                {...modalConfig}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
