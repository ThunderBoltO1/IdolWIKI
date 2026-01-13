import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

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
        // Listen for real Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get additional user data from Firestore (role, avatar, etc.)
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userDoc.data()
                        });
                    } else {
                        // If no firestore doc yet, use basic auth info
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            name: firebaseUser.displayName,
                            avatar: firebaseUser.photoURL,
                            role: firebaseUser.email === 'admin@example.com' ? 'admin' : 'user'
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Fallback to basic auth info
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName
                    });
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name, email, password) => {
        setIsLoading(true);
        console.log("Starting registration for:", email);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            console.log("Firebase Auth user created:", firebaseUser.uid);

            // Update basic profile
            await updateProfile(firebaseUser, { displayName: name });
            console.log("Auth profile updated with name:", name);

            // Create user document in Firestore
            const userData = {
                name: name,
                email: email,
                role: email === 'admin@example.com' ? 'admin' : 'user',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            console.log("Firestore user document created for:", firebaseUser.uid);

            setUser({ uid: firebaseUser.uid, ...userData });
            return firebaseUser;
        } catch (error) {
            console.error("Registration failed at step:", error.code || 'unknown');
            console.error("Full error details:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const updateUser = async (data) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, data);

            // Also update Auth profile if name changed
            if (data.name) {
                await updateProfile(auth.currentUser, { displayName: data.name });
            }

            setUser(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Update error:", error);
            throw error;
        }
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
