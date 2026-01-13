import React from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function FilterBar({
    searchTerm,
    onSearchChange,
    filters,
    onFilterChange,
    sortOption,
    onSortChange,
    uniqueGroups = [],
    uniqueCompanies = []
}) {
    const { theme } = useTheme();

    return (
        <div className={cn(
            "flex flex-col md:flex-row gap-4 mb-12 p-6 rounded-[32px] border transition-all duration-500",
            theme === 'dark'
                ? "bg-slate-900/40 border-white/5 backdrop-blur-2xl"
                : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
        )}>
            {/* Search */}
            <div className="relative flex-1">
                <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", theme === 'dark' ? "text-slate-500" : "text-slate-400")} />
                <input
                    type="text"
                    placeholder="Search idols..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={cn(
                        "w-full pl-12 pr-6 py-3 rounded-2xl transition-all focus:outline-none border-2 font-bold text-sm",
                        theme === 'dark'
                            ? "bg-slate-800/50 border-transparent focus:border-brand-purple/50 text-white placeholder-slate-500"
                            : "bg-slate-50 border-transparent focus:border-brand-purple/50 text-slate-900 placeholder-slate-400"
                    )}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={filters.group}
                    onChange={(e) => onFilterChange('group', e.target.value)}
                    className={cn(
                        "px-4 py-3 rounded-2xl border-2 focus:outline-none font-bold text-xs uppercase tracking-widest",
                        theme === 'dark'
                            ? "bg-slate-800/50 border-transparent text-white"
                            : "bg-slate-50 border-transparent text-slate-700"
                    )}
                >
                    <option value="">All Groups</option>
                    {(uniqueGroups || []).map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select
                    value={filters.company}
                    onChange={(e) => onFilterChange('company', e.target.value)}
                    className={cn(
                        "px-4 py-3 rounded-2xl border-2 focus:outline-none font-bold text-xs uppercase tracking-widest",
                        theme === 'dark'
                            ? "bg-slate-800/50 border-transparent text-white"
                            : "bg-slate-50 border-transparent text-slate-700"
                    )}
                >
                    <option value="">All Companies</option>
                    {(uniqueCompanies || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="relative min-w-[160px]">
                    <select
                        value={sortOption}
                        onChange={(e) => onSortChange(e.target.value)}
                        className={cn(
                            "w-full px-4 py-3 rounded-2xl border-2 focus:outline-none font-bold text-xs uppercase tracking-widest appearance-none cursor-pointer",
                            theme === 'dark'
                                ? "bg-slate-800/50 border-transparent text-white"
                                : "bg-slate-50 border-transparent text-slate-700"
                        )}
                    >
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="likes">Popularity</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        {sortOption.includes('asc') ? <SortAsc size={14} /> : <SortDesc size={14} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
