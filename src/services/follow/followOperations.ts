import { 
  doc, 
  writeBatch,
  serverTimestamp,
  getDoc,
  deleteDoc,
  setDoc,
  collection
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createInstagramNotification, removeInstagramNotification } from '../instagramNotificationService';

export const followUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    console.log('Cannot follow yourself');
    return false;
  }

  try {
    console.log('=== STARTING FOLLOW OPERATION ===');
    console.log('Current user:', currentUserId);
    console.log('Target user:', targetUserId);
    
    // Get user profiles first to ensure they exist
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId))
    ]);
    
    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      console.error('User documents not found');
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    console.log('Target user privacy setting:', { isPrivate: targetUserData.isPrivate });

    // Check if target user has private account
    if (targetUserData.isPrivate === true) {
      console.log('=== TARGET USER HAS PRIVATE ACCOUNT ===');
      console.log('Sending follow request...');
      
      // Create follow request document at /users/{targetUserId}/followRequests/{currentUserId}
      const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
      await setDoc(followRequestRef, {
        from: currentUserId,
        to: targetUserId,
        uid: currentUserId,
        username: currentUserData.username || 'Unknown',
        displayName: currentUserData.displayName || 'Unknown User',
        avatar: currentUserData.avatar || null,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      
      console.log('Follow request document created');
      
      // Create Instagram-style notification for follow request
      console.log('Creating Instagram-style follow request notification...');
      console.log('Notification params:', {
        targetUserId: targetUserId,
        currentUserId: currentUserId,
        type: 'followrequest'
      });
      
      try {
        const notificationId = await createInstagramNotification(
          targetUserId,   // receiverId - person who will receive the notification
          currentUserId,  // senderId - person sending the follow request
          'followrequest' // Updated to match Firestore rules
        );
        console.log('Instagram-style follow request notification created successfully with ID:', notificationId);
      } catch (error) {
        console.error('Error creating Instagram-style follow request notification:', error);
        console.error('This might be a Firestore rule issue. Check:');
        console.error('1. Current user authentication');
        console.error('2. Firestore rules for notifications');
        console.error('3. Document path structure');
        // Don't fail the follow request if notification creation fails
      }
      
      return true;
    }

    console.log('=== PUBLIC ACCOUNT FOLLOW ===');
    console.log('User data loaded, proceeding with public follow operation');

    // Use batch write for atomic operations
    const batch = writeBatch(db);

    // Create document at /users/{targetUserId}/followers/{currentUserId}
    const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    batch.set(followersRef, {
      uid: currentUserId,
      username: currentUserData.username || 'Unknown',
      displayName: currentUserData.displayName || 'Unknown User',
      avatar: currentUserData.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Create document at /users/{currentUserId}/following/{targetUserId}
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    batch.set(followingRef, {
      uid: targetUserId,
      username: targetUserData.username || 'Unknown',
      displayName: targetUserData.displayName || 'Unknown User',
      avatar: targetUserData.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    await batch.commit();
    console.log('Batch commit successful');
    
    // For public follows, create a follow_accept notification since it's automatically accepted
    try {
      const notificationId = await createInstagramNotification(
        currentUserId, 
        targetUserId, 
        'followaccept' // Updated to match Firestore rules
      );
      console.log('Follow accept notification created with ID:', notificationId);
    } catch (error) {
      console.error('Error creating follow accept notification:', error);
      // Don't fail the follow if notification creation fails
    }
    
    console.log('Public follow operation completed successfully');
    return true;
  } catch (error: any) {
    console.error('=== ERROR IN FOLLOW OPERATION ===');
    console.error('Error:', error);
    return false;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    console.error('Cannot unfollow yourself');
    return false;
  }

  try {
    console.log('Starting unfollow operation:', { currentUserId, targetUserId });
    
    // First, try to cancel any pending follow request
    console.log('Attempting to cancel follow request...');
    const followRequestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
    const followRequestDoc = await getDoc(followRequestRef);
    
    if (followRequestDoc.exists()) {
      console.log('Found pending follow request, deleting...');
      await deleteDoc(followRequestRef);
      
      // Remove Instagram-style follow request notification
      try {
        await removeInstagramNotification(targetUserId, currentUserId, 'followrequest');
        console.log('Follow request notification removed');
      } catch (error) {
        console.error('Error removing follow request notification:', error);
      }
      
      console.log('Follow request cancelled successfully');
      return true;
    }
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    
    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    // Delete from followers if it exists
    if (followersDoc.exists()) {
      console.log('Adding followers deletion to batch');
      batch.delete(followersRef);
      hasOperations = true;
    }
    
    // Delete from following if it exists
    if (followingDoc.exists()) {
      console.log('Adding following deletion to batch');
      batch.delete(followingRef);
      hasOperations = true;
    }

    if (hasOperations) {
      console.log('Committing batch operations...');
      await batch.commit();
      console.log('Unfollow operation completed successfully');
    } else {
      console.log('No follow relationship found to remove');
    }
    
    return true;
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

export const acceptFollowRequest = async (currentUserId: string, requesterUserId: string) => {
  try {
    console.log('=== ACCEPTING FOLLOW REQUEST ===');
    console.log('Current user (accepting):', currentUserId);
    console.log('Requester:', requesterUserId);
    
    // Get user profiles
    const [currentUserDoc, requesterUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', requesterUserId))
    ]);

    if (!currentUserDoc.exists() || !requesterUserDoc.exists()) {
      console.error('User documents not found');
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const requesterUserData = requesterUserDoc.data();

    // Use batch write for atomic operations
    const batch = writeBatch(db);

    // Create follower relationship
    const followersRef = doc(db, 'users', currentUserId, 'followers', requesterUserId);
    batch.set(followersRef, {
      uid: requesterUserId,
      username: requesterUserData.username || 'Unknown',
      displayName: requesterUserData.displayName || 'Unknown User',
      avatar: requesterUserData.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Create following relationship
    const followingRef = doc(db, 'users', requesterUserId, 'following', currentUserId);
    batch.set(followingRef, {
      uid: currentUserId,
      username: currentUserData.username || 'Unknown',
      displayName: currentUserData.displayName || 'Unknown User',
      avatar: currentUserData.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Delete the follow request
    const followRequestRef = doc(db, 'users', currentUserId, 'followRequests', requesterUserId);
    batch.delete(followRequestRef);

    await batch.commit();
    console.log('Follow request accepted successfully');

    // Remove follow request notification and create follow accept notification
    try {
      await removeInstagramNotification(currentUserId, requesterUserId, 'followrequest');
      console.log('Follow request notification removed');
      
      const notificationId = await createInstagramNotification(requesterUserId, currentUserId, 'followaccept');
      console.log('Follow accept notification created with ID:', notificationId);
    } catch (error) {
      console.error('Error handling notifications during follow accept:', error);
    }

    return true;
  } catch (error: any) {
    console.error('Error accepting follow request:', error);
    return false;
  }
};

export const rejectFollowRequest = async (currentUserId: string, requesterUserId: string) => {
  try {
    console.log('=== REJECTING FOLLOW REQUEST ===');
    console.log('Current user (rejecting):', currentUserId);
    console.log('Requester:', requesterUserId);
    
    // Delete the follow request
    const followRequestRef = doc(db, 'users', currentUserId, 'followRequests', requesterUserId);
    await deleteDoc(followRequestRef);
    
    // Remove Instagram-style follow request notification
    try {
      await removeInstagramNotification(currentUserId, requesterUserId, 'followrequest');
      console.log('Follow request notification removed');
    } catch (error) {
      console.error('Error removing follow request notification:', error);
    }
    
    console.log('Follow request rejected successfully');
    return true;
  } catch (error: any) {
    console.error('Error rejecting follow request:', error);
    return false;
  }
};

export const removeFollower = async (currentUserId: string, followerUserId: string) => {
  if (currentUserId === followerUserId) {
    console.error('Cannot remove yourself as follower');
    return false;
  }

  try {
    console.log('Starting remove follower operation:', { currentUserId, followerUserId });
    console.log('Current user (who is removing):', currentUserId);
    console.log('Follower user (being removed):', followerUserId);
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', currentUserId, 'followers', followerUserId);
    const followingRef = doc(db, 'users', followerUserId, 'following', currentUserId);
    
    console.log('Document references:');
    console.log('Followers ref path:', followersRef.path);
    console.log('Following ref path:', followingRef.path);

    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    console.log('Document existence check results:');
    console.log('Followers doc exists:', followersDoc.exists());
    console.log('Following doc exists:', followingDoc.exists());

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    // Remove from current user's followers collection if it exists
    if (followersDoc.exists()) {
      console.log('Adding followers deletion to batch');
      batch.delete(followersRef);
      hasOperations = true;
    }
    
    // Remove from follower's following collection if it exists
    if (followingDoc.exists()) {
      console.log('Adding following deletion to batch');
      batch.delete(followingRef);
      hasOperations = true;
    }

    if (hasOperations) {
      console.log('Committing batch operations...');
      await batch.commit();
      console.log('Remove follower operation completed successfully');
      return true;
    } else {
      console.log('No follower relationship found to remove');
      return true; // Not an error - they weren't following anyway
    }
  } catch (error) {
    console.error('Error removing follower:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};
