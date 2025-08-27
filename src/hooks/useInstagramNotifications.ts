
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToInstagramNotifications, 
  markInstagramNotificationAsSeen, 
  markAllInstagramNotificationsAsSeen,
  deleteInstagramNotification,
  InstagramNotification 
} from '../services/instagramNotificationService';

export const useInstagramNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<InstagramNotification[]>([]);
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

    console.log('Setting up Instagram notification subscription for user:', currentUser.uid);

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToInstagramNotifications(currentUser.uid, (newNotifications) => {
      console.log('Received Instagram notification update:', newNotifications.length, 'notifications');
      
      setNotifications(newNotifications);
      
      // Calculate unread count
      const unseenCount = newNotifications.filter(n => !n.seen).length;
      console.log('Unread count updated to:', unseenCount);
      setUnreadCount(unseenCount);
      
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up Instagram notification subscription for user:', currentUser.uid);
      unsubscribe();
    };
  }, [currentUser?.uid]);

  const markAsSeen = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Marking Instagram notification as seen:', notificationId);
      await markInstagramNotificationAsSeen(currentUser.uid, notificationId);
      console.log('Instagram notification marked as seen successfully');
    } catch (error) {
      console.error('Error marking Instagram notification as seen:', error);
    }
  };

  const markAllAsSeen = async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Marking all Instagram notifications as seen');
      await markAllInstagramNotificationsAsSeen(currentUser.uid);
      console.log('All Instagram notifications marked as seen successfully');
    } catch (error) {
      console.error('Error marking all Instagram notifications as seen:', error);
    }
  };

  const deleteNotificationById = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Deleting Instagram notification:', notificationId);
      await deleteInstagramNotification(currentUser.uid, notificationId);
      console.log('Instagram notification deleted successfully');
    } catch (error) {
      console.error('Error deleting Instagram notification:', error);
    }
  };

  const getNotificationMessage = (notification: InstagramNotification): string => {
    const count = notification.aggregatedCount || 1;
    const hasMultiple = count > 1;
    
    switch (notification.type) {
      case 'like':
        if (hasMultiple) {
          const others = count - 1;
          return `and ${others} other${others === 1 ? '' : 's'} liked your post`;
        }
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
