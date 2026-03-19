import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askGemini } from '../lib/gemini';
import { cn, stripHtml } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

const NAV_REGEX = /\[\[NAV:(group|idol),([^\]]+)\]\]/;
const ASK_NAV_REGEX = /\[\[ASK_NAV:(group|idol),([^\]]+)\]\]/;
const SOURCE_REGEX = /\[\[SOURCE:(group|idol),([^,\]]+),([^\]]*)\]\]/;
const STRIP_SOURCE_REGEX = /\[\[SOURCE:[^\]]*\]\]/g;

const TEXTS = {
    th: {
        yes: 'ไป',
        no: 'ไม่ไป',
        noProblem: 'รับทราบค่ะ สงสัยอะไรถามได้เลยนะคะ',
    },
    en: {
        yes: 'Yes',
        no: 'No',
        noProblem: 'No problem! Feel free to ask if you want to know more.',
    },
};

function isThai(text) {
    return /[\u0E00-\u0E7F]/.test(text || '');
}

function getLastUserLang(messages, beforeIndex) {
    const slice = beforeIndex != null ? messages.slice(0, beforeIndex) : messages;
    const last = [...slice].reverse().find((m) => m.from === 'user');
    return last ? (isThai(last.text) ? 'th' : 'en') : 'th';
}

