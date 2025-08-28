
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  createFollowRequestNotification, 
  createFollowAcceptNotification,
  removeUnifiedNotification 
} from '../unifiedNotificationService';

export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Following user', targetUserId, 'by', currentUserId);

    if (!currentUserId || !targetUserId) {
      throw new Error('Missing user IDs');
    }

    if (currentUserId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if target user is private - if so, send follow request instead
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    if (targetUserDoc.exists() && targetUserDoc.data().isPrivate) {
      return await sendFollowRequest(currentUserId, targetUserId);
    }

    // Add to current user's following
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    await setDoc(followingRef, {
      followedId: targetUserId,
      timestamp: serverTimestamp()
    });

    // Add to target user's followers
    const followerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    await setDoc(followerRef, {
      followerId: currentUserId,
      timestamp: serverTimestamp()
    });

    // Update counts
    await updateDoc(doc(db, 'users', currentUserId), {
      followingCount: increment(1)
    });

    await updateDoc(doc(db, 'users', targetUserId), {
      followersCount: increment(1)
    });

    console.log('User followed successfully');
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
};

export const sendFollowRequest = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Sending follow request from', currentUserId, 'to', targetUserId);

    if (!currentUserId || !targetUserId) {
      throw new Error('Missing user IDs');
    }

    if (currentUserId === targetUserId) {
      throw new Error('Cannot send follow request to yourself');
    }

    // Add follow request to target user's collection
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
    await setDoc(followRequestRef, {
      requesterId: currentUserId,
      timestamp: serverTimestamp(),
      status: 'pending'
    });

    console.log('Follow request document created successfully');

    // Create unified notification - this is the critical part that was missing proper error handling
    try {
      console.log('Creating follow request notification for user:', targetUserId, 'from:', currentUserId);
      const notificationId = await createFollowRequestNotification(targetUserId, currentUserId);
      console.log('Follow request notification created with ID:', notificationId);
    } catch (notificationError) {
      console.error('Failed to create follow request notification:', notificationError);
      // Don't fail the entire operation if notification fails
      // The follow request is still valid even if notification fails
    }

    console.log('Follow request sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending follow request:', error);
    return false;
  }
};

export const acceptFollowRequest = async (currentUserId: string, requesterId: string): Promise<boolean> => {
  try {
    console.log('Accepting follow request from', requesterId, 'by', currentUserId);

    if (!currentUserId || !requesterId) {
      throw new Error('Missing user IDs');
    }

    // Remove the follow request
    const followRequestRef = doc(db, 'users', currentUserId, 'followRequests', requesterId);
    await deleteDoc(followRequestRef);

    // Add requester to current user's followers
    const followerRef = doc(db, 'users', currentUserId, 'followers', requesterId);
    await setDoc(followerRef, {
      followerId: requesterId,
      timestamp: serverTimestamp()
    });

    // Add current user to requester's following
    const followingRef = doc(db, 'users', requesterId, 'following', currentUserId);
    await setDoc(followingRef, {
      followedId: currentUserId,
      timestamp: serverTimestamp()
    });

    // Update follower/following counts
    await updateDoc(doc(db, 'users', currentUserId), {
      followersCount: increment(1)
    });

    await updateDoc(doc(db, 'users', requesterId), {
      followingCount: increment(1)
    });

    // Remove follow request notification and create follow accept notification
    await removeUnifiedNotification(currentUserId, requesterId, 'follow_request');
    await createFollowAcceptNotification(requesterId, currentUserId);

    console.log('Follow request accepted successfully');
    return true;
  } catch (error) {
    console.error('Error accepting follow request:', error);
    return false;
  }
};

export const rejectFollowRequest = async (currentUserId: string, requesterId: string): Promise<boolean> => {
  try {
    console.log('Rejecting follow request from', requesterId, 'by', currentUserId);

    if (!currentUserId || !requesterId) {
      throw new Error('Missing user IDs');
    }

    // Remove the follow request
    const followRequestRef = doc(db, 'users', currentUserId, 'followRequests', requesterId);
    await deleteDoc(followRequestRef);

    // Remove follow request notification
    await removeUnifiedNotification(currentUserId, requesterId, 'follow_request');

    console.log('Follow request rejected successfully');
    return true;
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    return false;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Unfollowing user', targetUserId, 'by', currentUserId);

    if (!currentUserId || !targetUserId) {
      throw new Error('Missing user IDs');
    }

    // Check if it's a follow request that needs to be cancelled
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
    const followRequestDoc = await getDoc(followRequestRef);
    
    if (followRequestDoc.exists()) {
      // Cancel follow request
      await deleteDoc(followRequestRef);
      console.log('Follow request cancelled successfully');
      return true;
    }

    // Remove from current user's following
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    await deleteDoc(followingRef);

    // Remove from target user's followers
    const followerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    await deleteDoc(followerRef);

    // Update counts
    await updateDoc(doc(db, 'users', currentUserId), {
      followingCount: increment(-1)
    });

    await updateDoc(doc(db, 'users', targetUserId), {
      followersCount: increment(-1)
    });

    console.log('User unfollowed successfully');
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

export const removeFollower = async (currentUserId: string, followerUserId: string): Promise<boolean> => {
  try {
    console.log('Removing follower', followerUserId, 'from', currentUserId);

    if (!currentUserId || !followerUserId) {
      throw new Error('Missing user IDs');
    }

    // Remove from current user's followers
    const followerRef = doc(db, 'users', currentUserId, 'followers', followerUserId);
    await deleteDoc(followerRef);

    // Remove from follower's following
    const followingRef = doc(db, 'users', followerUserId, 'following', currentUserId);
    await deleteDoc(followingRef);

    // Update counts
    await updateDoc(doc(db, 'users', currentUserId), {
      followersCount: increment(-1)
    });

    await updateDoc(doc(db, 'users', followerUserId), {
      followingCount: increment(-1)
    });

    console.log('Follower removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing follower:', error);
    return false;
  }
};

export const cancelFollowRequest = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Cancelling follow request from', currentUserId, 'to', targetUserId);

    if (!currentUserId || !targetUserId) {
      throw new Error('Missing user IDs');
    }

    // Remove the follow request from the target user's followRequests collection
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
    await deleteDoc(followRequestRef);

    console.log('Follow request cancelled successfully');
    return true;
  } catch (error) {
    console.error('Error cancelling follow request:', error);
    return false;
  }
};
