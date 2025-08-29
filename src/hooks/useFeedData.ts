
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types';
import { createLikeNotification, createCommentNotification } from '../services/unifiedNotificationService';

interface UseFeedDataProps {
  pageSize?: number;
  userId?: string;
  category?: string;
}

export const useFeedData = ({ pageSize = 10, userId, category }: UseFeedDataProps = {}) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        let q;
        if (userId) {
          // Fetch posts for a specific user
          q = query(
            collection(db, 'posts'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(pageSize)
          );
        } else if (category) {
          // Fetch posts for a specific category
           q = query(
            collection(db, 'posts'),
            where('category', '==', category),
            orderBy('timestamp', 'desc'),
            limit(pageSize)
          );
        }
        else {
          // Fetch all posts
          q = query(
            collection(db, 'posts'),
            orderBy('timestamp', 'desc'),
            limit(pageSize)
          );
        }

        const snapshot = await getDocs(q);

        if (isMounted) {
          const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
          setPosts(newPosts);
          setHasMore(newPosts.length === pageSize);
          setLastVisible(snapshot.docs[newPosts.length - 1] || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [pageSize, userId, category]);

  const fetchMoreData = async () => {
    if (!hasMore || loading || !lastVisible) return;

    setLoading(true);
    setError(null);

    try {
      let q;
       if (userId) {
          // Fetch posts for a specific user
          q = query(
            collection(db, 'posts'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            startAfter(lastVisible),
            limit(pageSize)
          );
        } else if (category) {
          // Fetch posts for a specific category
           q = query(
            collection(db, 'posts'),
            where('category', '==', category),
            orderBy('timestamp', 'desc'),
            startAfter(lastVisible),
            limit(pageSize)
          );
        }
        else {
          // Fetch all posts
          q = query(
            collection(db, 'posts'),
            orderBy('timestamp', 'desc'),
            startAfter(lastVisible),
            limit(pageSize)
          );
        }

      const snapshot = await getDocs(q);

      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(prevPosts => [...prevPosts, ...newPosts]);
      setHasMore(newPosts.length === pageSize);
      setLastVisible(snapshot.docs[newPosts.length - 1] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLastVisible(null);
    
    try {
      let q;
      if (userId) {
        q = query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(pageSize)
        );
      } else if (category) {
        q = query(
          collection(db, 'posts'),
          where('category', '==', category),
          orderBy('timestamp', 'desc'),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(newPosts);
      setHasMore(newPosts.length === pageSize);
      setLastVisible(snapshot.docs[newPosts.length - 1] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: string) => {
    // Implement like logic
    console.log('Liking post:', postId);
  };

  const handleFollow = async (userId: string) => {
    // Implement follow logic
    console.log('Following user:', userId);
  };

  const handleDoubleClick = async (postId: string) => {
    // Implement double click logic (like)
    console.log('Double clicked post:', postId);
  };

  const createLikeNotificationForPost = async (postOwnerId: string, postId: string) => {
    if (currentUser?.uid) {
      await createLikeNotification(postOwnerId, currentUser.uid, postId);
    }
  };

  const createCommentNotificationForPost = async (postOwnerId: string, postId: string, commentText?: string) => {
    if (currentUser?.uid) {
      await createCommentNotification(postOwnerId, currentUser.uid, postId, commentText);
    }
  };

  return {
    posts,
    loading,
    hasMore,
    error,
    refreshing,
    fetchMoreData,
    loadMorePosts: fetchMoreData,
    handleRefresh,
    handleLike,
    handleFollow,
    handleDoubleClick,
    createLikeNotification: createLikeNotificationForPost,
    createCommentNotification: createCommentNotificationForPost,
  };
};
