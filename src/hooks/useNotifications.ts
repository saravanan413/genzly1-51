import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToNotifications, 
  markNotificationAsSeen, 
  deleteNotification,
  Notification 
} from '../services/notifications';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('No current user, clearing notifications');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log('=== SETTING UP NOTIFICATION SUBSCRIPTION ===');
    console.log('Setting up notification subscription for user:', currentUser.uid);
    console.log('Listening to path: users/' + currentUser.uid + '/notifications/data/items');

    // Subscribe to real-time notifications from the correct path (5 segments)
    const unsubscribe = subscribeToNotifications(currentUser.uid, (newNotifications) => {
      console.log('=== NOTIFICATION UPDATE RECEIVED ===');
      console.log('Received notification update:', newNotifications.length, 'notifications');
      
      // Log each notification for debugging
      newNotifications.forEach((notification, index) => {
        console.log(`Notification ${index + 1}:`, {
          type: notification.type,
          fromUser: notification.fromUsername,
          seen: notification.seen,
          timestamp: notification.timestamp,
          from: notification.from,
          fromUserId: notification.fromUserId
        });
      });
      
      // Filter notifications to ensure they're for the current user
      const userNotifications = newNotifications.filter(n => 
        (n.receiverId === currentUser.uid) || (!n.receiverId && n.from) || (!n.receiverId && n.fromUserId)
      );
      
      console.log('Filtered notifications for current user:', userNotifications.length);
      
      setNotifications(userNotifications);
      
      // Calculate unread count
      const unseenCount = userNotifications.filter(n => !n.seen).length;
      console.log('Unread count updated to:', unseenCount);
      setUnreadCount(unseenCount);
      
      setLoading(false);
    });

    return () => {
      console.log('=== CLEANING UP NOTIFICATION SUBSCRIPTION ===');
      console.log('Cleaning up notification subscription for user:', currentUser.uid);
      unsubscribe();
    };
  }, [currentUser?.uid]);

  const markAsSeen = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Marking notification as seen:', notificationId);
      await markNotificationAsSeen(currentUser.uid, notificationId);
      console.log('Notification marked as seen successfully');
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  };

  const markAllAsSeen = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const unseenNotifications = notifications.filter(n => !n.seen);
      console.log('Marking all notifications as seen:', unseenNotifications.length, 'notifications');
      
      // Mark all unseen notifications as seen
      await Promise.all(
        unseenNotifications.map(notification => 
          markNotificationAsSeen(currentUser.uid, notification.id)
        )
      );
      
      console.log('All notifications marked as seen successfully');
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
    }
  };

  const deleteNotificationById = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Deleting notification:', notificationId);
      await deleteNotification(currentUser.uid, notificationId);
      console.log('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationMessage = (notification: Notification): string => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return notification.text ? `commented: "${notification.text}"` : 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'follow_request':
        return 'requested to follow you';
      case 'message':
        return 'sent you a message';
      default:
        return 'interacted with your content';
    }
  };

  const getRelativeTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const now = new Date();
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsSeen,
    markAllAsSeen,
    deleteNotificationById,
    getNotificationMessage,
    getRelativeTime
  };
};
