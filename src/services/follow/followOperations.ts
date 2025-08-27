
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createFollowRequestNotification, createFollowAcceptNotification, removeInstagramNotification } from '../instagramNotificationService';

export const sendFollowRequest = async (requesterId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Sending follow request:', { requesterId, targetUserId });
    
    // Create follow request document
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', requesterId);
    
    await setDoc(followRequestRef, {
      requesterId,
      targetUserId,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    
    console.log('Follow request created successfully');
    
    // Create notification using the correct type
    await createFollowRequestNotification(targetUserId, requesterId);
    console.log('Follow request notification created');
    
    return true;
  } catch (error) {
    console.error('Error sending follow request:', error);
    return false;
  }
};

export const acceptFollowRequest = async (targetUserId: string, requesterId: string): Promise<boolean> => {
  try {
    console.log('Accepting follow request:', { targetUserId, requesterId });
    
    // Add to followers/following collections
    const followerRef = doc(db, 'users', targetUserId, 'followers', requesterId);
    const followingRef = doc(db, 'users', requesterId, 'following', targetUserId);
    
    await setDoc(followerRef, {
      userId: requesterId,
      timestamp: serverTimestamp()
    });
    
    await setDoc(followingRef, {
      userId: targetUserId,
      timestamp: serverTimestamp()
    });
    
    // Remove the follow request
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', requesterId);
    await deleteDoc(followRequestRef);
    
    console.log('Follow request accepted and relationships created');
    
    // Remove follow request notification and create accept notification
    await removeInstagramNotification(targetUserId, requesterId, 'follow_request');
    await createFollowAcceptNotification(requesterId, targetUserId);
    console.log('Notifications updated for accepted follow request');
    
    return true;
  } catch (error) {
    console.error('Error accepting follow request:', error);
    return false;
  }
};

export const rejectFollowRequest = async (targetUserId: string, requesterId: string): Promise<boolean> => {
  try {
    console.log('Rejecting follow request:', { targetUserId, requesterId });
    
    // Remove the follow request
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', requesterId);
    await deleteDoc(followRequestRef);
    
    console.log('Follow request rejected and removed');
    
    // Remove follow request notification
    await removeInstagramNotification(targetUserId, requesterId, 'follow_request');
    console.log('Follow request notification removed');
    
    return true;
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    return false;
  }
};

export const cancelFollowRequest = async (requesterId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Cancelling follow request:', { requesterId, targetUserId });
    
    // Remove the follow request
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', requesterId);
    await deleteDoc(followRequestRef);
    
    console.log('Follow request cancelled');
    
    // Remove follow request notification
    await removeInstagramNotification(targetUserId, requesterId, 'follow_request');
    console.log('Follow request notification removed');
    
    return true;
  } catch (error) {
    console.error('Error cancelling follow request:', error);
    return false;
  }
};

export const unfollowUser = async (followerId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Unfollowing user:', { followerId, targetUserId });
    
    // Check if there's a pending follow request first
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', followerId);
    const followRequestDoc = await getDoc(followRequestRef);
    
    if (followRequestDoc.exists()) {
      // Cancel the follow request
      console.log('Cancelling follow request instead of unfollowing');
      return await cancelFollowRequest(followerId, targetUserId);
    }
    
    // Remove from followers/following collections
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    
    await deleteDoc(followerRef);
    await deleteDoc(followingRef);
    
    console.log('User unfollowed successfully');
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

export const followUserDirectly = async (followerId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Following user directly (public profile):', { followerId, targetUserId });
    
    // Add to followers/following collections immediately
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    
    await setDoc(followerRef, {
      userId: followerId,
      timestamp: serverTimestamp()
    });
    
    await setDoc(followingRef, {
      userId: targetUserId,
      timestamp: serverTimestamp()
    });
    
    console.log('User followed directly');
    
    // Create follow accept notification (same as accepting a follow request)
    await createFollowAcceptNotification(targetUserId, followerId);
    console.log('Follow notification created');
    
    return true;
  } catch (error) {
    console.error('Error following user directly:', error);
    return false;
  }
};

export const followUser = async (followerId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('Follow user called:', { followerId, targetUserId });
    
    // Get target user's profile to check if private
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    
    if (!targetUserDoc.exists()) {
      console.error('Target user not found');
      return false;
    }
    
    const targetUserData = targetUserDoc.data();
    
    // If private account, send follow request
    if (targetUserData.isPrivate) {
      console.log('Target user is private, sending follow request');
      return await sendFollowRequest(followerId, targetUserId);
    } else {
      // If public account, follow directly
      console.log('Target user is public, following directly');
      return await followUserDirectly(followerId, targetUserId);
    }
  } catch (error) {
    console.error('Error in followUser:', error);
    return false;
  }
};

export const removeFollower = async (currentUserId: string, followerUserId: string): Promise<boolean> => {
  try {
    console.log('Removing follower:', { currentUserId, followerUserId });
    
    // Remove from current user's followers collection
    const followerRef = doc(db, 'users', currentUserId, 'followers', followerUserId);
    
    // Remove from follower's following collection
    const followingRef = doc(db, 'users', followerUserId, 'following', currentUserId);
    
    await deleteDoc(followerRef);
    await deleteDoc(followingRef);
    
    console.log('Follower removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing follower:', error);
    return false;
  }
};
