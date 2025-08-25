import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  deleteDoc,
  where,
  writeBatch,
  limit,
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserProfile } from './firestoreService';

export interface InstagramNotification {
  id: string;
  type: 'like' | 'comment' | 'followrequest' | 'followaccept';
  senderId: string;
  receiverId: string;
  timestamp: any;
  seen: boolean;
  postId?: string;
  commentText?: string;
  // Instagram-like aggregation
  aggregatedCount?: number;
  lastActors?: string[];
  senderProfile?: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  postThumbnail?: string;
}

// Create notification with strict Firestore rule compliance
export const createInstagramNotification = async (
  receiverId: string,
  senderId: string,
  type: 'like' | 'comment' | 'followrequest' | 'followaccept',
  additionalData?: {
    postId?: string;
    commentText?: string;
  }
) => {
  try {
    // Don't create notification for self-actions
    if (receiverId === senderId) {
      console.log('Skipping self-notification');
      return;
    }

    console.log('Creating notification with strict rule compliance:', { receiverId, senderId, type, additionalData });

    const notificationsRef = collection(db, 'notifications', receiverId, 'items');

    // For likes, check if there's already a like notification for this post
    if (type === 'like' && additionalData?.postId) {
      const existingQuery = query(
        notificationsRef,
        where('type', '==', 'like'),
        where('postId', '==', additionalData.postId),
        limit(1)
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // Update existing notification with aggregation
        const existingDoc = existingDocs.docs[0];
        const existingData = existingDoc.data();
        
        const currentActors = existingData.lastActors || [existingData.senderId];
        const newActors = [senderId, ...currentActors.filter(id => id !== senderId)].slice(0, 3);
        
        await updateDoc(existingDoc.ref, {
          timestamp: serverTimestamp(),
          seen: false,
          aggregatedCount: (existingData.aggregatedCount || 1) + 1,
          lastActors: newActors,
          senderId: senderId
        });
        
        console.log('Updated aggregated like notification');
        return existingDoc.id;
      }
    }

    // For follow requests, check for duplicates
    if (type === 'followrequest') {
      const existingQuery = query(
        notificationsRef,
        where('senderId', '==', senderId),
        where('type', '==', 'followrequest'),
        limit(1)
      );
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        console.log('Follow request notification already exists, updating timestamp');
        const existingDoc = existingDocs.docs[0];
        await updateDoc(existingDoc.ref, {
          timestamp: serverTimestamp(),
          seen: false
        });
        return existingDoc.id;
      }
    }

    // Create notification with EXACTLY the 5 required fields as per Firestore rules
    const notificationData = {
      receiverId,    // Must match the document path userId
      senderId,      // Must match request.auth.uid  
      type,          // Must be one of: 'like', 'comment', 'followrequest', 'followaccept'
      timestamp: serverTimestamp(),
      seen: false    // Must be false initially
    };

    console.log('Creating notification with rule-compliant data:', notificationData);
    console.log('Target path: /notifications/' + receiverId + '/items/');

    // Create the notification document
    const docRef = await addDoc(notificationsRef, notificationData);
    console.log(`Notification created successfully with ID:`, docRef.id);
    
    // After successful creation, update with additional fields
    const updateData: any = {
      aggregatedCount: 1,
      lastActors: [senderId]
    };
    
    if (additionalData?.postId) {
      updateData.postId = additionalData.postId;
    }
    
    if (additionalData?.commentText) {
      updateData.commentText = additionalData.commentText;
    }
    
    await updateDoc(docRef, updateData);
    console.log('Additional fields added after creation');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      receiverId,
      senderId,
      type
    });
    
    if (error?.code === 'permission-denied') {
      console.error('PERMISSION DENIED - Firestore rule violation!');
      console.error('Required fields: receiverId, senderId, type, timestamp, seen');
      console.error('Valid types: like, comment, followrequest, followaccept');
      console.error('Path: /notifications/' + receiverId + '/items/');
    }
    
    throw error;
  }
};

