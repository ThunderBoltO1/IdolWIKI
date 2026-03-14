import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export class SectionErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error) {
        console.error('SectionErrorBoundary caught', error);
    }

    render() {
        if (this.state.hasError) {
            const Fallback = this.props.fallback;
            if (Fallback) return <Fallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
            return (
                <SectionErrorFallback
                    error={this.state.error}
                    sectionName={this.props.sectionName}
                    onRetry={() => this.setState({ hasError: false })}
                />
            );
        }
        return this.props.children;
    }
}

function SectionErrorFallback({ error, sectionName, onRetry }) {
    const { theme } = useTheme();
    return (
        <div
            className={cn(
                'rounded-2xl p-8 border text-center',
                theme === 'dark' ? 'bg-slate-900/60 border-red-500/30 text-slate-200' : 'bg-slate-50 border-red-200 text-slate-800'
            )}
        >
            <AlertCircle size={32} className="mx-auto mb-4 text-red-500" />
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2">
                ไม่สามารถโหลด{sectionName ? ` ${sectionName}` : ''}ได้
            </h3>
            <p className="text-xs opacity-80 mb-4 max-w-md mx-auto">{error?.message}</p>
            <button
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-brand-pink/20 text-brand-pink font-bold text-xs uppercase tracking-wider hover:bg-brand-pink/30 transition-colors"
            >
                ลองอีกครั้ง
            </button>
        </div>
    );
}
