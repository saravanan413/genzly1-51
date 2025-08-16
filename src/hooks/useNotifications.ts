
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToNotifications, 
  markNotificationAsSeen, 
  deleteNotification,
  Notification 
} from '../services/notificationService';

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

    console.log('Setting up notification subscription for user:', currentUser.uid);

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(currentUser.uid, (newNotifications) => {
      console.log('Received notification update:', newNotifications.length, 'notifications');
      
      setNotifications(newNotifications);
      
      // Calculate unread count
      const unseenCount = newNotifications.filter(n => !n.seen).length;
      console.log('Unread count updated to:', unseenCount);
      setUnreadCount(unseenCount);
      
      setLoading(false);
    });

    return () => {
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
        return notification.commentText ? `commented: "${notification.commentText}"` : 'commented on your post';
      case 'follow_request':
        return 'requested to follow you';
      case 'follow_accept':
        return 'accepted your follow request';
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
