import React from 'react';
import { Calendar, X, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';

/** Normalize to YYYY-MM-DD for <input type="date">. Accepts YYYY-MM-DD or d/m/y string. */
function toISODate(val) {
    if (!val || typeof val !== 'string') return val || '';
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dmy) {
        const [, a, b, c] = dmy;
        if (dmy[0].includes('/')) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
    return trimmed;
}

export function DateSelect({ value, onChange, theme, label, icon: Icon = Calendar }) {
    const handleClear = () => onChange('');
    const handleToday = () => {
        const now = new Date();
        onChange(now.toISOString().split('T')[0]);
    };
    const isoValue = toISODate(value);

    const inputClass = cn(
        "w-full rounded-2xl py-3 px-4 border-2 focus:outline-none transition-all text-sm font-bold",
        theme === 'dark' ? "bg-slate-800/50 border-white/5 focus:border-brand-pink text-white [&::-webkit-calendar-picker-indicator]:opacity-60" : "bg-slate-50 border-slate-100 focus:border-brand-pink text-slate-900"
    );

    const btnClass = cn(
        "shrink-0 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1",
        theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
    );

    return (
        <div className="space-y-2">
            <label className={cn("text-xs font-black uppercase tracking-widest ml-1 flex items-center gap-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                <Icon size={12} /> {label}
                <span className="font-normal normal-case tracking-normal text-[10px] opacity-80">(ค.ศ.)</span>
            </label>
            <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={isoValue}
                onChange={e => onChange(e.target.value || '')}
                className={inputClass}
            />
            <div className="flex gap-1">
                <button type="button" onClick={handleClear} className={btnClass} title="Clear">
                    <X size={12} /> Clear
                </button>
                <button type="button" onClick={handleToday} className={btnClass} title="Today">
                    <CalendarDays size={12} /> Today
                </button>
            </div>
        </div>
    );
}

/** For IdolModal: shows DateSelect in edit mode, display value otherwise. ไม่แสดงถ้าไม่มีข้อมูล */
export function DateSelectField({ value, onChange, theme, label, editMode, icon: Icon = Calendar, highlighted, valueClass }) {
    if (!editMode) {
        if (!value) return null;
        return (
            <div className={cn("group/detail p-2 rounded-xl transition-colors", highlighted && "bg-brand-pink/10 border border-brand-pink/20")}>
                <p className="text-xs text-slate-500 uppercase font-black tracking-[0.2em] flex items-center gap-2 mb-1.5 opacity-80">
                    <Icon size={12} className="group-hover/detail:text-brand-pink transition-colors" />
                    {label}
                </p>
                <div className={cn("font-black text-base md:text-lg", valueClass || (theme === 'dark' ? "text-slate-100" : "text-slate-900"))}>
                    {value || '-'}
                </div>
            </div>
        );
    }
    return <DateSelect value={value} onChange={onChange} theme={theme} label={label} icon={Icon} />;
}
