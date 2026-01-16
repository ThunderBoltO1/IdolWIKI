import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
        let unsubscribeUser = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (unsubscribeUser) unsubscribeUser();

            if (firebaseUser) {
                // Update online status
                try {
                    await updateDoc(doc(db, 'users', firebaseUser.uid), { isOnline: true });
                } catch (e) {
                    // Ignore error if doc doesn't exist yet (e.g. during registration flow)
                }

                // Real-time listener for user document
                unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid),
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                ...docSnap.data()
                            });
                        } else {
                            // If no firestore doc yet
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                name: firebaseUser.displayName,
                                avatar: firebaseUser.photoURL,
                                role: (firebaseUser.email === 'admin@example.com' || firebaseUser.email === 'mctv2541@gmail.com') ? 'admin' : 'user'
                            });
                        }
                        setIsLoading(false);
                    },
                    (error) => {
                        console.error("User doc listener error:", error);
                        setIsLoading(false);
                    }
                );
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, []);

    const logActivity = async (uid, action, details = {}) => {
        try {
            await addDoc(collection(db, 'activityLogs'), {
                userId: uid,
                action,
                details,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    const login = async (identifier, password) => {
        setIsLoading(true);
        try {
            let email = identifier.trim();

            // If identifier doesn't look like an email, treat it as a username
            if (!email.includes('@')) {
                const usernameDoc = await getDoc(doc(db, 'usernames', email.toLowerCase()));
                if (!usernameDoc.exists()) {
                    throw new Error('Username not found');
                }
                const data = usernameDoc.data();
                if (data.email) {
                    email = data.email;
                } else if (data.uid) {
                    // Fallback: try to get email from user profile if not in username doc
                    const userDoc = await getDoc(doc(db, 'users', data.uid));
                    if (userDoc.exists() && userDoc.data().email) {
                        email = userDoc.data().email;
                    }
                }
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await logActivity(userCredential.user.uid, 'login');
            return userCredential.user;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name, username, email, password) => {
        setIsLoading(true);
        const lowerUsername = username.toLowerCase().trim();
        console.log("Starting registration for:", email, "with username:", lowerUsername);
        try {
            // 1. Check if username exists
            const usernameDoc = await getDoc(doc(db, 'usernames', lowerUsername));
            if (usernameDoc.exists()) {
                throw new Error('Username already taken');
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            console.log("Firebase Auth user created:", firebaseUser.uid);

            // 2. Update basic profile
            await updateProfile(firebaseUser, { displayName: name });

            // 3. Create username mapping
            await setDoc(doc(db, 'usernames', lowerUsername), {
                email: email,
                uid: firebaseUser.uid
            });

            // 4. Create user document in Firestore
            const userData = {
                name: name,
                username: lowerUsername,
                email: email,
                role: (email === 'admin@example.com' || email === 'mctv2541@gmail.com') ? 'admin' : 'user',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
                createdAt: new Date().toISOString(),
                isOnline: true
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            console.log("Firestore user document created for:", firebaseUser.uid);

            setUser({ uid: firebaseUser.uid, ...userData });
            await logActivity(firebaseUser.uid, 'register');
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
            if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), { isOnline: false });
                await logActivity(user.uid, 'logout');
            }
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
            await logActivity(user.uid, 'update_profile', data);
        } catch (error) {
            console.error("Update error:", error);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
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
        isAdmin,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
