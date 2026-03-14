import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { askGemini } from '../lib/gemini';
import { cn } from '../lib/utils';

const NAV_REGEX = /\[\[NAV:(group|idol),([^\]]+)\]\]/;
const ASK_NAV_REGEX = /\[\[ASK_NAV:(group|idol),([^\]]+)\]\]/;
const SOURCE_REGEX = /\[\[SOURCE:(group|idol),([^,\]]+),([^\]]*)\]\]/;
const CHAT_STORAGE_KEY = 'idolwiki_chat_history';

const defaultWelcome = { role: 'assistant', text: 'สวัสดี! ฉันเป็น AI Assistant ของ K-Pop Wiki สอบถามข้อมูลศิลปินหรือกลุ่มได้เลย' };

function loadChatHistory() {
  try {
    const s = localStorage.getItem(CHAT_STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return [defaultWelcome];
}

export function AIChatbot({ idols = [], groups = [] }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChatHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleNavChoice = (messageIndex, choice) => {
    const msg = messages[messageIndex];
    if (!msg?.pendingNav) return;
    const { type, id } = msg.pendingNav;
    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex ? { ...m, pendingNav: undefined } : m
      )
    );
    if (choice === 'yes' && id) {
      navigate(`/${type}/${id}`);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'ไม่เป็นไรค่ะ ถ้าอยากรู้อะไรเพิ่มเติมถามได้เลยนะ' }]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [
      ...prev.map((m) => (m.pendingNav ? { ...m, pendingNav: undefined } : m)),
      { role: 'user', text }
    ]);
    setLoading(true);
    try {
      const reply = await askGemini(text, { idols, groups });
      const navMatch = reply.match(NAV_REGEX);
      const askNavMatch = reply.match(ASK_NAV_REGEX);
      const sourceMatch = reply.match(SOURCE_REGEX);
      let displayText = reply
        .replace(NAV_REGEX, '')
        .replace(ASK_NAV_REGEX, '')
        .replace(SOURCE_REGEX, '')
        .trim();
      const source = sourceMatch ? { type: sourceMatch[1], id: sourceMatch[2].trim(), name: sourceMatch[3]?.trim() || sourceMatch[2] } : undefined;
      const pendingNav = askNavMatch
        ? { type: askNavMatch[1], id: askNavMatch[2].trim() }
        : undefined;
      setMessages((prev) => [...prev, { role: 'assistant', text: displayText, pendingNav, source }]);
      if (navMatch) {
        const [, type, id] = navMatch;
        const targetId = id.trim();
        if (targetId) {
          navigate(`/${type}/${targetId}`);
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `เกิดข้อผิดพลาด: ${e.message || 'ไม่สามารถเชื่อมต่อ AI ได้'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              'fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden',
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                theme === 'dark' ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink text-white">
                  <Sparkles size={18} />
                </div>
                <span className="font-black text-sm uppercase tracking-widest">
                  AI Assistant
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn('p-2 rounded-xl transition-colors', theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200')}
              >
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[calc(70vh-140px)]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col gap-2',
                    m.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'flex',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className="space-y-1">
                      <div
                        className={cn(
                          'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-pre-wrap',
                          m.role === 'user'
                            ? 'bg-brand-pink text-white'
                            : theme === 'dark'
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-slate-100 text-slate-800'
                        )}
                      >
                        {m.text}
                      </div>
                      {m.role === 'assistant' && m.source && (
                        <button
                          type="button"
                          onClick={() => navigate(`/${m.source.type}/${m.source.id}`)}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity',
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                          )}
                        >
                          ข้อมูลจาก: {m.source.name}
                        </button>
                      )}
                    </div>
                  </div>
                  {m.role === 'assistant' && m.pendingNav && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleNavChoice(i, 'yes')}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                          'bg-brand-pink text-white hover:opacity-90'
                        )}
                      >
                        ใช่
                      </button>
                      <button
                        onClick={() => handleNavChoice(i, 'no')}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                          theme === 'dark'
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        )}
                      >
                        ไม่
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className={cn(
                      'px-4 py-2.5 rounded-2xl flex items-center gap-2',
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                    )}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">กำลังค้นหา...</span>
                  </div>
                </div>
              )}
            </div>

            <div
              className={cn(
                'p-3 border-t flex gap-2',
                theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50'
              )}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="ถามเกี่ยวกับศิลปิน K-Pop..."
                disabled={loading}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-colors',
                  theme === 'dark'
                    ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
                  'disabled:opacity-60'
                )}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-brand-pink text-white hover:bg-brand-pink/90 disabled:opacity-50 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors',
          'bg-gradient-to-br from-brand-purple to-brand-pink text-white hover:scale-105 active:scale-95'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={24} strokeWidth={2.5} />
      </motion.button>
    </>
  );
}
