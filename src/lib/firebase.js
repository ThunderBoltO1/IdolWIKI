import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3M7n5G9MRR2xqAel05dCX1W_RjL6gdEo",
    authDomain: "idolwiki-490f9.firebaseapp.com",
    projectId: "idolwiki-490f9",
    storageBucket: "idolwiki-490f9.firebasestorage.app",
    messagingSenderId: "772690307812",
    appId: "1:772690307812:web:4ef1ab759cd478fcf35af1",
    measurementId: "G-LKZ7LR0KPJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
             // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        } else if (err.code == 'unimplemented') {
             // The current browser does not support all of the features required to enable persistence
        }
    });
}

const storage = getStorage(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, db, storage, analytics };
