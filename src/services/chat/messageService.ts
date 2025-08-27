
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  serverTimestamp,
  where,
  getDocs,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ChatMessage } from '../../types/chat';
import { logger } from '../../utils/logger';

// Subscribe to messages in a chat
export const subscribeToChatMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
) => {
  logger.debug('Setting up chat messages subscription', { chatId });
  
  if (!chatId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(
    messagesRef, 
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    logger.debug('Chat messages update', { messageCount: snapshot.size });
    
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        text: data.text || '',
        senderId: data.senderId,
        receiverId: data.receiverId,
        timestamp: data.timestamp,
        seen: data.seen || false,
        status: data.status || 'sent',
        type: data.type || 'text',
        mediaURL: data.mediaURL || null,
        delivered: true
      } as ChatMessage;
    });
    
    callback(messages);
  }, (error) => {
    logger.error('Error in chat messages subscription', error);
    callback([]);
  });
};

// Mark messages as seen and update userChats
export const markMessagesAsSeen = async (
  chatId: string,
  userId: string
): Promise<void> => {
  try {
    logger.debug('Marking messages as seen', { chatId, userId });
    
    const batch = writeBatch(db);
    
    // Mark messages as seen
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef, 
      where('receiverId', '==', userId),
      where('seen', '==', false)
    );
    
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(docSnapshot => {
      batch.update(doc(db, 'chats', chatId, 'messages', docSnapshot.id), { 
        seen: true,
        status: 'seen'
      });
    });

    // Update userChats to mark as seen
    const userChatRef = doc(db, 'userChats', userId, chatId);
    batch.update(userChatRef, {
      seen: true
    });
    
    await batch.commit();
    logger.debug('Messages marked as seen');
  } catch (error) {
    logger.error('Error marking messages as seen', error);
  }
};
