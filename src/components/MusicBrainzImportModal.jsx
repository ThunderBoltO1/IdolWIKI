import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Disc, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useiTunes, fetchTracklist } from '../hooks/useiTunes';
import { cn } from '../lib/utils';

export function MusicBrainzImportModal({ isOpen, onClose, defaultArtist = '', onAdd }) {
  const { theme } = useTheme();
  const { search, results, loading, error, clear } = useiTunes();
  const [query, setQuery] = useState(defaultArtist || '');
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery(defaultArtist || '');
      setSelected(new Set());
      clear();
    }
  }, [isOpen, defaultArtist, clear]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const items = results.filter((r) => selected.has(r.id));
    if (items.length === 0) return;
    setAdding(true);
    try {
      const albums = await Promise.all(
        items.map(async (r) => {
          const tracks = await fetchTracklist(r.id);
          return {
            title: r.title,
            date: r.date || '',
            cover: r.cover || '',
            youtube: '',
            tracks: tracks || [],
          };
        })
      );
      onAdd?.(albums);
      onClose?.();
    } catch (e) {
      console.error('iTunes import error', e);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm touch-none"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
          className={cn(
            'relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden',
            theme === 'dark' ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn('flex items-center justify-between p-4 border-b', theme === 'dark' ? 'border-white/10' : 'border-slate-200')}>
            <h3 className={cn('text-lg font-black uppercase tracking-widest flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
              <Disc size={20} className="text-brand-pink" /> Import from iTunes
            </h3>
            <button onClick={onClose} className={cn('p-2 rounded-xl transition-colors', theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(query)}
                placeholder="Search artist/group name (e.g. BTS, NewJeans)"
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
                  'bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {error && (
              <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>{error}</p>
            )}

            {results.length > 0 && (
              <>
                <p className={cn('text-xs font-bold uppercase tracking-widest', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                  Select albums to import ({selected.size} selected)
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleSelect(r.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        selected.has(r.id)
                          ? 'border-brand-purple bg-brand-purple/10'
                          : theme === 'dark'
                            ? 'border-white/10 bg-slate-800/30 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      {r.cover && (
                        <img src={r.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      )}
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                          selected.has(r.id) ? 'border-brand-purple bg-brand-purple' : theme === 'dark' ? 'border-slate-500' : 'border-slate-300'
                        )}
                      >
                        {selected.has(r.id) && <Check size={12} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-bold truncate', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                          {r.title}
                        </p>
                        <p className={cn('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                          {r.type} {r.date ? `· ${r.date}` : ''} {r.trackCount ? `· ${r.trackCount} tracks` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!loading && results.length === 0 && !error && query && (
              <p className={cn('text-sm text-center py-8', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                Enter artist or group name and click Search
              </p>
            )}
          </div>

          {results.length > 0 && (
            <div className={cn('p-4 border-t flex justify-end gap-2', theme === 'dark' ? 'border-white/10' : 'border-slate-200')}>
              <button
                onClick={onClose}
                className={cn(
                  'px-4 py-2.5 rounded-xl font-bold text-sm transition-colors',
                  theme === 'dark' ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={selected.size === 0 || adding}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all',
                  'bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : null}
                Import {selected.size} album{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
