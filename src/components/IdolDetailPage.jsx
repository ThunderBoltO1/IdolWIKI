import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Plus, Save, Trash2 } from 'lucide-react';
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

  const [idol, setIdol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditingWorks, setIsEditingWorks] = useState(false);
  const [albumsDraft, setAlbumsDraft] = useState([]);
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

  const saveWorks = async () => {
    if (!isAdmin || !idolId) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'idols', idolId), {
        albums: albumsDraft,
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
              {isEditingWorks ? 'Cancel' : 'Edit works'}
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
                        <a
                          href={album.youtube || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'mt-2 inline-block text-sm font-bold',
                            album.youtube ? 'text-brand-pink hover:underline' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-500')
                          )}
                          onClick={(e) => {
                            if (!album.youtube) e.preventDefault();
                          }}
                        >
                          {album.youtube ? 'Open video' : 'n/a'}
                        </a>
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
    </div>
  );
}
