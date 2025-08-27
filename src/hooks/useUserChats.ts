
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';

export interface UserChatData {
  chatId: string;
  otherUserId: string;
  otherUserDisplayName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  timestamp: any;
  seen: boolean;
}

export const useUserChats = () => {
  const { currentUser } = useAuth();
  const [userChats, setUserChats] = useState<UserChatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUserChats([]);
      setLoading(false);
      return;
    }

    logger.debug('Setting up userChats subscription', { userId: currentUser.uid });
    setLoading(true);

    // Listen to userChats/{currentUserId} collection
    const userChatsRef = collection(db, 'userChats', currentUser.uid);
    const q = query(
      userChatsRef, 
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      logger.debug('UserChats updated from Firestore', { chatCount: snapshot.size });
      
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          chatId: data.chatId || doc.id,
          otherUserId: data.otherUserId || '',
          otherUserDisplayName: data.otherUserDisplayName || 'Unknown User',
          otherUserAvatar: data.otherUserAvatar,
          lastMessage: data.lastMessage || '',
          timestamp: data.timestamp,
          seen: data.seen || false
        } as UserChatData;
      });

      setUserChats(chats);
      setLoading(false);
    }, (error) => {
      logger.error('Error in userChats subscription', error);
      setUserChats([]);
      setLoading(false);
    });

    return () => {
      logger.debug('Cleaning up userChats subscription');
      unsubscribe();
    };
  }, [currentUser?.uid]);

  return {
    userChats,
    loading
  };
};