// Subscribe to notifications with real-time updates
export const subscribeToInstagramNotifications = (
  userId: string,
  callback: (notifications: InstagramNotification[]) => void
) => {
  console.log('Setting up Instagram-style notification listener for user:', userId);
  
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('timestamp', 'desc'),
    limit(50) // Limit to recent notifications like Instagram
  );

  return onSnapshot(q, async (snapshot) => {
    console.log('Instagram notification update received:', snapshot.docs.length, 'notifications');
    
    const notifications: InstagramNotification[] = [];
    
    for (const docSnap of snapshot.docs) {
      const notificationData = docSnap.data();
      
      // Get sender profile for display
      let senderProfile = null;
      try {
        const profile = await getUserProfile(notificationData.senderId);
        if (profile) {
          senderProfile = {
            username: profile.username,
            displayName: profile.displayName,
            avatar: profile.avatar
          };
        }
      } catch (error) {
        console.error('Error fetching sender profile:', error);
      }

      // Get post thumbnail for post-related notifications
      let postThumbnail = null;
      if (notificationData.postId && (notificationData.type === 'like' || notificationData.type === 'comment')) {
        try {
          const postDoc = await getDoc(doc(db, 'posts', notificationData.postId));
          if (postDoc.exists()) {
            postThumbnail = postDoc.data().mediaURL;
          }
        } catch (error) {
          console.error('Error fetching post thumbnail:', error);
        }
      }

      notifications.push({
        id: docSnap.id,
        type: notificationData.type,
        senderId: notificationData.senderId,
        receiverId: notificationData.receiverId,
        timestamp: notificationData.timestamp,
        seen: notificationData.seen || false,
        postId: notificationData.postId,
        commentText: notificationData.commentText,
        aggregatedCount: notificationData.aggregatedCount || 1,
        lastActors: notificationData.lastActors || [notificationData.senderId],
        senderProfile,
        postThumbnail
      } as InstagramNotification);
    }
    
    callback(notifications);
  }, (error) => {
    console.error('Error in Instagram notification listener:', error);
    callback([]);
  });
};

// Mark notification as seen
export const markInstagramNotificationAsSeen = async (userId: string, notificationId: string) => {
  try {
    console.log('Marking notification as seen:', { userId, notificationId });
    
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    
    // Only update the 'seen' field as allowed by the rules
    await updateDoc(notificationRef, {
      seen: true
    });
    
    console.log('Notification marked as seen successfully');
  } catch (error) {
    console.error('Error marking notification as seen:', error);
  }
};

// Mark all notifications as seen
export const markAllInstagramNotificationsAsSeen = async (userId: string) => {
  try {
    console.log('Marking all notifications as seen for user:', userId);
    
    const q = query(
      collection(db, 'notifications', userId, 'items'),
      where('seen', '==', false)
    );
    
    const snapshot = await getDocs(q);
    console.log('Found', snapshot.docs.length, 'unseen notifications to mark as seen');
    
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      // Only update the 'seen' field as allowed by rules
      batch.update(doc.ref, { seen: true });
    });
    
    await batch.commit();
    console.log('All Instagram notifications marked as seen');
  } catch (error) {
    console.error('Error marking all Instagram notifications as seen:', error);
  }
};

// Delete notification
export const deleteInstagramNotification = async (userId: string, notificationId: string) => {
  try {
    console.log('Deleting notification:', { userId, notificationId });
    
    // Path: /notifications/{userId}/items/{notificationId}
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    await deleteDoc(notificationRef);
    
    console.log('Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting Instagram notification:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      userId,
      notificationId
    });
  }
};

// Remove notification when user performs reverse action
export const removeInstagramNotification = async (
  receiverId: string,
  senderId: string,
  type: string,
  postId?: string
) => {
  try {
    console.log('Removing notification:', { receiverId, senderId, type, postId });
    
    const q = query(
      collection(db, 'notifications', receiverId, 'items'),
      where('type', '==', type),
      ...(postId ? [where('postId', '==', postId)] : []),
      ...(type !== 'like' ? [where('senderId', '==', senderId)] : [])
    );
    
    const snapshot = await getDocs(q);
    console.log('Found notifications to remove/update:', snapshot.docs.length);
    
    if (type === 'like' && snapshot.docs.length > 0) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      if (data.aggregatedCount > 1) {
        const newActors = (data.lastActors || []).filter(id => id !== senderId);
        const newCount = (data.aggregatedCount || 1) - 1;
        
        await updateDoc(doc.ref, {
          aggregatedCount: newCount,
          lastActors: newActors,
          senderId: newActors[0] || data.senderId,
          timestamp: serverTimestamp()
        });
        console.log('Updated aggregated like notification');
      } else {
        await deleteDoc(doc.ref);
        console.log('Deleted last like notification');
      }
    } else {
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.docs.length} ${type} notifications`);
    }
    
    console.log(`Successfully removed/updated ${type} notification`);
  } catch (error) {
    console.error('Error removing notification:', error);
  }
};

// Specific notification creators with correct type names
export const createLikeNotification = async (
  postOwnerId: string,
  likerId: string,
  postId: string
) => {
  return await createInstagramNotification(postOwnerId, likerId, 'like', { postId });
};

export const createCommentNotification = async (
  postOwnerId: string,
  commenterId: string,
  postId: string,
  commentText?: string
) => {
  return await createInstagramNotification(postOwnerId, commenterId, 'comment', { 
    postId, 
    commentText: commentText?.substring(0, 100) 
  });
};

export const createFollowRequestNotification = async (
  targetUserId: string,
  requesterId: string
) => {
  return await createInstagramNotification(targetUserId, requesterId, 'followrequest');
};

export const createFollowAcceptNotification = async (
  requesterId: string,
  accepterId: string
) => {
  return await createInstagramNotification(requesterId, accepterId, 'followaccept');
};