export function ChatbotWidget({ idols = [], groups = [], companies = [] }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, from: 'bot', text: 'สวัสดีค่ะ! ฉันคัง แอริน ผู้ช่วยของคุณ มีอะไรสอบถามฉันได้เลยนะคะ ✨' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        if (open && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [open, messages]);

    const handleNavChoice = (messageId, choice) => {
        setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === messageId);
            if (idx === -1) return prev;
            const msg = prev[idx];
            if (!msg.pendingNav) return prev;
            const { type, id } = msg.pendingNav;
            const lang = getLastUserLang(prev, idx);
            const t = TEXTS[lang] || TEXTS.th;
            const next = prev.map((m, i) =>
                i === idx ? { ...m, pendingNav: undefined } : m
            );
            if (choice === 'yes' && id) {
                navigate(`/${type}/${id}`);
                return next;
            }
            return [...next, { id: Date.now(), from: 'bot', text: t.noProblem }];
        });
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { id: Date.now(), from: 'user', text };
        setMessages(prev => [
            ...prev.map((m) => (m.pendingNav ? { ...m, pendingNav: undefined } : m)),
            userMsg,
        ]);
        setInput('');

        setLoading(true);
        try {
            // keep short history to reduce prompt size
            const chatHistory = messages.slice(-8).map((m) => ({
                role: m.from === 'user' ? 'user' : 'assistant',
                text: m.text,
            }));
            const reply = await askGemini(text, { idols, groups, companies, chatHistory });

            const navMatch = reply.match(NAV_REGEX);
            const askNavMatch = reply.match(ASK_NAV_REGEX);
            const sourceMatch = reply.match(SOURCE_REGEX);

            let displayText = stripHtml(
                reply
                    .replace(STRIP_SOURCE_REGEX, '')
                    .replace(NAV_REGEX, '')
                    .replace(ASK_NAV_REGEX, '')
                    .replace(STRIP_SOURCE_REGEX, '')
                    .replace(/\s{2,}/g, ' ')
                    .trim()
            );

            if (!displayText) {
                displayText = 'ขออภัยค่ะ ตอนนี้ฉันยังไม่ทราบคำตอบ มีเรื่องอื่นที่สงสัยหรือเปล่าคะ';
            }

            const source = sourceMatch
                ? {
                    type: sourceMatch[1],
                    id: sourceMatch[2].trim(),
                    name: sourceMatch[3]?.trim() || sourceMatch[2],
                }
                : undefined;

            const pendingNav = askNavMatch
                ? { type: askNavMatch[1], id: askNavMatch[2].trim() }
                : undefined;

            const botMessageId = Date.now() + 1;

            setMessages(prev => [
                ...prev,
                { id: botMessageId, from: 'bot', text: displayText, pendingNav, source },
            ]);

            if (navMatch) {
                const [, type, id] = navMatch;
                const targetId = id.trim();
                if (targetId) {
                    navigate(`/${type}/${targetId}`);
                }
            }
        } catch (e) {
            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, from: 'bot', text: `ขออภัยค่ะ ตอนนี้ระบบกำลังมีปัญหาค่ะ: ${e?.message || 'เชื่อมต่อ AI ไม่สำเร็จ'}` }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating open button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-24 right-6 z-60 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple text-white p-4 shadow-xl shadow-brand-purple/40 hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Open chat"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {/* Chat panel with open/close animation */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="chat-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className={cn(
                            'fixed bottom-24 right-6 z-60 w-full max-w-sm sm:max-w-sm',
                        )}
                    >
                        <div
                            className={cn(
                                'rounded-3xl overflow-hidden shadow-2xl border backdrop-blur-2xl flex flex-col font-thai',
                                isDark ? 'bg-slate-950/85 border-white/10' : 'bg-white/95 border-slate-200'
                            )}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-brand-pink to-brand-purple px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shadow-inner overflow-hidden">
                                        <img
                                            src="https://firebasestorage.googleapis.com/v0/b/idolwiki-490f9.firebasestorage.app/o/Gemini_Generated_Image_ucpwmxucpwmxucpw.png?alt=media"
                                            alt="AI Chatbot"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-white">
                                            Kang Arin Assistant
                                        </span>
                                        <span className="text-[11px] text-white/80 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Online
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                        aria-label="Close chat"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                ref={listRef}
                                className={cn(
                                    'max-h-[620px] min-h-[340px] px-3 py-3 space-y-2 overflow-y-auto',
                                    isDark
                                        ? 'bg-gradient-to-b from-slate-950/60 to-slate-900/80'
                                        : 'bg-slate-50'
                                )}
                            >
                                {messages.map((m, i) => {
                                    const lang = getLastUserLang(messages, i);
                                    const t = TEXTS[lang] || TEXTS.th;
                                    const isUser = m.from === 'user';
                                    return (
                                        <div key={m.id} className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
                                            <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                                                <div
                                                    className={cn(
                                                        'max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm',
                                                        isUser
                                                            ? 'bg-brand-pink text-white rounded-br-sm'
                                                            : isDark
                                                                ? 'bg-slate-800/90 text-slate-50 rounded-bl-sm'
                                                                : 'bg-white text-slate-900 rounded-bl-sm'
                                                    )}
                                                >
                                                    {stripHtml(m.text)}
                                                </div>
                                            </div>

                                            {m.from === 'bot' && m.pendingNav && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleNavChoice(m.id, 'yes')}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-brand-pink text-white hover:opacity-90 transition-colors"
                                                    >
                                                        {t.yes}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleNavChoice(m.id, 'no')}
                                                        className={cn(
                                                            'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                                                            isDark
                                                                ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                                                                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                                        )}
                                                    >
                                                        {t.no}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className={cn(
                                            'inline-flex items-center gap-2 max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm',
                                            isDark ? 'bg-slate-800/90 text-slate-50' : 'bg-white text-slate-900'
                                        )}>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>สักครู่นะคะ</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div
                                className={cn(
                                    'px-3 py-2 border-top flex items-center gap-2',
                                    isDark
                                        ? 'border-white/10 bg-slate-950/90'
                                        : 'border-slate-200 bg-white'
                                )}
                            >
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a message..."
                                    className={cn(
                                        'flex-1 text-sm px-3 py-2 rounded-full outline-none border',
                                        isDark
                                            ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-500'
                                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                                    )}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="p-2 rounded-full bg-brand-pink text-white shadow-md shadow-brand-pink/40 hover:bg-brand-pink/90 active:scale-95 transition-transform disabled:opacity-40"
                                    aria-label="Send message"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

