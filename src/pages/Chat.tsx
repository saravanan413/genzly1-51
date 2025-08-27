
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatHeader from '../components/chat/ChatHeader';
import ChatList from '../components/chat/ChatList';
import NotesBar from '../components/chat/NotesBar';
import { useAuth } from '../contexts/AuthContext';
import { useUserChats } from '../hooks/useUserChats';
import { logger } from '../utils/logger';

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [likedChats, setLikedChats] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { userChats, loading } = useUserChats();

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

  // Convert UserChatData to ChatPreview format expected by ChatList component
  const chatPreviews = userChats.map(chat => ({
    chatId: chat.chatId,
    otherUser: {
      id: chat.otherUserId,
      username: chat.otherUserDisplayName,
      displayName: chat.otherUserDisplayName,
      avatar: chat.otherUserAvatar
    },
    lastMessage: chat.lastMessage ? {
      text: chat.lastMessage,
      timestamp: chat.timestamp?.toDate?.()?.getTime() || Date.now(),
      senderId: '', // We don't store this in userChats, but it's not needed for display
      seen: chat.seen
    } : null,
    unreadCount: chat.seen ? 0 : 1
  }));

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

  return (
    <Layout>
      <div className="w-full bg-background dark:bg-gray-900">
        <div className="w-full max-w-2xl mx-auto">
          <div className="p-4 md:p-6">
            <ChatHeader onNewChat={handleNewChat} />
          </div>
          
          <NotesBar />
          
          <div className="p-4 md:p-6">
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
              chatPreviews={chatPreviews}
              loading={loading}
              searchQuery={searchQuery}
              currentUserId={currentUser.uid}
              onChatClick={handleChatClick}
              onDoubleTap={handleDoubleTap}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
