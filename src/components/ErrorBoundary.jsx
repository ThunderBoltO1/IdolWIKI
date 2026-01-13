import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[999999] bg-slate-950 flex items-center justify-center p-6 sm:p-12 font-sans">
                    <div className="max-w-4xl w-full bg-slate-900 border border-red-500/20 rounded-[40px] p-12 shadow-2xl overflow-auto max-h-[90vh]">
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8">
                            <span className="text-4xl">🌋</span>
                        </div>
                        <h1 className="text-5xl font-black text-white mb-6 tracking-tight">System Exception</h1>
                        <p className="text-xl text-red-400 font-bold mb-8">{this.state.error?.message || 'Unknown error occurred'}</p>

                        <div className="space-y-4 mb-10">
                            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Stack Trace Detail</p>
                            <pre className="bg-black/50 p-8 rounded-3xl border border-white/5 text-slate-400 text-xs overflow-x-auto select-text leading-relaxed">
                                {this.state.error?.stack}
                                {"\n\n--- Component Stack ---\n"}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-brand-pink to-brand-purple text-white font-black uppercase text-sm tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-pink/20"
                        >
                            Restart Environment
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
