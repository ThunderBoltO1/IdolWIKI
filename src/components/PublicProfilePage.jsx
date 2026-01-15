import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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

  const [wallPosts, setWallPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

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

    const unsub = onSnapshot(
      doc(db, 'users', profileUid),
      (snap) => {
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() });
        } else {
          setProfile(null);
        }
      },
      (err) => {
        console.error('Load profile error:', err);
      }
    );

    return () => unsub();
  }, [profileUid]);

  useEffect(() => {
    if (!user?.uid || !profileUid || user.uid === profileUid) {
      setFriendsDocExists(false);
      return;
    }

    const friendsUnsub = onSnapshot(
      doc(db, 'users', user.uid, 'friends', profileUid),
      (snap) => setFriendsDocExists(snap.exists()),
      (err) => console.error('Friends doc error:', err)
    );

    return () => {
      friendsUnsub();
    };
  }, [user?.uid, profileUid]);

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
      alert('Failed to post');
    } finally {
      setPosting(false);
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
                  <img
                    src={convertDriveLink(profile?.avatar) || ''}
                    alt={profile?.name || normalizedUsername}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '';
                    }}
                  />
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
              ) : (
                <div className={cn(
                  'rounded-2xl border p-4 text-center',
                  theme === 'dark' ? 'border-white/10 bg-slate-950/30 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                )}>
                  <div className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                    Friend system moved
                  </div>
                  <div className={cn('mt-2 text-xs font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    Use the Friends menu in the navbar to add or accept friends.
                  </div>
                </div>
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
                      <button
                        type="button"
                        onClick={() => {
                          const u = (post.username || '').toLowerCase().trim();
                          if (!u) return;
                          navigate(`/u/${u}`);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full overflow-hidden border shrink-0",
                          !(post.username || '').trim() && "pointer-events-none"
                        )}
                        title={post.username ? `View @${post.username}` : ''}
                      >
                        <img
                          src={convertDriveLink(post.avatar) || ''}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                          }}
                        />
                      </button>

                      <div className="min-w-0">
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
    </div>
  );
}
