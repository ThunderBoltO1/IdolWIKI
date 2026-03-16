import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Youtube, List } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useYouTubeSearch } from '../hooks/useYouTubeSearch';
import { cn, restorePageScroll } from '../lib/utils';

export function YouTubeSearchModal({ isOpen, onClose, defaultQuery = '', onSelect }) {
  const { theme } = useTheme();
  const { search, results, loading, error, clear } = useYouTubeSearch();
  const [query, setQuery] = useState(defaultQuery || '');

  useEffect(() => {
    if (isOpen) {
      setQuery(defaultQuery || '');
      clear();
    }
  }, [isOpen, defaultQuery, clear]);

  const restoreScroll = restorePageScroll;
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      restoreScroll();
    }
    return restoreScroll;
  }, [isOpen]);

  const handleSelect = (item) => {
    restoreScroll();
    onSelect?.(item?.url, item);
    onClose?.();
  };

  const handleClose = () => {
    restoreScroll();
    onClose?.();
  };

  if (!isOpen) return null;

  const allItems = [
    ...results.playlists.map((p) => ({ ...p, icon: List })),
    ...results.videos.map((v) => ({ ...v, icon: Youtube })),
  ];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            'relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden',
            theme === 'dark' ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn('flex items-center justify-between p-4 border-b', theme === 'dark' ? 'border-white/10' : 'border-slate-200')}>
            <h3 className={cn('text-lg font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
              <Youtube size={20} className="text-red-500" /> Search YouTube
            </h3>
            <button onClick={handleClose} className={cn('p-2 rounded-xl transition-colors', theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(query)}
                placeholder="e.g. BLACKPINK KILL THIS LOVE playlist"
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl border outline-none font-medium',
                  theme === 'dark' ? 'bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                )}
              />
              <button
                onClick={() => search(query)}
                disabled={loading || !query.trim()}
                className={cn(
                  'px-4 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all',
                  'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {error && <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>{error}</p>}

            {allItems.length > 0 && (
              <div className="space-y-2">
                <p className={cn('text-xs font-bold uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Select video or Playlist</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        theme === 'dark' ? 'border-white/10 bg-slate-800/30 hover:bg-slate-800/60' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                        {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-bold text-sm line-clamp-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{item.title}</p>
                        <span className={cn('text-xs flex items-center gap-1 mt-0.5', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                          {item.type === 'playlist' ? <List size={12} /> : <Youtube size={12} />}
                          {item.type === 'playlist' ? 'Playlist' : 'Video'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && allItems.length === 0 && !error && query && (
              <p className={cn('text-sm text-center py-8', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>Enter search term and click Search</p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
