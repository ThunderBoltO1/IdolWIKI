import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ArrowLeft, Building2, Calendar, Plus, Save, Trash2, Youtube, Image as ImageIcon, Instagram, Globe, Upload, Loader2, X, ChevronLeft, ChevronRight, Maximize2, PlayCircle, Search, Share2, Check, GripVertical, History, Users } from 'lucide-react';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, formatBiographyText, getYouTubeEmbedSrc, groupAlbumsByType, restorePageScroll } from '../lib/utils';
import { convertDriveLink } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from './Toast';
import { deleteImage, uploadImage, validateFile, compressImage } from '../lib/upload';
import { BackgroundShapes } from './BackgroundShapes';
import { Helmet } from 'react-helmet-async';
import { BackToTopButton } from './BackToTopButton';
import { MusicBrainzImportModal } from './MusicBrainzImportModal';
import { DateSelect } from './DateSelect';
import { findCompanyByName } from '../lib/companyUtils';

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
  const t = useTranslation();
  const { confirm } = useConfirm();
  const toast = useToast();

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
  const [groupCompany, setGroupCompany] = useState(null); // company from group when idol.company empty
  const [companyDisplayName, setCompanyDisplayName] = useState(null);
  const [soloCompanyDisplayName, setSoloCompanyDisplayName] = useState(null);
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
  const [showImportAlbumsModal, setShowImportAlbumsModal] = useState(false);
  const [showBiographyModal, setShowBiographyModal] = useState(false);

  // ล็อก scroll หน้าหลักเมื่อเปิด popup/modal ใดๆ (ให้ scroll ได้แค่ใน overlay)
  const hasOverlayOpen = showBiographyModal || !!lightboxImage || !!selectedVideo || showReasonModal;
  useEffect(() => {
    if (hasOverlayOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [hasOverlayOpen]);

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

  useEffect(() => {
    if (!idol?.groupId || idol.company) {
      setGroupCompany(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'groups', idol.groupId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      setGroupCompany(snap.data().company || null);
    }).catch(() => setGroupCompany(null));
    return () => { cancelled = true; };
  }, [idol?.groupId, idol?.company]);

  useEffect(() => {
    const groupKey = idol?.company || groupCompany;
    const soloKey = idol?.soloCompany;
    if (!groupKey && !soloKey) {
      setCompanyDisplayName(null);
      setSoloCompanyDisplayName(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      groupKey ? findCompanyByName(groupKey) : null,
      soloKey ? findCompanyByName(soloKey) : null
    ]).then(([groupDoc, soloDoc]) => {
      if (cancelled) return;
      setCompanyDisplayName(groupDoc ? groupDoc.data().name : (groupKey || null));
      setSoloCompanyDisplayName(soloDoc ? soloDoc.data().name : (soloKey || null));
    });
    return () => { cancelled = true; };
  }, [idol?.company, idol?.soloCompany, groupCompany]);

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
    const album = (albumsDraft || [])[index];
    const title = album?.title || `Album #${index + 1}`;
    confirm({
      title: 'Remove Album',
      message: `Remove "${title}"?`,
      confirmText: 'Remove',
      onConfirm: () => setAlbumsDraft((prev) => (prev || []).filter((_, i) => i !== index))
    });
  };

  const handleImportAlbums = (albums) => {
    if (!Array.isArray(albums) || albums.length === 0) return;
    const normalized = albums.map((a) => ({
      title: a.title || '',
      date: a.date || '',
      cover: a.cover || '',
      youtube: a.youtube || '',
      tracks: Array.isArray(a.tracks) ? a.tracks : []
    }));
    setAlbumsDraft((prev) => [...(prev || []), ...normalized]);
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
    const video = (videosDraft || [])[index];
    const title = video?.title || `Video #${index + 1}`;
    confirm({
      title: 'Remove Video',
      message: `Remove "${title}"?`,
      confirmText: 'Remove',
      onConfirm: () => setVideosDraft((prev) => (prev || []).filter((_, i) => i !== index))
    });
  };

  const updateGalleryImage = (index, value) => {
    setGalleryDraft((prev) => {
      const next = [...(prev || [])];
      next[index] = { ...next[index], url: value };
      return next;
    });
  };

  const removeGalleryImage = (index) => {
    confirm({
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image?',
      confirmText: 'Delete',
      onConfirm: async () => {
        const urlToRemove = galleryDraft[index]?.url;
        if (urlToRemove) {
          await deleteImage(urlToRemove);
        }
        setGalleryDraft((prev) => (prev || []).filter((_, i) => i !== index));
      }
    });
  };

  const handleProfileChange = (field, value) => {
    setProfileDraft(prev => ({ ...prev, [field]: value }));
  };

  const submitEditRequest = async () => {
    if (!user) return;

    // Calculate changes
    const changes = {};
    const fieldsToCheck = ['name', 'koreanName', 'company', 'debutDate', 'soloDebutDate', 'birthDate', 'height', 'bloodType', 'birthPlace', 'instagram', 'twitter', 'description', 'status', 'retirementDate'];

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
        description: profileDraft.description ?? '',
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
      } catch (e) {
        toast.error(e.message || `Invalid file: ${file.name}`);
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
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      restorePageScroll();
    }
  };

  const handleRemoveAlbumCover = async (index) => {
    const album = albumsDraft[index];
    if (!album || !album.cover) return;

    if (album.cover.includes('firebasestorage')) {
      confirm({
        title: 'Remove Cover',
        message: 'Are you sure you want to remove this cover? This will also delete the image from the server.',
        confirmText: 'Remove',
        onConfirm: async () => {
          try {
            await deleteImage(album.cover);
            updateAlbum(index, 'cover', '');
          } catch (error) {
            console.error("Error deleting album cover:", error);
            toast.error("Failed to delete album cover.");
          }
        }
      });
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
      toast.error(error.message);
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
      restorePageScroll();
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
      if (e.key === 'Escape') { restorePageScroll(); setLightboxImage(null); }
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
          onClick={() => navigate(-1)}
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

  const metaTitle = `${idol.name}${idol.group ? ` (${idol.group})` : ''} | K-Pop Wiki`;
  const metaDesc = idol.description ? (idol.description.slice(0, 160) + (idol.description.length > 160 ? '…' : '')) : `${idol.name}: K-Pop idol info`;
  const ogImage = idol.image ? convertDriveLink(idol.image) : '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 md:space-y-10">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogImage && <meta property="og:title" content={metaTitle} />}
        {ogImage && <meta property="og:description" content={metaDesc} />}
      </Helmet>
      <BackgroundShapes image={idol.image} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cn(
              'p-3 rounded-2xl transition-all active:scale-95 shadow-sm border',
              theme === 'dark'
                ? 'bg-slate-800 border-white/5 hover:bg-slate-700 text-white'
                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-900'
            )}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className={cn(
              'p-3 rounded-2xl transition-all active:scale-95 shadow-sm border',
              theme === 'dark'
                ? 'bg-slate-800 border-white/5 hover:bg-slate-700 text-white'
                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-900'
            )}
            title="Copy Link"
          >
            {isCopied ? <Check size={16} /> : <Share2 size={16} />}
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
        'rounded-[32px] border overflow-hidden shadow-lg',
        theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'
      )}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:items-stretch">
          <div className="md:col-span-5 p-4 md:p-6 flex md:items-stretch justify-center md:justify-end min-h-[280px] md:min-h-0">
            <div className="w-full max-w-md h-full min-h-[280px] md:min-h-[360px] relative overflow-hidden group cursor-zoom-in rounded-2xl shadow-xl ring-1 ring-black/5" onClick={() => setLightboxImage(idol.image)}>
              <img
                src={convertDriveLink(idol.image)}
                alt={idol.name}
                className="absolute inset-0 w-full h-full"
                style={(() => {
                  const pos = idol.imagePosition || { x: 50, y: 50 };
                  const x = pos?.x ?? 50;
                  const y = pos?.y ?? 50;
                  const scale = idol.imageScale ?? 1;
                  const fit = idol.imageFit ?? 'cover';
                  const s = { objectFit: fit };
                  s.objectPosition = `${x}% ${y}%`;
                  if (scale !== 1) { s.transform = `scale(${scale})`; s.transformOrigin = `${x}% ${y}%`; }
                  return s;
                })()}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
                  <Maximize2 size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-6 md:p-8 lg:p-10 space-y-8">
            <div className="space-y-4">
              <p className={cn('text-xs font-black uppercase tracking-[0.25em]', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Artist</p>
              <h1 className={cn('text-3xl sm:text-4xl md:text-5xl font-black tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(idol.company || groupCompany) ? (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border group transition-colors cursor-pointer hover:bg-brand-pink hover:text-white hover:border-brand-pink',
                    theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                  )} onClick={() => navigate(`/company/${encodeURIComponent(idol.company || groupCompany)}`)}>
                    <Building2 size={14} className="group-hover:text-white transition-colors text-brand-pink" />
                    <span>{(companyDisplayName ?? idol.company ?? groupCompany)}{idol.soloCompany ? ' (Group)' : ''}</span>
                  </div>
                ) : null}

                {idol.soloCompany && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors cursor-pointer',
                      theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40 hover:bg-brand-blue/30 hover:text-white hover:border-brand-blue' : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-brand-blue/20 hover:text-slate-900 hover:border-brand-blue'
                    )}
                    onClick={() => navigate(`/company/${encodeURIComponent(idol.soloCompany)}`)}
                  >
                    <Building2 size={14} className="text-brand-blue" />
                    <span>{soloCompanyDisplayName ?? idol.soloCompany}</span>
                  </div>
                )}

                {idol.group && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                      theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50',
                      idol.groupId && 'cursor-pointer hover:bg-brand-purple hover:text-white hover:border-brand-purple'
                    )}
                    onClick={() => idol.groupId && navigate(`/group/${idol.groupId}`)}
                  >
                    <Users size={14} className="text-brand-purple" />
                    <span>{idol.group}</span>
                  </div>
                )}

                {(idol.subUnits || []).map((su, idx) => {
                  const item = typeof su === 'string' ? { group: su, groupId: '' } : su;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                        theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50',
                        item.groupId && 'cursor-pointer hover:bg-amber-500/30 hover:text-amber-100 hover:border-amber-500/50'
                      )}
                      onClick={() => item.groupId && navigate(`/group/${item.groupId}`)}
                    >
                      <Users size={14} className="text-amber-500" />
                      <span>{item.group || item} (Sub-unit)</span>
                    </div>
                  );
                })}

                {idol.debutDate && (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border',
                    theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                  )}>
                    <Calendar size={14} className="text-brand-purple" />
                    <span>{idol.soloDebutDate ? 'Debut (Group) ' : 'Debut '}{idol.debutDate}</span>
                  </div>
                )}
                {idol.soloDebutDate && (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border',
                    theme === 'dark' ? 'border-white/10 text-slate-200 bg-slate-950/40' : 'border-slate-200 text-slate-700 bg-slate-50'
                  )}>
                    <Calendar size={14} className="text-brand-purple" />
                    <span>Debut {idol.soloDebutDate}</span>
                  </div>
                )}

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
                  {idol.fullEnglishName && (
                    <div>
                      <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Full name</span>
                      <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.fullEnglishName}</div>
                    </div>
                  )}
                  {idol.koreanName && (
                    <div>
                      <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Korean name</span>
                      <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.koreanName}</div>
                    </div>
                  )}
                  {idol.nationality && (
                    <div>
                      <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Nationality</span>
                      <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.nationality}</div>
                    </div>
                  )}
                  {idol.birthDate && (
                    <div>
                      <span className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Birth date</span>
                      <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.birthDate}</div>
                    </div>
                  )}
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
                      <div className={cn("font-bold", ['inactive', 'former'].includes(idol.status?.toLowerCase()) ? "text-red-500" : "text-green-500")}>{idol.status || 'Active'}</div>
                    )}
                  </div>
                  {(isEditingWorks ? ['inactive', 'former'].includes(profileDraft.status?.toLowerCase()) : ['inactive', 'former'].includes(idol.status?.toLowerCase())) && (
                    (isEditingWorks || idol.retirementDate) ? (
                      isEditingWorks ? (
                        <DateSelect
                          label="Retirement Date"
                          value={profileDraft.retirementDate || ''}
                          onChange={val => handleProfileChange('retirementDate', val)}
                          theme={theme}
                        />
                      ) : (
                        <div>
                          <span className={cn('text-xs font-black uppercase tracking-widest text-red-500')}>Retirement Date</span>
                          <div className={cn(theme === 'dark' ? 'text-white' : 'text-slate-900')}>{idol.retirementDate}</div>
                        </div>
                      )
                    ) : null
                  )}
                  <div className="sm:col-span-2 border-t pt-4 mt-2 border-slate-200 dark:border-slate-800">
                    <span className={cn('text-xs font-black uppercase tracking-widest mb-2 block', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>{t('idolDetail.biography')}</span>
                    {isEditingWorks ? (
                      <div>
                        <textarea
                          value={profileDraft.description ?? profileDraft.biography ?? ''}
                          onChange={(e) => handleProfileChange('description', e.target.value)}
                          placeholder="History / Story of the artist "
                          rows={5}
                          className={cn("w-full p-4 rounded-2xl border resize-y min-h-[120px] outline-none text-sm", theme === 'dark' ? "border-white/10 bg-slate-900/50 text-white placeholder:text-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400")}
                        />
                        <p className={cn("mt-2 text-xs", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                          ใช้ <b>**ตัวหนา**</b> <i>*ตัวเอียง*</i> <u>__ขีดเส้นใต้__</u> เพื่อเน้นข้อความ
                        </p>
                      </div>
                    ) : (() => {
                      const fullBio = idol.description || idol.biography || t('idolDetail.noBiography');
                      const maxPreviewLen = 280;
                      const isLong = fullBio !== t('idolDetail.noBiography') && fullBio.length > maxPreviewLen;
                      const previewEnd = isLong ? (fullBio.lastIndexOf(' ', maxPreviewLen) >= 200 ? fullBio.lastIndexOf(' ', maxPreviewLen) : maxPreviewLen) : fullBio.length;
                      const previewText = isLong ? fullBio.slice(0, previewEnd).trim() + '…' : fullBio;
                      return (
                        <div>
                          <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                            {previewText.split('\n').map((p, i) => (p ? <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: formatBiographyText(p) }} /> : <br key={i} />))}
                          </div>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => setShowBiographyModal(true)}
                              className={cn("mt-3 text-sm font-semibold flex items-center gap-1 hover:underline", theme === 'dark' ? "text-brand-pink" : "text-brand-pink")}
                            >
                              {t('idolDetail.readMore')}
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {idol.formerCompanies?.length > 0 && (
                    <div className="sm:col-span-2 border-t pt-4 mt-2 border-dashed border-slate-200 dark:border-slate-800">
                      <span className={cn('text-xs font-black uppercase tracking-widest mb-2 block', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Former Companies (Group)</span>
                      <div className="space-y-2">
                        {[...idol.formerCompanies].sort((a, b) => {
                          const getEndYear = (item) => {
                            const val = typeof item === 'string' ? '' : (item.duration || '');
                            const lower = val.toLowerCase();
                            if (lower.includes('now') || lower.includes('present') || lower.includes('current')) return 9999;
                            const match = val.match(/(\d{4})/g);
                            return match ? parseInt(match[match.length - 1]) : 0;
                          };
                          return getEndYear(b) - getEndYear(a);
                        }).map((company, index) => (
                          <div key={index}
                            onClick={() => navigate(`/company/${encodeURIComponent(typeof company === 'string' ? company : company.company)}`)}
                            className={cn(
                              "px-4 py-3 rounded-2xl text-sm font-bold border flex items-center justify-between gap-3 group hover:border-brand-pink/50 transition-colors cursor-pointer",
                              theme === 'dark' ? "bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                            )}>
                            <div className="flex items-center gap-2">
                              <History size={14} className="opacity-40 group-hover:text-brand-pink group-hover:opacity-100 transition-all" />
                              <span className="group-hover:text-brand-pink transition-colors">{typeof company === 'string' ? company : company.company}</span>
                            </div>
                            {typeof company !== 'string' && company.duration && (
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                                theme === 'dark' ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                              )}>
                                {company.duration}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.soloFormerCompanies?.length > 0 && (
                    <div className="sm:col-span-2 border-t pt-4 mt-2 border-dashed border-slate-200 dark:border-slate-800">
                      <span className={cn('text-xs font-black uppercase tracking-widest mb-2 block', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>Former Companies</span>
                      <div className="space-y-2">
                        {[...idol.soloFormerCompanies].sort((a, b) => {
                          const getEndYear = (item) => {
                            const val = typeof item === 'string' ? '' : (item.duration || '');
                            const lower = val.toLowerCase();
                            if (lower.includes('now') || lower.includes('present') || lower.includes('current')) return 9999;
                            const match = val.match(/(\d{4})/g);
                            return match ? parseInt(match[match.length - 1]) : 0;
                          };
                          return getEndYear(b) - getEndYear(a);
                        }).map((company, index) => (
                          <div key={index}
                            onClick={() => navigate(`/company/${encodeURIComponent(typeof company === 'string' ? company : company.company)}`)}
                            className={cn(
                              "px-4 py-3 rounded-2xl text-sm font-bold border flex items-center justify-between gap-3 group hover:border-brand-pink/50 transition-colors cursor-pointer",
                              theme === 'dark' ? "bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                            )}>
                            <div className="flex items-center gap-2">
                              <History size={14} className="opacity-40 group-hover:text-brand-pink group-hover:opacity-100 transition-all" />
                              <span className="group-hover:text-brand-pink transition-colors">{typeof company === 'string' ? company : company.company}</span>
                            </div>
                            {typeof company !== 'string' && company.duration && (
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                                theme === 'dark' ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                              )}>
                                {company.duration}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
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
            <Youtube size={20} /> {t('idolDetail.featuredVideos')}
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
                  <DateSelect label="Date" value={video.date || ''} onChange={val => updateVideo(idx, 'date', val)} theme={theme} />
                </div>
                <div>
                  <input
                    value={video.url || ''}
                    onChange={e => updateVideo(idx, 'url', e.target.value)}
                    className={cn("w-full p-2 rounded-lg border bg-transparent outline-none text-xs font-bold", theme === 'dark' ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                    placeholder="YouTube URL..."
                  />
                </div>
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
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No videos found matching "{videoSearch}".</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">{t('idolDetail.noVideosAvailable')}</p>
          )
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className={cn('text-lg md:text-xl font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t('idolDetail.discography')}</h2>
          {isEditingWorks && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImportAlbumsModal(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors',
                  theme === 'dark' ? 'border-white/20 text-slate-200 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                <Search size={14} /> Import from iTunes
              </button>
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
            </div>
          )}
        </div>

        {normalizedAlbums.length === 0 ? (
          <div className={cn(
            'rounded-[40px] p-10 border text-center',
            theme === 'dark' ? 'bg-slate-900/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          )}>
            <p className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>No works yet</p>
            <p className={cn('mt-2 text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>{t('idolDetail.addAlbumsHint')}</p>
          </div>
        ) : isEditingWorks ? (
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
        ) : (
          (() => {
            const { albums, mini, singles, other } = groupAlbumsByType(normalizedAlbums);
            const AlbumViewCard = ({ album }) => (
              <div className={cn('rounded-[40px] border overflow-hidden', theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200')}>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className={cn('text-2xl font-black tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{album.title || 'Untitled'}</h3>
                    <p className={cn('mt-2 text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{album.date || 'Release date n/a'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={cn('rounded-3xl border overflow-hidden', theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50')}>
                      <div className="aspect-square overflow-hidden">
                        <img src={convertDriveLink(album.cover) || convertDriveLink(idol.image)} alt={album.title || 'Album cover'} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                    <div className={cn('rounded-3xl border p-4', theme === 'dark' ? 'border-white/10 bg-slate-950/30 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                      <p className={cn('text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Youtube</p>
                      {album.youtube ? (
                        <div className="mt-4 rounded-2xl overflow-hidden shadow-lg aspect-video bg-black relative">
                          <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYouTubeVideoId(album.youtube)}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="absolute inset-0" />
                        </div>
                      ) : (
                        <p className={cn('mt-2 text-sm', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>n/a</p>
                      )}
                      <p className={cn('mt-5 text-xs font-black uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Tracks</p>
                      <div className="mt-2 space-y-1">
                        {(album.tracks || []).length === 0 ? (
                          <p className={cn('text-sm', theme === 'dark' ? 'text-slate-500' : 'text-slate-500')}>n/a</p>
                        ) : (
                          (album.tracks || []).slice(0, 8).map((t, i) => (
                            <div key={i} className={cn('text-sm font-medium truncate', theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}>{i + 1}. {t}</div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            return (
              <div className="space-y-10">
                {albums.length > 0 && (
                  <div><h4 className={cn('text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}><div className="w-6 h-0.5 bg-brand-purple rounded-full" /> Albums</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{albums.map((a, i) => <AlbumViewCard key={`${a.title}-${a.date}-${i}`} album={a} />)}</div></div>
                )}
                {mini.length > 0 && (
                  <div><h4 className={cn('text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}><div className="w-6 h-0.5 bg-brand-purple/70 rounded-full" /> Mini Albums & EPs</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{mini.map((a, i) => <AlbumViewCard key={`${a.title}-${a.date}-${i}`} album={a} />)}</div></div>
                )}
                {singles.length > 0 && (
                  <div><h4 className={cn('text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}><div className="w-6 h-0.5 bg-brand-pink/70 rounded-full" /> Singles</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{singles.map((a, i) => <AlbumViewCard key={`${a.title}-${a.date}-${i}`} album={a} />)}</div></div>
                )}
                {other.length > 0 && (
                  <div><h4 className={cn('text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}><div className="w-6 h-0.5 bg-slate-400 rounded-full" /> Other</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{other.map((a, i) => <AlbumViewCard key={`${a.title}-${a.date}-${i}`} album={a} />)}</div></div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn('text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            <ImageIcon size={20} /> {t('idolDetail.gallery')}
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
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-pink p-1 shrink-0">
                    <GripVertical size={16} />
                  </div>
                  <div className={cn("flex-1 min-w-0 flex items-center gap-3 rounded-2xl border-2 overflow-hidden", theme === 'dark' ? "bg-slate-900 border-white/5" : "bg-slate-50 border-slate-100")}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                      {item.url ? (
                        <img src={convertDriveLink(item.url)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }} />
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-slate-500 truncate">Gallery {idx + 1}</span>
                  </div>
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
            <p className="text-sm text-slate-500 italic">{t('idolDetail.noGalleryImages')}</p>
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
              className="fixed inset-0 z-150 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
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
              onClick={() => { restorePageScroll(); setSelectedVideo(null); }}
              className="fixed inset-0 z-100 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <button
                onClick={() => { restorePageScroll(); setSelectedVideo(null); }}
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
                  src={(() => { const s = getYouTubeEmbedSrc(selectedVideo.url); return s ? (s.includes('?') ? `${s}&autoplay=1` : `${s}?autoplay=1`) : ''; })()}
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
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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

      {/* Biography full-screen popup */}
      <AnimatePresence>
        {showBiographyModal && idol && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBiographyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden",
                theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className={cn("flex items-center justify-between gap-3 p-4 border-b shrink-0", theme === 'dark' ? "border-white/10" : "border-slate-100")}>
                <h3 className={cn("text-lg font-bold truncate", theme === 'dark' ? "text-white" : "text-slate-900")}>
                  {t('idolDetail.biography')} — {idol.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBiographyModal(false)}
                  className={cn("p-2 rounded-xl transition-colors", theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-6 custom-scrollbar min-h-0">
                <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
                  {(idol.description || idol.biography || t('idolDetail.noBiography')).split('\n').map((p, i) => (p ? <p key={i} className="mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: formatBiographyText(p) }} /> : <br key={i} />))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MusicBrainzImportModal
        isOpen={showImportAlbumsModal}
        onClose={() => setShowImportAlbumsModal(false)}
        defaultArtist={idol?.name || ''}
        onAdd={handleImportAlbums}
      />

      <BackToTopButton />
    </div>
  );
}
