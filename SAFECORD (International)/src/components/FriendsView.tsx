import { useState, useEffect, useRef } from 'react';
import { UserPlus, MessageSquare, Phone, Search, Users, X, Send, ImagePlus, Check, XCircle, MessageCircle, Settings, Mic, MicOff, Headphones } from 'lucide-react';
import { fn, USE_SUPABASE } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { SafetyBanner } from './SafetyBanner';
import { CupidArrowAnimation } from './CupidArrowAnimation';
import { playNotificationSound } from '../utils/notificationSound';

const VALENTINE_IMAGES = [
  "https://images.unsplash.com/photo-1738979120100-74e80d629265?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1643923328458-632178df1281?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1643312769520-d37c1ff1ffc3?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1670786056253-03def3bf8e3b?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1644745547446-f04a49a3693f?w=200&h=200&fit=crop",
];

const getValentineImage = (username: string) => {
  const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return VALENTINE_IMAGES[sum % VALENTINE_IMAGES.length];
};

interface Friend {
  userId: string;
  username: string;
  unreadCount?: number;
  status?: string;
  customStatus?: string;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  createdAt: string;
  status: string;
}

interface Message {
  id: string;
  fromUserId: string;
  fromUsername: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
}

interface FriendsViewProps {
  currentUserId: string;
  currentUsername: string;
  onStartCall: (friendId: string, friendUsername: string) => void;
}

