import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { cn, formatBiographyText } from '../lib/utils';

export function IdolBiographyPage() {
  const { idolId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [fromState, setFromState] = useState(null);
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (location.state?.biography != null && location.state?.name != null) {
      setFromState({ biography: location.state.biography, name: location.state.name });
      return;
    }
    if (!idolId) return;
    getDoc(doc(db, 'idols', idolId))
      .then((snap) => {
        if (!snap.exists()) {
          setLoaded({ error: true });
          return;
        }
        const d = snap.data();
        setLoaded({
          name: d.name || 'Idol',
          biography: d.description || d.biography || 'No biography available.',
        });
      })
      .catch(() => setLoaded({ error: true }));
  }, [idolId, location.state]);

  const name = fromState?.name ?? loaded?.name;
  const biography = fromState?.biography ?? loaded?.biography;
  const error = !fromState && loaded?.error;
  const loading = !fromState && !loaded && idolId;

  if (loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50')}>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>กำลังโหลด...</p>
      </div>
    );
  }

  if (error || (!fromState && !loaded?.biography && !loaded?.name)) {
    return (
      <div className={cn('min-h-screen flex flex-col items-center justify-center gap-4 px-4', theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50')}>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>ไม่พบข้อมูล หรือเกิดข้อผิดพลาด</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={cn('px-4 py-2 rounded-xl text-sm font-medium border', theme === 'dark' ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700')}
        >
          กลับ
        </button>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen', theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900')}>
      <Helmet>
        <title>Biography - {name} | K-Pop Wiki</title>
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(`/idol/${idolId}`)}
            className={cn(
              'p-3 rounded-2xl transition-all active:scale-95 shadow-sm border',
              theme === 'dark' ? 'bg-slate-800 border-white/5 hover:bg-slate-700' : 'bg-white border-slate-100 hover:bg-slate-50'
            )}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Biography — {name}</h1>
        </div>
        <div className={cn('rounded-2xl p-6 md:p-8 border', theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200')}>
          <div className={cn('text-sm leading-relaxed whitespace-pre-wrap', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
            {biography.split('\n').map((p, i) => (p ? <p key={i} className="mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: formatBiographyText(p) }} /> : <br key={i} />))}
          </div>
        </div>
      </div>
    </div>
  );
}
