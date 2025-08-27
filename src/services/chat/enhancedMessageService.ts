
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ChatMessage } from '../../types/chat';
import { logger } from '../../utils/logger';
import { 
  createConversationId, 
  createOrUpdateConversation, 
  updateUserChats,
  markConversationAsSeen 
} from './conversationService';

// Send a message using the new conversation structure
export const sendMessageToConversation = async (
  senderId: string,
  receiverId: string,
  text: string,
  type: 'text' | 'voice' | 'image' | 'video' = 'text',
  mediaURL?: string
): Promise<string> => {
  logger.debug('Sending message with conversation structure', {
    senderId,
    receiverId,
    messagePreview: text.substring(0, 50) + '...',
    type
  });

  if (!senderId || !receiverId) {
    throw new Error('Missing required parameters for sending message');
  }

  if (!text.trim() && !mediaURL) {
    throw new Error('Message must have text or media');
  }

  try {
    const conversationId = createConversationId(senderId, receiverId);
    const batch = writeBatch(db);
    
    // 1. Add message to conversations/{conversationId}/messages
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageDocRef = doc(messagesRef);
    
    const messageData = {
      text: text.trim(),
      senderId,
      receiverId,
      timestamp: serverTimestamp(),
      seen: false,
      status: 'sent',
      type,
      mediaURL: mediaURL || null,
      delivered: true
    };

    batch.set(messageDocRef, messageData);

    // 2. Update the conversation document
    await createOrUpdateConversation(
      conversationId,
      [senderId, receiverId],
      text.trim(),
      senderId
    );

    // 3. Update userChats for both users
    await updateUserChats(conversationId, senderId, receiverId, text.trim());

    // Commit the message
    await batch.commit();
    
    logger.debug('Message sent successfully with conversation structure', { 
      messageId: messageDocRef.id,
      conversationId 
    });
    
    return messageDocRef.id;
  } catch (error) {
    logger.error('Failed to send message with conversation structure', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Subscribe to messages in a conversation
export const subscribeToConversationMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
) => {
  logger.debug('Setting up conversation messages subscription', { conversationId });
  
  if (!conversationId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(
    messagesRef, 
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    logger.debug('Conversation messages update', { messageCount: snapshot.size });
    
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
    logger.error('Error in conversation messages subscription', error);
    callback([]);
  });
};

// Mark messages as seen in a conversation
export const markConversationMessagesAsSeen = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    logger.debug('Marking conversation messages as seen', { conversationId, userId });
    
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef, 
      where('receiverId', '==', userId),
      where('seen', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnapshot => {
      batch.update(doc(db, 'conversations', conversationId, 'messages', docSnapshot.id), { 
        seen: true,
        status: 'seen'
      });
    });
    
    await batch.commit();
    
    // Also mark the conversation as seen in userChats
    await markConversationAsSeen(conversationId, userId);
    
    logger.debug('Conversation messages marked as seen');
  } catch (error) {
    logger.error('Error marking conversation messages as seen', error);
  }
};
