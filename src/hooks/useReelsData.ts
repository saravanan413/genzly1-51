
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Reel } from '../types';

export const useReelsData = (pageSize = 10) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [pageSize]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'reels'),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const newReels = snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Reel));
      
      setReels(newReels);
      setHasMore(newReels.length === pageSize);
      setLastVisible(snapshot.docs[newReels.length - 1] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReels = async () => {
    if (!hasMore || loading || !lastVisible) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'reels'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const newReels = snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Reel));
      
      setReels(prevReels => [...prevReels, ...newReels]);
      setHasMore(newReels.length === pageSize);
      setLastVisible(snapshot.docs[newReels.length - 1] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (reelId: string) => {
    console.log('Liking reel:', reelId);
    // Add like logic here
  };

  const handleSave = async (reelId: string) => {
    console.log('Saving reel:', reelId);
    // Add save logic here
  };

  const handleFollow = async (username: string) => {
    console.log('Following user:', username);
    // Add follow logic here
  };

  return {
    reels,
    loading,
    hasMore,
    error,
    loadMoreReels,
    handleLike,
    handleSave,
    handleFollow
  };
};
