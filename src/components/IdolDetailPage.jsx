import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, Reorder } from 'framer-motion';
import { ArrowLeft, Building2, Calendar, Plus, Save, Trash2, Youtube, Image as ImageIcon, Instagram, Globe, Upload, Loader2, X, ChevronLeft, ChevronRight, Maximize2, PlayCircle, Search, Share2, Check, GripVertical } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { deleteImage, uploadImage, validateFile, compressImage } from '../lib/upload';
import { BackgroundShapes } from './BackgroundShapes';
import { BackToTopButton } from './BackToTopButton';

const XIcon = ({ size = 24, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({});
  const [editReason, setEditReason] = useState('');
  const [profileChanges, setProfileChanges] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);

  const [isEditingWorks, setIsEditingWorks] = useState(false);
  const [albumsDraft, setAlbumsDraft] = useState([]);
  const [videosDraft, setVideosDraft] = useState([]);
  const [galleryDraft, setGalleryDraft] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const galleryInputRef = useRef(null);
  const albumCoverInputRef = useRef(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoSearch, setVideoSearch] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

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
    setIsEditingProfile(false);
    setAlbumsDraft(idol?.albums || []);
    setVideosDraft(idol?.videos || []);
    setGalleryDraft((idol?.gallery || []).map((url, idx) => ({ id: `gal-${idx}-${Date.now()}`, url })));
  }, [idol?.id]);

  useEffect(() => {
    if (idol) {
        setProfileDraft(idol);
    }
  }, [idol]);

  const filteredVideos = useMemo(() => {
    const videos = idol?.videos || [];
    if (!videoSearch.trim()) return videos;
    return videos.filter(v => 
        (v.title || '').toLowerCase().includes(videoSearch.toLowerCase())
    );
  }, [idol?.videos, videoSearch]);

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
    setVideosDraft((prev) => [...(prev || []), { title: '', url: '', date: new Date().toISOString().split('T')[0] }]);
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

  const updateGalleryImage = (index, value) => {
    setGalleryDraft((prev) => {
      const next = [...(prev || [])];
      next[index] = { ...next[index], url: value };
      return next;
    });
  };

  const removeGalleryImage = async (index) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    const urlToRemove = galleryDraft[index]?.url;
    if (urlToRemove) {
        await deleteImage(urlToRemove);
    }
    setGalleryDraft((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const handleProfileChange = (field, value) => {
    setProfileDraft(prev => ({ ...prev, [field]: value }));
  };

  const submitEditRequest = async () => {
    if (!user) return;

    // Calculate changes
    const changes = {};
    const fieldsToCheck = ['name', 'koreanName', 'company', 'debutDate', 'birthDate', 'height', 'bloodType', 'birthPlace', 'instagram', 'twitter', 'description', 'status', 'retirementDate'];
    
    let hasChanges = false;
    fieldsToCheck.forEach(field => {
        const original = idol[field] || '';
        const current = profileDraft[field] || '';
        if (original !== current) {
            changes[field] = { old: original, new: current };
            hasChanges = true;
        }
    });

    if (!hasChanges) {
        alert("No changes detected.");
        return;
    }

    if (isAdmin) {
        try {
            await updateDoc(doc(db, 'idols', idolId), profileDraft);
            setIsEditingProfile(false);
            alert("Profile updated successfully.");
        } catch (e) {
            console.error(e);
            alert("Error updating profile.");
        }
    } else {
        setShowReasonModal(true);
        setProfileChanges(changes);
    }
  };

  const confirmSubmitEdit = async () => {
      try {
          const docRef = await addDoc(collection(db, 'editRequests'), {
              targetId: idol.id,
              targetType: 'idol',
              targetName: idol.name,
              submitterId: user.uid || user.id,
              submitterName: user.name || 'Anonymous',
              submitterEmail: user.email || '',
              submittedAt: serverTimestamp(),
              status: 'pending',
              changes: profileChanges,
              reason: editReason
          });
          setShowReasonModal(false);
          setIsEditingProfile(false);
          setProfileChanges(null);
          setEditReason('');
          alert("Edit request submitted for approval.");
      } catch (error) {
          console.error("Error submitting edit request:", error);
          alert("Failed to submit request.");
    }
  };

  const saveWorks = async () => {
    if (!isAdmin || !idolId) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'idols', idolId), {
        albums: albumsDraft,
        videos: videosDraft,
        gallery: galleryDraft.map(item => item.url),
        status: profileDraft.status || 'Active',
        retirementDate: profileDraft.retirementDate || '',
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
      try {
          const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
          const uploadPromises = compressedFiles.map(file => uploadImage(file, 'idols/gallery'));
          const urls = await Promise.all(uploadPromises);
          setGalleryDraft(prev => [...(prev || []), ...urls.map((url, i) => ({ id: `new-${Date.now()}-${i}`, url }))]);
      } catch (error) {
          console.error("Gallery upload error", error);
          alert("Failed to upload images");
      } finally {
          setIsUploading(false);
          if (galleryInputRef.current) galleryInputRef.current.value = '';
      }
  };

  const handleRemoveAlbumCover = async (index) => {
    const album = albumsDraft[index];
    if (!album || !album.cover) return;

    if (album.cover.includes('firebasestorage')) {
        if (window.confirm("Are you sure you want to remove this cover? This will also delete the image from the server.")) {
            try {
                await deleteImage(album.cover);
                updateAlbum(index, 'cover', '');
            } catch (error) {
                console.error("Error deleting album cover:", error);
                alert("Failed to delete album cover.");
            }
        }
    } else {
        // It's a local preview (blob URL), just clear it
        updateAlbum(index, 'cover', '');
    }
  };

  const handleAlbumCoverUpload = async (e, index) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          validateFile(file, 5);
      } catch (error) {
          alert(error.message);
          return;
      }

      const objectUrl = URL.createObjectURL(file);
      setAlbumsDraft(prev => {
          const next = [...prev];
          next[index] = { ...next[index], cover: objectUrl };
          return next;
      });

      setIsUploading(true);
      try {
          const compressedFile = await compressImage(file);
          const url = await uploadImage(compressedFile, 'idols/albums');
          
          setAlbumsDraft(prev => {
              const next = [...prev];
              next[index] = { ...next[index], cover: url };
              return next;
          });
      } catch (error) {
          console.error("Album cover upload error", error);
          alert("Failed to upload album cover");
      } finally {
          setIsUploading(false);
          if (albumCoverInputRef.current) albumCoverInputRef.current.value = '';
      }
  };

  const allImages = useMemo(() => {
    if (!idol) return [];
    return [idol.image, ...(idol.gallery || [])].filter(Boolean);
  }, [idol]);

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

  const getLightboxCaption = (url) => {
      if (!url || !idol) return null;
      if (url === idol.image) return { title: idol.name };
      
      const album = (idol.albums || []).find(a => a.cover === url);
      if (album) return { title: album.title, subtitle: album.date };

      return null;
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
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 md:space-y-10">
      <BackgroundShapes image={idol.image} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 md:px-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-colors',
              theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
            )}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            type="button"
            onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }}
            className={cn("p-2 md:p-2.5 rounded-2xl border transition-colors", theme === 'dark' ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-900 hover:bg-slate-50")}
            title="Copy Link"
          >
            {isCopied ? <Check size={14} /> : <Share2 size={14} />}
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isEditingWorks) {
                  setIsEditingWorks(false);
                  setAlbumsDraft(idol.albums || []);
                  setProfileDraft(idol);
                  return;
                }
                setIsEditingWorks(true);
                setAlbumsDraft(idol.albums || []);
                setProfileDraft(idol);
              }}
              className={cn(
                'px-3 py-2 md:px-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-colors',
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
                  'inline-flex items-center gap-2 px-3 py-2 md:px-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-colors',
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
            <div className="aspect-[3/4] relative overflow-hidden group cursor-zoom-in" onClick={() => setLightboxImage(idol.image)}>
              <motion.img
                style={{ y }}
                src={convertDriveLink(idol.image)}
                alt={idol.name}
                className="w-full h-[120%] object-cover -mt-[10%]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
                      <Maximize2 size={24} />
                  </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-6 md:p-10 space-y-6">
            <div>
              <p className={cn('text-xs font-black uppercase tracking-[0.25em]', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Artist</p>
              <h1 className={cn('text-2xl sm:text-4xl md:text-6xl font-black tracking-tight mt-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.name}</h1>
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
                    <XIcon size={14} /> X
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Profile</p>
              <div className={cn(
                'rounded-3xl border p-5 md:p-6',
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
                  <div>
                    <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Status</span>
                    {isEditingWorks ? (
                        <select
                            value={profileDraft.status || 'Active'}
                            onChange={(e) => handleProfileChange('status', e.target.value)}
                            className={cn(
                                "w-full bg-transparent border-b focus:outline-none py-1 text-base font-bold appearance-none cursor-pointer",
                                theme === 'dark' ? "border-white/20 text-white [&>option]:bg-slate-900" : "border-slate-300 text-slate-900 [&>option]:bg-white"
                            )}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    ) : (
                        <div className={cn("font-bold", idol.status === 'Inactive' ? "text-red-500" : "text-green-500")}>{idol.status || 'Active'}</div>
                    )}
                  </div>
                  {(isEditingWorks ? profileDraft.status === 'Inactive' : idol.status === 'Inactive') && (
                    <div>
                        <span className={cn('text-xs font-black uppercase tracking-widest text-red-500')}>Retirement Date</span>
                        {isEditingWorks ? (
                            <input
                                type="date"
                                value={profileDraft.retirementDate || ''}
                                onChange={(e) => handleProfileChange('retirementDate', e.target.value)}
                                className={cn("w-full bg-transparent border-b focus:outline-none", theme === 'dark' ? "border-white/20 text-white" : "border-slate-300 text-slate-900")}
                            />
                        ) : (
                            <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.retirementDate || '-'}</div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
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
              <div key={idx} className={cn("p-4 rounded-2xl border space-y-3", theme === 'dark' ? "bg-slate-800/50 border-white/5" : "bg-slate-50 border-slate-100")}>
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-brand-pink uppercase tracking-wider">Video #{idx + 1}</h4>
                      <button type="button" onClick={() => removeVideo(idx)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                          value={video.title || ''}
                          onChange={e => updateVideo(idx, 'title', e.target.value)}
                          className={cn("w-full p-2 rounded-lg border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                          placeholder="Title (e.g. MV)"
                      />
                      <div className="flex gap-2">
                          <input type="date" value={video.date || ''} onChange={e => updateVideo(idx, 'date', e.target.value)} className={cn("flex-1 p-2 rounded-lg border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                          <button type="button" onClick={() => updateVideo(idx, 'date', new Date().toISOString().split('T')[0])} className={cn("p-2 rounded-lg border font-bold text-[10px] uppercase", theme === 'dark' ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50")}>
                              Today
                          </button>
                      </div>
                  </div>
                  <input
                      value={video.url || ''}
                      onChange={e => updateVideo(idx, 'url', e.target.value)}
                      className={cn("w-full p-2 rounded-lg border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                      placeholder="YouTube URL..."
                  />
              </div>
            ))}
            {videosDraft.length === 0 && <p className="text-sm text-slate-500 italic">No videos added.</p>}
          </div>
        ) : (
          (idol.videos && idol.videos.length > 0) ? (
            <>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search videos..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className={cn("w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none transition-all text-sm font-medium", theme === 'dark' ? "bg-slate-900/50 border-white/10 focus:border-brand-pink text-white placeholder:text-slate-600" : "bg-white border-slate-200 focus:border-brand-pink text-slate-900")}
                />
            </div>
            {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredVideos.map((video, idx) => {
                const videoId = getYouTubeVideoId(video.url);
                const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                return (
                <div key={idx} className="space-y-2">
                  <div 
                    className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative z-0 group cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                  >
                    {thumbnailUrl && (
                        <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl group-hover:scale-110 transition-transform duration-300">
                            <PlayCircle size={32} fill="currentColor" />
                        </div>
                    </div>
                  </div>
                  <div>
                    <p className={cn("text-sm font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>{video.title || 'Untitled'}</p>
                    {video.date && (
                        <p className={cn("text-xs font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>{video.date}</p>
                    )}
                  </div>
                </div>
              )})}
            </div>
            ) : (
                <p className="text-sm text-slate-500 italic">No videos found matching "{videoSearch}".</p>
            )}
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">No videos available.</p>
          )
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-lg md:text-xl font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-slate-900')}>Discography</h2>
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
          <h2 className={cn('text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            <ImageIcon size={20} /> Gallery
          </h2>
          {isEditingWorks && (
            <>
                <input type="file" multiple ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload} accept="image/*" />
                <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                    'border-transparent bg-brand-pink text-white hover:bg-brand-pink/90 disabled:opacity-50'
                )}
                >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
                </button>
            </>
          )}
        </div>

        {isEditingWorks ? (
          <div className="space-y-3">
            <Reorder.Group axis="y" values={galleryDraft} onReorder={setGalleryDraft} className="space-y-3">
            {galleryDraft.map((item, idx) => (
              <Reorder.Item key={item.id} value={item} className="flex gap-2 items-center bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1">
                    <GripVertical size={16} />
                </div>
                <input
                  value={item.url}
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
              </Reorder.Item>
            ))}
            </Reorder.Group>
            {galleryDraft.length === 0 && <p className="text-sm text-slate-500 italic">No images added.</p>}
          </div>
        ) : (
          (idol.gallery && idol.gallery.length > 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {idol.gallery.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden shadow-md hover:scale-105 transition-transform duration-300 cursor-pointer group relative" onClick={() => setLightboxImage(img)}>
                  <img
                    src={convertDriveLink(img)}
                    alt={`Gallery ${idx}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white drop-shadow-lg" size={24} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No gallery images.</p>
          )
        )}
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
                        className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
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

                      {(() => {
                          const caption = getLightboxCaption(lightboxImage);
                          if (!caption) return null;
                          return (
                              <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none z-20 px-4">
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-black/40 backdrop-blur-md inline-block px-6 py-3 rounded-2xl border border-white/10"
                                  >
                                      <p className="text-white font-bold text-lg drop-shadow-md">{caption.title}</p>
                                      {caption.subtitle && <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">{caption.subtitle}</p>}
                                  </motion.div>
                              </div>
                          );
                      })()}
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
    </div>
  );
}
