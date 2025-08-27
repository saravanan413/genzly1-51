
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserChats, UserChatData } from '../services/chat/conversationService';
import { logger } from '../utils/logger';

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

    const unsubscribe = subscribeToUserChats(currentUser.uid, (chats) => {
      logger.debug('UserChats updated', { chatCount: chats.length });
      setUserChats(chats);
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
