import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Loader2, UserMinus, UserPlus, Check, Flag } from 'lucide-react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where, deleteDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmationModal } from './ConfirmationModal';

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

export function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const normalizedUsername = useMemo(() => (username || '').toLowerCase().trim(), [username]);

  const [profileUid, setProfileUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const isSelf = !!user?.uid && !!profileUid && user.uid === profileUid;

  const [friendsDocExists, setFriendsDocExists] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [friendCount, setFriendCount] = useState(0);

  const [wallPosts, setWallPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

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
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadError(null);
      setProfileUid(null);
      setProfile(null);

      if (!normalizedUsername) {
        setLoadError('Username not found');
        setLoading(false);
        return;
      }

      try {
        const usernameSnap = await getDoc(doc(db, 'usernames', normalizedUsername));
        if (!usernameSnap.exists()) {
          if (!cancelled) {
            setLoadError('User not found');
            setLoading(false);
          }
          return;
        }

        const uid = usernameSnap.data()?.uid;
        if (!uid) {
          if (!cancelled) {
            setLoadError('User not found');
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setProfileUid(uid);
          setLoading(false);
        }
      } catch (err) {
        console.error('Load username error:', err);
        if (!cancelled) {
          setLoadError('Failed to load user');
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [normalizedUsername]);

  useEffect(() => {
    if (!profileUid) return;

    const loadProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'users', profileUid));
        if (profileDoc.exists()) {
          setProfile({ uid: profileDoc.id, ...profileDoc.data() });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Load profile error:', err);
        setProfile(null);
      }
    };

    loadProfile();
  }, [profileUid]);

  useEffect(() => {
    if (!user?.uid || !profileUid || user.uid === profileUid) {
      setFriendsDocExists(false);
      return;
    }
    
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'friends', profileUid), (docSnap) => {
      setFriendsDocExists(docSnap.exists());
    }, (err) => {
        console.error('Friends doc error:', err);
        setFriendsDocExists(false);
    });
    
    const reqId = `${user.uid}__${profileUid}`;
    const unsubReq = onSnapshot(doc(db, 'friendRequests', reqId), (docSnap) => {
        setHasPendingRequest(docSnap.exists() && docSnap.data().status === 'pending');
    });

    return () => {
        unsub();
        unsubReq();
    };
  }, [user?.uid, profileUid]);

  useEffect(() => {
    // Read friendCount directly from the profile data
    setFriendCount(profile?.friendCount || 0);
  }, [profile]);

  useEffect(() => {
    if (!profileUid) return;

    const q = query(
      collection(db, 'comments'),
      where('targetType', '==', 'user'),
      where('targetId', '==', profileUid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setWallPosts(items);
      },
      (err) => {
        console.error('Wall posts error:', err);
      }
    );

    return () => unsub();
  }, [profileUid]);

  const canPost = !!user?.uid && (isSelf || friendsDocExists);

  const handlePost = async () => {
    if (!canPost || !newPost.trim() || !profileUid) return;

    setPosting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        targetType: 'user',
        targetId: profileUid,
        userId: user.uid,
        user: user.name || user.email || 'Anonymous',
        username: (user.username || '').toLowerCase().trim(),
        avatar: user.avatar || '',
        text: newPost.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });
      setNewPost('');
    } catch (err) {
      console.error('Post wall error:', err);
      setModalConfig({
          isOpen: true,
          title: 'Error',
          message: 'Failed to post',
          type: 'danger'
      });
    } finally {
      setPosting(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user?.uid || !profileUid) return;
    try {
        const reqId = `${user.uid}__${profileUid}`;
        const reqRef = doc(db, 'friendRequests', reqId);
        
        const reqSnap = await getDoc(reqRef);
        if (reqSnap.exists()) {
            const data = reqSnap.data();
            if (data.status === 'pending') return;
            if (data.status === 'accepted') return;
            await deleteDoc(reqRef);
        }

        await setDoc(reqRef, {
            fromUid: user.uid,
            toUid: profileUid,
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
        console.error('Add friend error:', err);
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
    }
  };

  const handleUnfriend = async () => {
    setModalConfig({
        isOpen: true,
        title: 'Unfriend',
        message: 'Are you sure you want to unfriend this user?',
        type: 'danger',
        singleButton: false,
        confirmText: 'Unfriend',
        onConfirm: executeUnfriend
    });
  };

  const executeUnfriend = async () => {
    try {
        // 1. Remove from current user's friend list
        await deleteDoc(doc(db, 'users', user.uid, 'friends', profileUid));
        await updateDoc(doc(db, 'users', user.uid), { friendCount: increment(-1) });
    } catch (err) {
        console.error('Unfriend error:', err);
        // Error handling
        return;
    }

    try {
        // 2. Try to remove from the other user's friend list
        await deleteDoc(doc(db, 'users', profileUid, 'friends', user.uid));
        await updateDoc(doc(db, 'users', profileUid), { friendCount: increment(-1) });
    } catch (e) {
        console.warn('Failed to remove from friend\'s list (expected if restricted)', e);
    }
  };

  const handleReportUser = () => {
    setModalConfig({
        isOpen: true,
        title: 'Report User',
        message: 'Are you sure you want to report this user?',
        type: 'danger',
        singleButton: false,
        confirmText: 'Report',
        onConfirm: executeReportUser
    });
  };

  const executeReportUser = async () => {
    try {
        await addDoc(collection(db, 'reports'), {
            targetId: profileUid,
            targetType: 'user',
            reportedBy: user.uid,
            createdAt: serverTimestamp(),
            status: 'pending'
        });
        setModalConfig({
            isOpen: true,
            title: 'Report Sent',
            message: 'Thank you. We will review this user.',
            type: 'success'
        });
    } catch (error) {
        console.error("Error reporting user:", error);
        setModalConfig({
            isOpen: true,
            title: 'Error',
            message: 'Failed to send report.',
            type: 'danger'
        });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className={cn(
          'px-6 py-4 rounded-2xl border flex items-center gap-3',
          theme === 'dark' ? 'border-white/10 bg-slate-900/40 text-white' : 'border-slate-200 bg-white text-slate-900'
        )}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest">Loading profile</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
            theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
          )}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className={cn(
          'mt-8 rounded-[40px] p-10 border text-center',
          theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        )}>
          <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
            theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
          )}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          {isSelf ? 'Your profile wall' : `@${normalizedUsername}`}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        <aside className="lg:sticky lg:top-24">
          <div className={cn(
            'rounded-[32px] border overflow-hidden',
            theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
          )}>
            <div className={cn(
              'p-6 border-b',
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            )}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border shrink-0">
                  {(() => {
                    const avatarUrl = convertDriveLink(profile?.avatar);
                    return avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile?.name || normalizedUsername}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                        }}
                      />
                    ) : null;
                  })()}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className={cn('text-xl font-black tracking-tight truncate', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                    {profile?.name || normalizedUsername}
                  </h1>
                  <p className={cn('mt-1 text-[10px] font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    @{normalizedUsername}
                  </p>
                </div>
              </div>

              <p className={cn('mt-4 text-sm leading-relaxed whitespace-pre-wrap', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                {profile?.bio || 'No bio yet'}
              </p>
            </div>

            <div className="p-6 space-y-3">
              <div className={cn(
                'rounded-2xl border p-4 text-center',
                theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
              )}>
                <div className={cn('text-[10px] font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                  Friends
                </div>
                <div className={cn('mt-1 text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                  {friendCount}
                </div>
              </div>

              {isSelf ? (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                    'border-transparent bg-brand-purple text-white hover:bg-brand-purple/90'
                  )}
                >
                  <Edit2 size={14} /> Edit profile
                </button>
              ) : !user?.uid ? (
                <div className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                  Log in to add friends and post
                </div>
              ) : friendsDocExists ? (
                <button
                  type="button"
                  onClick={handleUnfriend}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                    theme === 'dark' ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'
                  )}
                >
                  <UserMinus size={14} /> Unfriend
                </button>
              ) : hasPendingRequest ? (
                <button
                  type="button"
                  disabled
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors opacity-50 cursor-not-allowed',
                    theme === 'dark' ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                  )}
                >
                  <Check size={14} /> Request Sent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                    'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90'
                  )}
                >
                  <UserPlus size={14} /> Add Friend
                </button>
              )}

              {!isSelf && user?.uid && (
                <button
                  type="button"
                  onClick={handleReportUser}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                    theme === 'dark' ? 'border-white/10 text-slate-400 hover:text-red-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:text-red-500 hover:bg-slate-50'
                  )}
                >
                  <Flag size={14} /> Report User
                </button>
              )}

              <div className={cn(
                'rounded-2xl border p-4',
                theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
              )}>
                <div className={cn('text-[10px] font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                  Posting rules
                </div>
                <div className={cn('mt-2 text-xs font-medium leading-relaxed', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  {isSelf ? 'You can post on your own wall.' : friendsDocExists ? 'Friends can post on this wall.' : 'Add friend to post on this wall.'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className={cn(
            'rounded-[32px] border overflow-hidden',
            theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
          )}>
            <div className={cn(
              'px-6 py-5 border-b flex items-center justify-between gap-4',
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            )}>
              <div>
                <h2 className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-slate-900')}>Fan Talk Board</h2>
                <div className={cn('mt-1 text-[10px] font-bold uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>
                  {wallPosts.length} posts
                </div>
              </div>
              <div className={cn('text-xs font-bold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                {canPost ? 'You can post' : 'Read only'}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={canPost ? 'Write something...' : 'Add friend to post on this profile'}
                disabled={!canPost || posting}
                rows={4}
                className={cn(
                  'w-full rounded-3xl p-5 focus:outline-none border transition-all text-sm font-medium resize-none',
                  theme === 'dark'
                    ? 'bg-slate-950/30 border-white/10 focus:border-brand-pink text-white disabled:opacity-60'
                    : 'bg-slate-50 border-slate-200 focus:border-brand-pink text-slate-900 disabled:opacity-60'
                )}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!canPost || posting || !newPost.trim()}
                  className={cn(
                    'px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95',
                    'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90',
                    (!canPost || posting || !newPost.trim()) && 'opacity-60'
                  )}
                >
                  {posting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Posting</span>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </div>
          </div>

          {wallPosts.length === 0 ? (
            <div className={cn(
              'rounded-[32px] border p-10 text-center',
              theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            )}>
              <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wallPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-[32px] border overflow-hidden',
                    theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
                  )}
                >
                  <div className={cn(
                    'px-6 py-4 border-b flex items-center justify-between gap-4',
                    theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden border shrink-0">
                        {(() => {
                          const avatarUrl = convertDriveLink(post.avatar);
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
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            const u = (post.username || '').toLowerCase().trim();
                            if (!u) return;
                            navigate(`/u/${u}`);
                          }}
                          className={cn(
                            'text-sm font-black hover:underline truncate',
                            theme === 'dark' ? 'text-white' : 'text-slate-900',
                            !(post.username || '').trim() && 'pointer-events-none'
                          )}
                        >
                          {post.user || 'Anonymous'}
                        </button>
                        <div className={cn('mt-1 text-[10px] font-bold uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>
                          {getRelativeTime(post.createdAt?.toMillis?.())}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      'text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border',
                      theme === 'dark' ? 'border-white/10 text-slate-300 bg-slate-950/30' : 'border-slate-200 text-slate-600 bg-slate-50'
                    )}>
                      #{wallPosts.length - idx}
                    </div>
                  </div>

                  <div className={cn('p-6 text-sm leading-relaxed whitespace-pre-wrap', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                    {post.text}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmationModal
          {...modalConfig}
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
