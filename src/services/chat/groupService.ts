
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
  limit,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    seen: boolean;
  };
}

export interface GroupMessage {
  id: string;
  text: string;
  senderId: string;
  groupId: string;
  timestamp: any;
  seen: string[]; // Array of user IDs who have seen the message
  status: 'sent' | 'delivered' | 'seen';
  type: 'text' | 'voice' | 'image' | 'video';
  mediaURL?: string;
}

export const createGroupChat = async (
  name: string,
  description: string,
  members: string[],
  createdBy: string,
  avatar?: string
): Promise<string> => {
  logger.debug('Creating group chat', { name, memberCount: members.length });

  try {
    const groupData = {
      name: name.trim(),
      description: description.trim(),
      avatar: avatar || null,
      members: [createdBy, ...members.filter(id => id !== createdBy)], // Ensure creator is included
      admins: [createdBy], // Creator is the first admin
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null
    };

    const groupRef = await addDoc(collection(db, 'groups'), groupData);
    logger.debug('Group chat created successfully', { groupId: groupRef.id });
    
    return groupRef.id;
  } catch (error) {
    logger.error('Failed to create group chat', error);
    throw new Error(`Failed to create group chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sendGroupMessage = async (
  groupId: string,
  senderId: string,
  text: string,
  type: 'text' | 'voice' | 'image' | 'video' = 'text',
  mediaURL?: string
): Promise<string> => {
  logger.debug('Sending group message', { groupId, senderId, messagePreview: text.substring(0, 50) });

  if (!groupId || !senderId || (!text.trim() && !mediaURL)) {
    throw new Error('Missing required parameters for sending group message');
  }

  try {
    const batch = writeBatch(db);
    
    // 1. Add message to group messages
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const messageDocRef = doc(messagesRef);
    
    const messageData = {
      text: text.trim(),
      senderId,
      groupId,
      timestamp: serverTimestamp(),
      seen: [senderId], // Sender has seen their own message
      status: 'sent',
      type,
      mediaURL: mediaURL || null
    };

    batch.set(messageDocRef, messageData);
    
    // 2. Update group document with last message
    const groupDocRef = doc(db, 'groups', groupId);
    const lastMessageData = {
      text: text.trim(),
      senderId,
      timestamp: serverTimestamp(),
      seen: false
    };
    
    batch.update(groupDocRef, {
      lastMessage: lastMessageData,
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    logger.debug('Group message sent successfully', { messageId: messageDocRef.id });
    return messageDocRef.id;
  } catch (error) {
    logger.error('Failed to send group message', error);
    throw new Error(`Failed to send group message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const subscribeToGroupMessages = (
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  messageLimit: number = 100
) => {
  logger.debug('Setting up group message subscription', { groupId });
  
  if (!groupId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const q = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GroupMessage));
    
    callback(messages);
  }, (error) => {
    logger.error('Error in group message subscription', error);
    callback([]);
  });
};

export const subscribeToUserGroups = (
  userId: string,
  callback: (groups: GroupChat[]) => void
) => {
  logger.debug('Setting up user groups subscription', { userId });
  
  if (!userId) {
    callback([]);
    return () => {};
  }

  const groupsRef = collection(db, 'groups');
  const q = query(
    groupsRef,
    where('members', 'array-contains', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GroupChat));
    
    logger.debug('User groups updated', { groupCount: groups.length });
    callback(groups);
  }, (error) => {
    logger.error('Error in user groups subscription', error);
    callback([]);
  });
};

export const addMemberToGroup = async (groupId: string, userId: string, adminId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const groupData = groupDoc.data() as GroupChat;
    if (!groupData.admins.includes(adminId)) {
      throw new Error('Only admins can add members');
    }
    
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });
    
    logger.debug('Member added to group', { groupId, userId });
  } catch (error) {
    logger.error('Failed to add member to group', error);
    throw error;
  }
};

export const removeMemberFromGroup = async (groupId: string, userId: string, adminId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const groupData = groupDoc.data() as GroupChat;
    if (!groupData.admins.includes(adminId) && adminId !== userId) {
      throw new Error('Only admins can remove members or users can remove themselves');
    }
    
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
    
    logger.debug('Member removed from group', { groupId, userId });
  } catch (error) {
    logger.error('Failed to remove member from group', error);
    throw error;
  }
};

export const markGroupMessageAsSeen = async (groupId: string, messageId: string, userId: string) => {
  try {
    const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
    await updateDoc(messageRef, {
      seen: arrayUnion(userId)
    });
    
    logger.debug('Group message marked as seen', { groupId, messageId, userId });
  } catch (error) {
    logger.error('Failed to mark group message as seen', error);
  }
};
