
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
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, sanitizeMessage } from '../../config/firebase';
import { sendMessageToConversation } from './enhancedMessageService';
import { createConversationId } from './conversationService';
import { logger } from '../../utils/logger';

export const createChatId = (userId1: string, userId2: string): string => {
  return createConversationId(userId1, userId2);
};

export const sendChatMessage = async (
  currentUserId: string, 
  receiverId: string, 
  text: string, 
  type: 'text' | 'voice' | 'image' | 'video' = 'text',
  mediaURL?: string
) => {
  logger.debug('Starting chat message send', {
    currentUserId,
    receiverId,
    messagePreview: text.substring(0, 50) + '...',
    type
  });

  if (!currentUserId || !receiverId) {
    throw new Error('Missing currentUserId or receiverId');
  }

  if (!text.trim() && !mediaURL) {
    throw new Error('Message cannot be empty');
  }

  try {
    const chatId = createChatId(currentUserId, receiverId);
    const batch = writeBatch(db);
    
    // 1. Add message to chats/{chatId}/messages
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageDocRef = doc(messagesRef);
    
    const messageData = {
      text: text.trim(),
      senderId: currentUserId,
      receiverId,
      timestamp: serverTimestamp(),
      seen: false,
      status: 'sent',
      type,
      mediaURL: mediaURL || null,
      delivered: true
    };

    batch.set(messageDocRef, messageData);

    // 2. Update main chat document
    const chatDocRef = doc(db, 'chats', chatId);
    batch.set(chatDocRef, {
      participants: [currentUserId, receiverId],
      lastMessage: text.trim(),
      timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 3. Get user data for display names
    const [senderDoc, receiverDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', receiverId))
    ]);

    const senderData = senderDoc.exists() ? senderDoc.data() : {};
    const receiverData = receiverDoc.exists() ? receiverDoc.data() : {};

    // 4. Update sender's userChats subcollection
    const senderChatRef = doc(db, 'userChats', currentUserId, 'chats', chatId);
    batch.set(senderChatRef, {
      chatId,
      otherUserId: receiverId,
      otherUserDisplayName: receiverData.displayName || receiverData.username || 'Unknown User',
      otherUserAvatar: receiverData.avatar,
      lastMessage: text.trim(),
      timestamp: serverTimestamp(),
      seen: true // Sender has seen their own message
    });

    // 5. Update receiver's userChats subcollection
    const receiverChatRef = doc(db, 'userChats', receiverId, 'chats', chatId);
    batch.set(receiverChatRef, {
      chatId,
      otherUserId: currentUserId,
      otherUserDisplayName: senderData.displayName || senderData.username || 'Unknown User',
      otherUserAvatar: senderData.avatar,
      lastMessage: text.trim(),
      timestamp: serverTimestamp(),
      seen: false // Receiver hasn't seen the message yet
    });

    await batch.commit();
    
    logger.debug('Message sent successfully', { messageId: messageDocRef.id });
    return messageDocRef.id;
  } catch (error) {
    logger.error('Complete message send process failed', error);
    throw error;
  }
};

interface ChatDocument {
  users: string[];
  createdAt: ReturnType<typeof serverTimestamp>;
  lastMessage: {
    text: string;
    timestamp: ReturnType<typeof serverTimestamp>;
    senderId: string;
    seen: boolean;
  };
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export const ensureChatExists = async (userId1: string, userId2: string) => {
  const chatId = createChatId(userId1, userId2);
  logger.debug('Ensuring chat exists', { userId1, userId2, chatId });
  
  try {
    // Check if chat already exists
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    
    if (chatDoc.exists()) {
      logger.debug('Chat already exists', { chatId });
      return chatId;
    }

    // Get user data to ensure both users exist
    const [user1Doc, user2Doc] = await Promise.all([
      getDoc(doc(db, 'users', userId1)),
      getDoc(doc(db, 'users', userId2))
    ]);

    if (!user1Doc.exists() || !user2Doc.exists()) {
      throw new Error('One or both users do not exist');
    }

    // Create chat document with proper structure for querying
    const chatData: ChatDocument = {
      users: [userId1, userId2], // This is crucial for array-contains queries
      createdAt: serverTimestamp(),
      lastMessage: {
        text: '',
        timestamp: serverTimestamp(),
        senderId: '',
        seen: true
      },
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'chats', chatId), chatData);
    logger.debug('Chat document created with users array', { chatId, users: [userId1, userId2] });
    
    return chatId;
  } catch (error) {
    logger.error('Error ensuring chat exists', error);
    throw error;
  }
};