export function FriendsView({ currentUserId, currentUsername, onStartCall }: FriendsViewProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendError, setAddFriendError] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCupidAnimation, setShowCupidAnimation] = useState(false);
  const [newestMessageId, setNewestMessageId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = USE_SUPABASE ? getSupabaseClient() : null;

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
    const requestInterval = setInterval(fetchFriendRequests, 5000);
    return () => clearInterval(requestInterval);
  }, []);

  // Play notification sound when new friend requests arrive
  useEffect(() => {
    if (friendRequests.length > 0) {
      playNotificationSound();
    }
  }, [friendRequests.length]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages();
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [selectedFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startPolling = () => {
    stopPolling();
    pollingIntervalRef.current = window.setInterval(() => {
      fetchMessages();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(fn(`friend/list/${currentUserId}`));

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFriends(data.friends || []);
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(fn(`friend/requests/${currentUserId}`));

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFriendRequests(data.requests || []);
        }
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(fn('friend/accept'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, requestId })
      });

      if (response.ok) {
        fetchFriendRequests();
        fetchFriends();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await fetch(fn('friend/reject'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, requestId })
      });

      if (response.ok) {
        fetchFriendRequests();
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendUserId: string, friendUsername: string) => {
    if (!confirm(`Are you sure you want to remove ${friendUsername} from your friends?`)) {
      return;
    }

    try {
      const response = await fetch(fn('friend/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, friendUserId })
      });

      const data = await response.json();
      if (data.success) {
        // Clear selected friend if we're removing them
        if (selectedFriend?.userId === friendUserId) {
          setSelectedFriend(null);
        }
        fetchFriends();
      } else {
        alert(data.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    }
  };

  const handleAddFriend = async () => {
    if (!friendUsername.trim() || isAddingFriend) return;

    setIsAddingFriend(true);
    setAddFriendError('');
    setAddFriendSuccess('');

    try {
      const response = await fetch(fn('friend/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, friendUsername: friendUsername.trim() })
      });

      const data = await response.json();
      if (data.success) {
        const addedUsername = friendUsername.trim();
        setFriendUsername('');
        
        if (data.isRequest) {
          setAddFriendSuccess(data.message || `Friend request sent to ${addedUsername}!`);
          fetchFriendRequests();
        } else {
          setAddFriendSuccess(`${addedUsername} added to your friends list!`);
          fetchFriends();
        }
        
        setTimeout(() => {
          setAddFriendSuccess('');
          setShowAddFriend(false);
        }, 3000);
      } else {
        setAddFriendError(data.error || 'Failed to add friend');
      }
    } catch (error) {
      setAddFriendError('Failed to add friend. Please try again.');
      console.error('Error adding friend:', error);
    } finally {
      setIsAddingFriend(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedFriend) return;

    try {
      const response = await fetch(fn(`dm/${currentUserId}/${selectedFriend.userId}`));

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFriend) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const filePath = `message-images/${fileName}`;

      let imageUrl: string | undefined;
      if (USE_SUPABASE && supabase) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('make-b35a818f-call-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload image');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('make-b35a818f-call-photos')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      } else {
        // Fallback: convert to data URL
        imageUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }

      // Send message with image
      const response = await fetch(fn('dm/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUserId,
          toUserId: selectedFriend.userId,
          fromUsername: currentUsername,
          text: newMessage.trim() || '',
          imageUrl: imageUrl
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (imageUrl?: string) => {
    if (!selectedFriend || (!newMessage.trim() && !imageUrl)) return;

    // Trigger Cupid arrow animation
    setShowCupidAnimation(true);

    try {
      const response = await fetch(fn('dm/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUserId, toUserId: selectedFriend.userId, fromUsername: currentUsername, text: newMessage, imageUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messageId) {
          setNewestMessageId(data.messageId);
          // Clear newest message ID after animation completes
          setTimeout(() => setNewestMessageId(null), 600);
        }
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartCall = async () => {
    if (!selectedFriend) return;

    const roomCode = `CALL${Date.now().toString(36).toUpperCase()}`;

    try {
      await fetch(fn('call/initiate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId: currentUserId, callerUsername: currentUsername, receiverId: selectedFriend.userId, roomCode })
      });
    } catch (error) {
      console.error('Error initiating call:', error);
    }

    onStartCall(selectedFriend.userId, selectedFriend.username);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-green-500';
    }
  };

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'online') {
      return matchesSearch && friend.status === 'online';
    }
    return matchesSearch;
  });

  return (
    <>
      {/* Middle Panel - Friends List & DMs */}
      <div className="relative w-60 bg-[#16161f]/95 backdrop-blur-xl flex flex-col border-r border-purple-500/20">
        {/* Search Bar */}
        <div className="p-3 border-b border-purple-500/20">
          <div className="relative">
            <input
              type="text"
              placeholder="Find or start a conversation"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 bg-[#0a0a1f]/80 border border-purple-500/20 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Add Friend Button */}
        <div className="p-3 border-b border-purple-500/20">
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
            {friendRequests.length > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Add Friend Input */}
        {showAddFriend && (
          <div className="p-3 bg-[#0a0a1f]/50 border-b border-purple-500/20">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                className="w-full px-3 py-2 bg-[#0a0a1f]/80 border border-purple-500/20 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500"
              />
              {addFriendError && (
                <p className="text-red-400 text-xs">{addFriendError}</p>
              )}
              {addFriendSuccess && (
                <p className="text-green-400 text-xs">{addFriendSuccess}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAddFriend}
                  disabled={isAddingFriend}
                  className="flex-1 px-3 py-1.5 bg-green-600/30 text-green-200 text-sm rounded-lg hover:bg-green-600/40 transition-all disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddFriend(false);
                    setAddFriendError('');
                    setAddFriendSuccess('');
                    setFriendUsername('');
                  }}
                  className="flex-1 px-3 py-1.5 bg-red-600/30 text-red-200 text-sm rounded-lg hover:bg-red-600/40 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Direct Messages Header */}
        <div className="px-4 py-2 border-b border-purple-500/20 flex-shrink-0">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider">Direct Messages</h3>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto scrollbar-dm">
          {filteredFriends.map((friend) => (
            <button
              key={friend.userId}
              onClick={() => setSelectedFriend(friend)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#1a1a2e]/50 transition-all ${
                selectedFriend?.userId === friend.userId ? 'bg-[#1a1a2e]/80' : ''
              }`}
            >
              <div className="relative">
                <img 
                  src={getValentineImage(friend.username)} 
                  alt={friend.username}
                  className="w-8 h-8 rounded-full object-cover border border-red-500/30"
                />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16161f] ${getStatusColor(friend.status)}`}></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-sm truncate">{friend.username}</p>
                {friend.customStatus && (
                  <p className="text-gray-400 text-xs truncate">{friend.customStatus}</p>
                )}
              </div>
              {friend.unreadCount && friend.unreadCount > 0 && (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">{friend.unreadCount}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* User Info at Bottom */}
        <div className="p-2 bg-[#0a0a1f]/80 border-t border-purple-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={getValentineImage(currentUsername)} 
                alt={currentUsername}
                className="w-8 h-8 rounded-full object-cover border border-green-500/30"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a1f]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{currentUsername}</p>
              <p className="text-gray-400 text-xs">Online</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (isDeafened) {
                    setIsDeafened(false);
                    setIsMuted(false);
                  } else {
                    setIsMuted(!isMuted);
                  }
                }}
                className={`p-1.5 rounded hover:bg-purple-500/20 transition-colors ${isMuted || isDeafened ? 'text-red-400' : 'text-gray-300 hover:text-white'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || isDeafened ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsDeafened(!isDeafened);
                  if (!isDeafened) {
                    setIsMuted(true);
                  }
                }}
                className={`p-1.5 rounded hover:bg-purple-500/20 transition-colors ${isDeafened ? 'text-red-400' : 'text-gray-300 hover:text-white'}`}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                <Headphones className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-purple-500/20 text-gray-300 hover:text-white transition-colors"
                title="User Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Chat or Friends List */}
      <div className="relative flex-1 flex flex-col">
        {selectedFriend ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 bg-[#0a0a1f]/80 backdrop-blur-xl border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={getValentineImage(selectedFriend.username)} 
                    alt={selectedFriend.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-red-500/30 shadow-lg"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a1f] ${getStatusColor(selectedFriend.status)}`}></div>
                </div>
                <div>
                  <h2 className="text-white">{selectedFriend.username}</h2>
                  {selectedFriend.customStatus && (
                    <p className="text-gray-400 text-sm">{selectedFriend.customStatus}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleStartCall}
                className="p-2 bg-green-600/30 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-lg hover:bg-green-600/40 transition-all"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>

            <SafetyBanner />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-messages">
              {messages.map((msg) => {
                const isOwnMessage = msg.fromUserId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <img 
                        src={getValentineImage(msg.fromUsername)} 
                        alt={msg.fromUsername}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-lg"
                      />
                    </div>
                    <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-white ${isOwnMessage ? 'order-2' : ''}`}>
                          {msg.fromUsername}
                        </span>
                        <span className={`text-gray-500 text-xs ${isOwnMessage ? 'order-1' : ''}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl max-w-lg ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                            : 'bg-[#1a1a2e]/80 backdrop-blur-sm border border-purple-500/20 text-white'
                        }`}
                      >
                        {msg.imageUrl && (
                          <div className="mb-2">
                            <img 
                              src={msg.imageUrl} 
                              alt="Shared image" 
                              className="rounded-lg max-w-full max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.imageUrl, '_blank')}
                            />
                          </div>
                        )}
                        {msg.text && <div>{msg.text}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-[#0a0a1f]/80 backdrop-blur-xl border-t border-purple-500/20 relative flex-shrink-0">
              <CupidArrowAnimation 
                isActive={showCupidAnimation} 
                onComplete={() => setShowCupidAnimation(false)} 
              />
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3 py-3 bg-[#16161f]/80 border border-purple-500/20 text-purple-300 rounded-lg hover:bg-[#1a1a2e]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={uploadingImage ? 'Uploading image...' : `Message @${selectedFriend.username}`}
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-3 bg-[#16161f]/80 border border-purple-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim() || uploadingImage}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Friends View Header */}
            <div className="p-4 bg-[#0a0a1f]/80 backdrop-blur-xl border-b border-purple-500/20">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  <span>Friends</span>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('online')}
                    className={`text-sm px-2 py-1 rounded transition-all ${
                      activeTab === 'online' ? 'text-white bg-purple-600/30' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`text-sm px-2 py-1 rounded transition-all ${
                      activeTab === 'all' ? 'text-white bg-purple-600/30' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`text-sm px-2 py-1 rounded transition-all ${
                      activeTab === 'pending' ? 'text-white bg-purple-600/30' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Pending
                    {friendRequests.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {friendRequests.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('blocked')}
                    className={`text-sm px-2 py-1 rounded transition-all ${
                      activeTab === 'blocked' ? 'text-white bg-purple-600/30' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Blocked
                  </button>
                </div>
              </div>
            </div>

            {/* Friends List View */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {activeTab === 'pending' ? (
                  <>
                    {friendRequests.length > 0 ? (
                      friendRequests.map((request) => (
                        <div
                          key={request.id}
                          className="p-4 bg-[#16161f]/60 backdrop-blur-sm border border-purple-500/20 rounded-xl hover:bg-[#1a1a2e]/60 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <span className="text-white">
                                  {request.fromUsername.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white">{request.fromUsername}</p>
                                <p className="text-gray-400 text-sm">Wants to add you as a friend</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptRequest(request.id)}
                                className="p-2 bg-green-600/30 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-lg hover:bg-green-600/40 transition-all"
                                title="Accept"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                className="p-2 bg-red-600/30 backdrop-blur-sm border border-red-500/30 text-red-200 rounded-lg hover:bg-red-600/40 transition-all"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-12">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No pending friend requests</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.userId}
                        className="p-4 bg-[#16161f]/60 backdrop-blur-sm border border-purple-500/20 rounded-xl hover:bg-[#1a1a2e]/60 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <span className="text-white">
                                  {friend.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#16161f] ${getStatusColor(friend.status)}`}></div>
                            </div>
                            <div>
                              <p className="text-white">{friend.username}</p>
                              {friend.customStatus && (
                                <p className="text-gray-400 text-sm">{friend.customStatus}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedFriend(friend)}
                              className="p-2 bg-purple-600/30 backdrop-blur-sm border border-purple-500/30 text-purple-200 rounded-lg hover:bg-purple-600/40 transition-all"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFriend(friend);
                                setTimeout(handleStartCall, 100);
                              }}
                              className="p-2 bg-green-600/30 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-lg hover:bg-green-600/40 transition-all"
                            >
                              <Phone className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFriend(friend.userId, friend.username);
                              }}
                              className="p-2 bg-red-600/30 backdrop-blur-sm border border-red-500/30 text-red-200 rounded-lg hover:bg-red-600/40 transition-all"
                              title="Remove Friend"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredFriends.length === 0 && (
                      <div className="text-center text-gray-400 py-12">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No friends yet</p>
                        <p className="text-sm mt-1">Click "Add Friend" to get started!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar - Active Now */}
      <div className="relative w-64 bg-[#16161f]/95 backdrop-blur-xl border-l border-purple-500/20 p-4">
        <h3 className="text-white mb-4">Active Now</h3>
        <div className="space-y-3">
          {friends.filter(f => f.status === 'online').slice(0, 5).map((friend) => (
            <div key={friend.userId} className="p-3 bg-[#1a1a2e]/50 rounded-lg border border-purple-500/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm">
                      {friend.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#16161f]"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{friend.username}</p>
                  <p className="text-gray-400 text-xs">Online</p>
                </div>
              </div>
              {friend.customStatus && (
                <p className="text-gray-400 text-xs mt-2 truncate">{friend.customStatus}</p>
              )}
            </div>
          ))}
          {friends.filter(f => f.status === 'online').length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No one is currently active</p>
          )}
        </div>
      </div>
    </>
  );
}