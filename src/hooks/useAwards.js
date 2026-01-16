import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useAwards() {
    const [awards, setAwards] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'award_categories'), (snapshot) => {
            const data = {};
            snapshot.forEach(doc => {
                const category = doc.data();
                data[category.name] = category.shows || {};
            });
            setAwards(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching awards:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { awards, loading };
}