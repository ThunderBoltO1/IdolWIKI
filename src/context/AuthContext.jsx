
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for persisted user on mount (mock persistence)
        const storedUser = localStorage.getItem('idol_wiki_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        // Mock API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email === 'admin@example.com' && password === 'admin123') {
                    const newUser = {
                        name: 'Admin User',
                        email: email,
                        role: 'admin',
                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'
                    };
                    setUser(newUser);
                    localStorage.setItem('idol_wiki_user', JSON.stringify(newUser));
                    resolve(newUser);
                } else if (password === 'password123') {
                    const newUser = {
                        name: 'K-Pop Fan',
                        email: email,
                        role: 'user',
                        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60'
                    };
                    setUser(newUser);
                    localStorage.setItem('idol_wiki_user', JSON.stringify(newUser));
                    resolve(newUser);
                } else {
                    reject(new Error('Invalid credentials'));
                }
                setIsLoading(false);
            }, 800);
        });
    };

    const register = async (name, email, password) => {
        setIsLoading(true);
        // Mock API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const newUser = {
                    name: name,
                    email: email,
                    role: 'user', // Default to user
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60'
                };
                setUser(newUser);
                localStorage.setItem('idol_wiki_user', JSON.stringify(newUser));
                resolve(newUser);
                setIsLoading(false);
            }, 800);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('idol_wiki_user');
    };

    const updateUser = async (data) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const updatedUser = { ...user, ...data };
                setUser(updatedUser);
                localStorage.setItem('idol_wiki_user', JSON.stringify(updatedUser));
                resolve(updatedUser);
            }, 500);
        });
    };

    const isAdmin = user?.role === 'admin';

    const value = {
        user,
        isLoading,
        login,
        register,
        updateUser,
        logout,
        isAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
