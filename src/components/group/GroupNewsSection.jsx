import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { cn, getRelativeTime } from '../../lib/utils';

export function GroupNewsSection({
    filteredNews,
    loadingNews,
    newsSourceFilter,
    setNewsSourceFilter,
    fetchNews,
    theme
}) {
    return (
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
                                "flex flex-col rounded-3xl border transition-all hover:scale-[1.02] group overflow-hidden h-full",
                                theme === 'dark' ? "bg-slate-900/40 border-white/5 hover:border-brand-pink/30" : "bg-white border-slate-100 shadow-lg hover:shadow-xl"
                            )}
                        >
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
    );
}
