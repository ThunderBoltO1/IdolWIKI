import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Plus, Save, Trash2, Youtube, Image as ImageIcon, Instagram, Twitter, Globe } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function IdolDetailPage() {
  const { idolId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { theme } = useTheme();

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
        if (url && url.length === 11 && !url.includes('/') && !url.includes('.')) {
            videoId = url;
        }
    }
    return videoId;
  };

  const [idol, setIdol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditingWorks, setIsEditingWorks] = useState(false);
  const [albumsDraft, setAlbumsDraft] = useState([]);
  const [videosDraft, setVideosDraft] = useState([]);
  const [galleryDraft, setGalleryDraft] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!idolId) return;

    setLoading(true);
    setLoadError(null);

    const unsub = onSnapshot(
      doc(db, 'idols', idolId),
      (snap) => {
        if (!snap.exists()) {
          setIdol(null);
          setLoading(false);
          setLoadError('Idol not found');
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        setIdol(data);
        setLoading(false);
      },
      (err) => {
        console.error('Idol detail load error:', err);
        setLoadError('Failed to load idol');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [idolId]);

  useEffect(() => {
    setIsEditingWorks(false);
    setAlbumsDraft(idol?.albums || []);
    setVideosDraft(idol?.videos || []);
    setGalleryDraft(idol?.gallery || []);
  }, [idol?.id]);

  const normalizedAlbums = useMemo(() => {
    const albums = isEditingWorks ? albumsDraft : (idol?.albums || []);
    return (albums || []).map((a) => ({
      title: a?.title || '',
      cover: a?.cover || '',
      date: a?.date || '',
      youtube: a?.youtube || '',
      tracks: Array.isArray(a?.tracks) ? a.tracks : []
    }));
  }, [albumsDraft, idol?.albums, isEditingWorks]);

  const updateAlbum = (index, field, value) => {
    setAlbumsDraft((prev) => {
      const next = [...(prev || [])];
      const current = next[index] || {};
      next[index] = { ...current, [field]: value };
      return next;
    });
  };

  const addAlbum = () => {
    setAlbumsDraft((prev) => ([
      ...(prev || []),
      { title: '', cover: '', date: '', youtube: '', tracks: [] }
    ]));
  };

  const removeAlbum = (index) => {
    setAlbumsDraft((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const addVideo = () => {
    setVideosDraft((prev) => [...(prev || []), { title: '', url: '' }]);
  };

  const updateVideo = (index, field, value) => {
    setVideosDraft((prev) => {
      const next = [...(prev || [])];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeVideo = (index) => {
    setVideosDraft((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const addGalleryImage = () => {
    setGalleryDraft((prev) => [...(prev || []), '']);
  };

  const updateGalleryImage = (index, value) => {
    setGalleryDraft((prev) => {
      const next = [...(prev || [])];
      next[index] = value;
      return next;
    });
  };

  const removeGalleryImage = (index) => {
    setGalleryDraft((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const saveWorks = async () => {
    if (!isAdmin || !idolId) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'idols', idolId), {
        albums: albumsDraft,
        videos: videosDraft,
        gallery: galleryDraft,
        updatedAt: new Date().toISOString()
      });
      setIsEditingWorks(false);
    } catch (err) {
      console.error('Save works error:', err);
      alert('Failed to save works. Please check your Firestore rules.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('min-h-[60vh] flex items-center justify-center', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
        <div className={cn('px-6 py-4 rounded-2xl border', theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white')}>
          <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Loading</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
            theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
          )}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className={cn(
          'mt-8 rounded-[40px] p-10 border',
          theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        )}>
          <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!idol) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
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

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isEditingWorks) {
                  setIsEditingWorks(false);
                  setAlbumsDraft(idol.albums || []);
                  return;
                }
                setIsEditingWorks(true);
                setAlbumsDraft(idol.albums || []);
              }}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                isEditingWorks
                  ? (theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50')
                  : 'border-transparent bg-brand-purple text-white hover:bg-brand-purple/90'
              )}
            >
              {isEditingWorks ? 'Cancel' : 'Edit Profile'}
            </button>

            {isEditingWorks && (
              <button
                type="button"
                onClick={saveWorks}
                disabled={isSaving}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                  'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90',
                  isSaving && 'opacity-60'
                )}
              >
                <Save size={14} /> Save
              </button>
            )}
          </div>
        )}
      </div>

      <div className={cn(
        'rounded-[48px] border overflow-hidden',
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
      )}>
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="aspect-[3/4] relative overflow-hidden">
              <img
                src={convertDriveLink(idol.image)}
                alt={idol.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>
          </div>

          <div className="md:col-span-7 p-8 md:p-10 space-y-6">
            <div>
              <p className={cn('text-xs font-black uppercase tracking-[0.25em]', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Artist</p>
              <h1 className={cn('text-4xl md:text-6xl font-black tracking-tight mt-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border',
                  theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                )}>
                  <Building2 size={14} className="text-brand-pink" />
                  <span>{idol.company || 'Unknown company'}</span>
                </div>

                <div className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border',
                  theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                )}>
                  <Calendar size={14} className="text-brand-purple" />
                  <span>{idol.debutDate || 'Debut date n/a'}</span>
                </div>

                {idol.instagram && (
                  <a
                    href={idol.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border hover:scale-105 transition-transform',
                      theme === 'dark' ? 'border-white/10 text-pink-400 bg-slate-950/40' : 'border-slate-200 text-pink-600 bg-slate-50'
                    )}
                  >
                    <Instagram size={14} /> Instagram
                  </a>
                )}
                {idol.twitter && (
                  <a
                    href={idol.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border hover:scale-105 transition-transform',
                      theme === 'dark' ? 'border-white/10 text-sky-400 bg-slate-950/40' : 'border-slate-200 text-sky-600 bg-slate-50'
                    )}
                  >
                    <Twitter size={14} /> X
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Profile</p>
              <div className={cn(
                'rounded-3xl border p-6',
                theme === 'dark' ? 'border-white/10 bg-slate-950/30 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
              )}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                  <div>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Full name</span>
                    <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.fullEnglishName || '-'}</div>
                  </div>
                  <div>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Korean name</span>
                    <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.koreanName || '-'}</div>
                  </div>
                  <div>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Nationality</span>
                    <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.nationality || '-'}</div>
                  </div>
                  <div>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Birth date</span>
                    <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.birthDate || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-xl font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            <Youtube size={20} /> Featured Videos
          </h2>
          {isEditingWorks && (
            <button
              type="button"
              onClick={addVideo}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90'
              )}
            >
              <Plus size={14} /> Add Video
            </button>
          )}
        </div>

        {isEditingWorks ? (
          <div className="space-y-3">
            {videosDraft.map((video, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={video.title}
                  onChange={(e) => updateVideo(idx, 'title', e.target.value)}
                  className={cn(
                    "w-1/3 rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-xs font-bold",
                    theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                  )}
                  placeholder="Title (e.g. MV)"
                />
                <input
                  value={video.url}
                  onChange={(e) => updateVideo(idx, 'url', e.target.value)}
                  className={cn(
                    "flex-1 rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-xs font-bold",
                    theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                  )}
                  placeholder="YouTube URL..."
                />
                <button
                  type="button"
                  onClick={() => removeVideo(idx)}
                  className={cn(
                    "p-3 rounded-2xl transition-colors shrink-0",
                    theme === 'dark' ? "bg-slate-800 text-red-400 hover:bg-red-900/40" : "bg-red-50 text-red-500 hover:bg-red-100"
                  )}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {videosDraft.length === 0 && <p className="text-sm text-slate-500 italic">No videos added.</p>}
          </div>
        ) : (
          (idol.videos && idol.videos.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {idol.videos.map((video, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(video.url)}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  </div>
                  <p className={cn("text-sm font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{video.title || 'Untitled'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No videos available.</p>
          )
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-xl font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-slate-900')}>Discography</h2>
          {isEditingWorks && (
            <button
              type="button"
              onClick={addAlbum}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                'border-transparent bg-brand-purple text-white hover:bg-brand-purple/90'
              )}
            >
              <Plus size={14} /> Add album
            </button>
          )}
        </div>

        {normalizedAlbums.length === 0 ? (
          <div className={cn(
            'rounded-[40px] p-10 border text-center',
            theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          )}>
            <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>No works yet</p>
            <p className={cn('mt-2 text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>Add albums/works to show here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {normalizedAlbums.map((album, idx) => (
              <div
                key={`${album.title}-${idx}`}
                className={cn(
                  'rounded-[40px] border overflow-hidden',
                  theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
                )}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isEditingWorks ? (
                        <input
                          value={album.title}
                          onChange={(e) => updateAlbum(idx, 'title', e.target.value)}
                          placeholder="Album title"
                          className={cn(
                            'w-full bg-transparent border-b pb-2 text-lg font-black outline-none',
                            theme === 'dark' ? 'border-white/10 text-white focus:border-brand-pink' : 'border-slate-200 text-slate-900 focus:border-brand-pink'
                          )}
                        />
                      ) : (
                        <h3 className={cn('text-2xl font-black tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{album.title || 'Untitled'}</h3>
                      )}

                      {isEditingWorks ? (
                        <input
                          value={album.date}
                          onChange={(e) => updateAlbum(idx, 'date', e.target.value)}
                          placeholder="Release date"
                          className={cn(
                            'mt-2 w-full bg-transparent border-b pb-2 text-sm font-bold outline-none',
                            theme === 'dark' ? 'border-white/10 text-slate-200 focus:border-brand-pink' : 'border-slate-200 text-slate-700 focus:border-brand-pink'
                          )}
                        />
                      ) : (
                        <p className={cn('mt-2 text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{album.date || 'Release date n/a'}</p>
                      )}
                    </div>

                    {isEditingWorks && (
                      <button
                        type="button"
                        onClick={() => removeAlbum(idx)}
                        className={cn(
                          'p-2.5 rounded-2xl transition-colors',
                          theme === 'dark' ? 'bg-slate-800 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-500 hover:bg-red-100'
                        )}
                        aria-label="Remove album"
                        title="Remove album"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={cn(
                      'rounded-3xl border overflow-hidden',
                      theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
                    )}>
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={convertDriveLink(album.cover) || convertDriveLink(idol.image)}
                          alt={album.title || 'Album cover'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {isEditingWorks && (
                        <div className="p-4">
                          <input
                            value={album.cover}
                            onChange={(e) => updateAlbum(idx, 'cover', e.target.value)}
                            placeholder="Cover image URL"
                            className={cn(
                              'w-full bg-transparent border-b pb-2 text-xs font-bold outline-none',
                              theme === 'dark' ? 'border-white/10 text-slate-200 focus:border-brand-pink' : 'border-slate-200 text-slate-700 focus:border-brand-pink'
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <div className={cn(
                      'rounded-3xl border p-4',
                      theme === 'dark' ? 'border-white/10 bg-slate-950/30 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                    )}>
                      <p className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Youtube</p>
                      {isEditingWorks ? (
                        <input
                          value={album.youtube}
                          onChange={(e) => updateAlbum(idx, 'youtube', e.target.value)}
                          placeholder="YouTube URL"
                          className={cn(
                            'mt-2 w-full bg-transparent border-b pb-2 text-xs font-bold outline-none',
                            theme === 'dark' ? 'border-white/10 text-slate-200 focus:border-brand-pink' : 'border-slate-200 text-slate-700 focus:border-brand-pink'
                          )}
                        />
                      ) : (
                        album.youtube ? (
                          <div className="mt-4 rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative">
                              <iframe
                                  width="100%"
                                  height="100%"
                                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(album.youtube)}`}
                                  title="YouTube video player"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  className="absolute inset-0"
                              />
                          </div>
                        ) : (
                          <p className={cn('mt-2 text-sm', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>n/a</p>
                        )
                      )}

                      <p className={cn('mt-5 text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Tracks</p>
                      {isEditingWorks ? (
                        <textarea
                          value={(album.tracks || []).join('\n')}
                          onChange={(e) => updateAlbum(idx, 'tracks', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                          placeholder="One track per line"
                          rows={6}
                          className={cn(
                            'mt-2 w-full bg-transparent border rounded-2xl p-3 text-xs font-bold outline-none',
                            theme === 'dark' ? 'border-white/10 text-slate-200 focus:border-brand-pink' : 'border-slate-200 text-slate-700 focus:border-brand-pink'
                          )}
                        />
                      ) : (
                        <div className="mt-2 space-y-1">
                          {(album.tracks || []).length === 0 ? (
                            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>n/a</p>
                          ) : (
                            (album.tracks || []).slice(0, 8).map((t, i) => (
                              <div key={`${t}-${i}`} className={cn('text-sm font-medium truncate', theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}>
                                {i + 1}. {t}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-xl font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            <ImageIcon size={20} /> Gallery
          </h2>
          {isEditingWorks && (
            <button
              type="button"
              onClick={addGalleryImage}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90'
              )}
            >
              <Plus size={14} /> Add Image
            </button>
          )}
        </div>

        {isEditingWorks ? (
          <div className="space-y-3">
            {galleryDraft.map((url, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={url}
                  onChange={(e) => updateGalleryImage(idx, e.target.value)}
                  className={cn(
                    "w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-xs font-bold",
                    theme === 'dark' ? "bg-slate-900 border-white/5 focus:border-brand-pink text-white" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900 shadow-inner"
                  )}
                  placeholder="Image URL..."
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
              </div>
            ))}
            {galleryDraft.length === 0 && <p className="text-sm text-slate-500 italic">No images added.</p>}
          </div>
        ) : (
          (idol.gallery && idol.gallery.length > 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {idol.gallery.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden shadow-md hover:scale-105 transition-transform duration-300 cursor-pointer">
                  <img
                    src={convertDriveLink(img)}
                    alt={`Gallery ${idx}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onClick={() => window.open(convertDriveLink(img), '_blank')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No gallery images.</p>
          )
        )}
      </div>
    </div>
  );
}
