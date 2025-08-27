
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

export interface ConversationData {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageSenderId: string;
  timestamp: any;
  seen: boolean;
}

export interface UserChatData {
  conversationId: string;
  otherUserId: string;
  otherUserDisplayName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageSenderId: string;
  timestamp: any;
  seen: boolean;
}

// Create a conversation ID from two user IDs (sorted for consistency)
export const createConversationId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return sortedIds.join('_');
};

// Create or update a conversation document
export const createOrUpdateConversation = async (
  conversationId: string,
  participants: string[],
  lastMessage: string,
  senderId: string
): Promise<void> => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    await setDoc(conversationRef, {
      participants,
      lastMessage,
      lastMessageSenderId: senderId,
      timestamp: serverTimestamp(),
      seen: false
    }, { merge: true });

    logger.debug('Conversation updated', { conversationId });
  } catch (error) {
    logger.error('Error updating conversation', error);
    throw error;
  }
};

// Update userChats for both participants
export const updateUserChats = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  lastMessage: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Get user data for display names and avatars
    const [senderDoc, receiverDoc] = await Promise.all([
      getDoc(doc(db, 'users', senderId)),
      getDoc(doc(db, 'users', receiverId))
    ]);

    const senderData = senderDoc.exists() ? senderDoc.data() : {};
    const receiverData = receiverDoc.exists() ? receiverDoc.data() : {};

    // Update sender's userChats
    const senderChatRef = doc(db, 'userChats', senderId, 'chats', conversationId);
    batch.set(senderChatRef, {
      conversationId,
      otherUserId: receiverId,
      otherUserDisplayName: receiverData.displayName || receiverData.username || 'Unknown User',
      otherUserAvatar: receiverData.avatar,
      lastMessage,
      lastMessageSenderId: senderId,
      timestamp: serverTimestamp(),
      seen: true // Sender has seen their own message
    }, { merge: true });

    // Update receiver's userChats
    const receiverChatRef = doc(db, 'userChats', receiverId, 'chats', conversationId);
    batch.set(receiverChatRef, {
      conversationId,
      otherUserId: senderId,
      otherUserDisplayName: senderData.displayName || senderData.username || 'Unknown User',
      otherUserAvatar: senderData.avatar,
      lastMessage,
      lastMessageSenderId: senderId,
      timestamp: serverTimestamp(),
      seen: false // Receiver hasn't seen the message yet
    }, { merge: true });

    await batch.commit();
    logger.debug('UserChats updated for both users', { conversationId, senderId, receiverId });
  } catch (error) {
    logger.error('Error updating userChats', error);
    throw error;
  }
};

// Subscribe to user's chat list from userChats collection
export const subscribeToUserChats = (
  userId: string,
  callback: (chats: UserChatData[]) => void
): (() => void) => {
  logger.debug('Setting up userChats subscription', { userId });

  if (!userId) {
    callback([]);
    return () => {};
  }

  const userChatsRef = collection(db, 'userChats', userId, 'chats');
  const q = query(userChatsRef, orderBy('timestamp', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserChatData[];

    logger.debug('UserChats updated', { chatCount: chats.length });
    callback(chats);
  }, (error) => {
    logger.error('Error in userChats subscription', error);
    callback([]);
  });
};

// Mark a conversation as seen for a specific user
export const markConversationAsSeen = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const userChatRef = doc(db, 'userChats', userId, 'chats', conversationId);
    await updateDoc(userChatRef, {
      seen: true
    });

    logger.debug('Conversation marked as seen', { conversationId, userId });
  } catch (error) {
    logger.error('Error marking conversation as seen', error);
  }
};
