
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToUserGroups, 
  subscribeToGroupMessages, 
  sendGroupMessage, 
  GroupChat, 
  GroupMessage 
} from '../services/chat/groupService';
import { logger } from '../utils/logger';

export const useGroupChat = () => {
  const { currentUser } = useAuth();
  const [userGroups, setUserGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUserGroups([]);
      setLoading(false);
      return;
    }

    logger.debug('Setting up user groups subscription');
    const unsubscribe = subscribeToUserGroups(currentUser.uid, (groups) => {
      setUserGroups(groups);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  return {
    userGroups,
    loading
  };
};

export const useGroupMessages = (groupId: string) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    logger.debug('Setting up group messages subscription', { groupId });
    const unsubscribe = subscribeToGroupMessages(groupId, (messages) => {
      setMessages(messages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  return {
    messages,
    loading
  };
};

export const useGroupActions = () => {
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (groupId: string, text: string, type?: 'text' | 'voice' | 'image' | 'video', mediaURL?: string) => {
    if (!currentUser || !text.trim()) return;

    setSending(true);
    setError(null);

    try {
      await sendGroupMessage(groupId, currentUser.uid, text, type, mediaURL);
    } catch (err) {
      logger.error('Error sending group message', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return {
    sendMessage,
    sending,
    error,
    clearError: () => setError(null)
  };
};
