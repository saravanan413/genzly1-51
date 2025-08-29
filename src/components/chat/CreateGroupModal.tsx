
import React, { useState } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createGroupChat } from '../../services/chat/groupService';
import { getUserProfile } from '../../services/chat/userService';
import { logger } from '../../utils/logger';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { currentUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1); // 1: Group info, 2: Add members

  // Mock search function - in real app, this would search your users collection
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // This is a mock - replace with actual user search
    const mockUsers: User[] = [
      { id: 'user1', username: 'john_doe', displayName: 'John Doe', avatar: '' },
      { id: 'user2', username: 'jane_smith', displayName: 'Jane Smith', avatar: '' },
      { id: 'user3', username: 'bob_wilson', displayName: 'Bob Wilson', avatar: '' },
    ];

    const filtered = mockUsers.filter(user =>
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.displayName.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
  };

  const toggleMember = (user: User) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === user.id);
      if (exists) {
        return prev.filter(m => m.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim() || selectedMembers.length === 0) return;

    setCreating(true);

    try {
      const memberIds = selectedMembers.map(m => m.id);
      const groupId = await createGroupChat(
        groupName.trim(),
        groupDescription.trim(),
        memberIds,
        currentUser.uid
      );

      logger.debug('Group created successfully', { groupId });
      onGroupCreated(groupId);
      onClose();
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setStep(1);
    } catch (error) {
      logger.error('Failed to create group', error);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {step === 1 ? 'New Group' : 'Add Members'}
          </h2>
          <button
            onClick={step === 1 ? () => setStep(2) : handleCreateGroup}
            disabled={step === 1 ? !groupName.trim() : selectedMembers.length === 0 || creating}
            className="px-4 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 1 ? 'Next' : creating ? 'Creating...' : 'Create'}
          </button>
        </div>

        {/* Step 1: Group Info */}
        {step === 1 && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder-gray-500"
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <textarea
                placeholder="Description (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-none outline-none resize-none placeholder-gray-500"
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
        )}

        {/* Step 2: Add Members */}
        {step === 2 && (
          <div className="flex flex-col h-96">
            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-2">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      <span>{member.displayName}</span>
                      <button
                        onClick={() => toggleMember(member)}
                        className="hover:bg-primary/20 rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-none outline-none"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.map(user => {
                const isSelected = selectedMembers.find(m => m.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user)}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=ccc&color=333`}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;
