import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatHeader from '../components/chat/ChatHeader';
import ChatList from '../components/chat/ChatList';
import NotesBar from '../components/chat/NotesBar';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToUserChatList, 
  ChatListItem, 
  clearCachedChatList 
} from '../services/chat/chatListService';
import { logger } from '../utils/logger';
import { Plus } from 'lucide-react';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import { useGroupChat } from '../hooks/useGroupChat';

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [likedChats, setLikedChats] = useState<string[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { userGroups } = useGroupChat();

  // Subscribe to user's chat list with real-time updates and caching
  useEffect(() => {
    // Wait for auth to be initialized
    if (authLoading) {
      return;
    }

    if (!currentUser?.uid) {
      logger.debug('No current user, clearing chat list');
      setLoading(false);
      setError(null);
      setChatList([]);
      setIsFromCache(false);
      return;
    }

    logger.debug('Setting up chat list with caching', { userId: currentUser.uid });
    setLoading(true);
    setError(null);
    
    try {
      const unsubscribe = subscribeToUserChatList(currentUser.uid, (chats, fromCache) => {
        logger.debug('Chat list update received', { 
          chatCount: chats.length, 
          fromCache 
        });
        
        // Always update the full chat list (don't append, replace completely)
        setChatList(chats);
        setIsFromCache(fromCache);
        
        // Only set loading to false after we get live data or if no cache exists
        if (!fromCache || chats.length === 0) {
          setLoading(false);
        }
        
        setError(null);
      });

      return () => {
        logger.debug('Cleaning up chat list subscription');
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      logger.error('Failed to set up chat list subscription', err);
      setError('Failed to load chat list');
      setLoading(false);
    }
  }, [currentUser?.uid, authLoading]);

  // Clean up cache on logout
  useEffect(() => {
    if (!currentUser && !authLoading) {
      logger.debug('User logged out, clearing chat cache');
      clearCachedChatList();
    }
  }, [currentUser, authLoading]);

  const handleDoubleTap = (receiverId: string) => {
    if (!likedChats.includes(receiverId)) {
      setLikedChats(prev => [...prev, receiverId]);
      setTimeout(() => {
        setLikedChats(prev => prev.filter(id => id !== receiverId));
      }, 2000);
    }
  };

  const handleChatClick = (receiverId: string) => {
    logger.debug('Opening chat', { receiverId });
    navigate(`/chat/${receiverId}`);
  };

  const handleNewChat = () => {
    navigate('/explore');
  };

  const handleGroupCreated = (groupId: string) => {
    logger.debug('Group created, navigating to group chat', { groupId });
    navigate(`/group/${groupId}`);
  };

  // Convert ChatListItem to ChatPreview format expected by ChatList component
  const chatPreviews = chatList.map(chat => ({
    chatId: chat.chatId,
    otherUser: {
      id: chat.receiverId,
      username: chat.username,
      displayName: chat.displayName,
      avatar: chat.avatar
    },
    lastMessage: chat.lastMessage ? {
      text: chat.lastMessage,
      timestamp: chat.timestamp,
      senderId: chat.receiverId,
      seen: chat.seen
    } : null,
    unreadCount: chat.seen ? 0 : 1
  }));

  // Convert both individual chats and group chats to unified format
  const allChats = [
    ...chatPreviews,
    ...userGroups.map(group => ({
      chatId: group.id,
      otherUser: {
        id: group.id,
        username: group.name,
        displayName: group.name,
        avatar: group.avatar
      },
      lastMessage: group.lastMessage ? {
        text: group.lastMessage.text,
        timestamp: group.lastMessage.timestamp?.toDate?.()?.getTime() || Date.now(),
        senderId: group.lastMessage.senderId,
        seen: group.lastMessage.seen
      } : null,
      unreadCount: 0,
      isGroup: true
    }))
  ].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });

  // Filter chats (including groups) based on search query
  const filteredChats = allChats.filter(chat =>
    chat.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading only if we're still loading auth or if we have no cache and no data
  const showLoading = authLoading || (loading && !isFromCache);

  if (authLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Please log in to view your chats.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 md:p-6 w-full bg-background dark:bg-gray-900">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full bg-background dark:bg-gray-900">
        <div className="w-full max-w-2xl mx-auto">
          <div className="p-4 md:p-6">
            {/* Updated ChatHeader with group button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Messages</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                  title="Create Group Chat"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNewChat}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  New Chat
                </button>
              </div>
            </div>
          </div>
          
          {/* Notes Bar */}
          <NotesBar />
          
          <div className="p-4 md:p-6">
            {/* Cache indicator for debugging */}
            {isFromCache && !loading && (
              <div className="mb-2 text-xs text-muted-foreground text-center">
                Showing cached chats ({chatList.length}) • Syncing...
              </div>
            )}
            
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 placeholder-gray-500"
                />
              </div>
            </div>

            <ChatList
              chatPreviews={filteredChats}
              loading={showLoading}
              searchQuery={searchQuery}
              currentUserId={currentUser?.uid || ''}
              onChatClick={(receiverId) => {
                const chat = allChats.find(c => c.otherUser.id === receiverId);
                if (chat?.isGroup) {
                  navigate(`/group/${receiverId}`);
                } else {
                  handleChatClick(receiverId);
                }
              }}
              onDoubleTap={handleDoubleTap}
            />
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={handleGroupCreated}
      />
    </Layout>
  );
};

export default Chat;
