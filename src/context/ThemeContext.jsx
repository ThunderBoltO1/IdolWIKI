import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // themeMode: 'light' | 'dark' | 'auto'
    const [themeMode, setThemeMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('themeMode') || 'auto';
        }
        return 'auto';
    });

    // theme: 'light' | 'dark' (ค่าที่แสดงผลจริง)
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const getAutoTheme = () => {
            const hour = new Date().getHours();
            // 6 PM (18:00) to 6 AM (06:00) is Dark Mode
            return (hour >= 18 || hour < 6) ? 'dark' : 'light';
        };

        const updateTheme = () => {
            let activeTheme = themeMode;
            if (themeMode === 'auto') {
                activeTheme = getAutoTheme();
            }
            
            setTheme(activeTheme);
            
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(activeTheme);
        };

        updateTheme();

        let interval;
        if (themeMode === 'auto') {
            // ตรวจสอบเวลาทุกๆ 1 นาที
            interval = setInterval(updateTheme, 60000);
        }

        localStorage.setItem('themeMode', themeMode);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [themeMode]);

    const toggleTheme = () => {
        setThemeMode(prev => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'auto';
            return 'light';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}