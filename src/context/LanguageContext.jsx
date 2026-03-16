import React, { createContext, useContext, useMemo } from 'react';
import { getT } from '../lib/translations';

// ภาษาเดียว (อังกฤษ) ทั้งระบบ แต่คง context ไว้กันโค้ดพัง
const LanguageContext = createContext({ lang: 'en' });

export function LanguageProvider({ children }) {
    // lang fix เป็น 'en' ไม่มี state / localStorage อีกต่อไป
    const value = useMemo(() => ({ lang: 'en' }), []);
    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}

export function useTranslation() {
    // บังคับใช้ตัวแปลภาษาอังกฤษอย่างเดียว
    return useMemo(() => getT('en'), []);
}
