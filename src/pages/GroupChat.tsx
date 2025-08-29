
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroupMessages, useGroupActions } from '../hooks/useGroupChat';
import ChatHeader from '../components/chat/ChatHeader';
import MessagesList from '../components/chat/MessagesList';
import MessageInput from '../components/chat/MessageInput';
import { DisplayMessage } from '../types/chat';

const GroupChat = () => {
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  
  const { messages, loading } = useGroupMessages(groupId || '');
  const { sendMessage, sending, error } = useGroupActions();

  const onSendMessage = async () => {
    if (!newMessage.trim() || !groupId) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    await sendMessage(groupId, messageText);
  };

  const onSendMedia = async (media: any) => {
    if (!groupId) return;
    
    await sendMessage(
      groupId, 
      media.name, 
      media.type === 'audio' ? 'voice' : media.type,
      media.url
    );
  };

  if (!currentUser || !groupId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid group chat</p>
      </div>
    );
  }

  // Convert group messages to display format
  const displayMessages: DisplayMessage[] = messages.map(msg => {
    let timeString = 'now';
    if (msg.timestamp) {
      if (typeof msg.timestamp === 'number') {
        timeString = new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (msg.timestamp && typeof msg.timestamp === 'object' && 'toDate' in msg.timestamp) {
        timeString = new Date(msg.timestamp.toDate()).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    }

    return {
      id: msg.id,
      text: msg.text,
      time: timeString,
      isOwn: msg.senderId === currentUser?.uid,
      content: msg.mediaURL ? { url: msg.mediaURL, type: msg.type } : undefined,
      type: msg.type,
      status: msg.status,
      seen: msg.seen?.includes(currentUser?.uid || ''),
      delivered: true,
      timestamp: msg.timestamp
    };
  });

  const headerUser = {
    name: `Group Chat`, // This would be the actual group name from group data
    avatar: 'https://ui-avatars.com/api/?name=Group&background=ccc&color=333'
  };

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-gray-900">
      <ChatHeader 
        user={headerUser}
        isOnline={true} 
      />
      
      <MessagesList
        messages={displayMessages}
        typingUsers={[]}
        loading={loading}
        onSharedContent={() => {}}
      />
      
      <MessageInput
        newMessage={newMessage}
        onMessageChange={setNewMessage}
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        disabled={sending}
        error={error}
      />
    </div>
  );
};

export default GroupChat;
