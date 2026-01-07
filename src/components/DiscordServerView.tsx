import { useState, useEffect, useRef } from 'react';
import { Hash, Volume2, Users, Settings, ChevronDown, ChevronRight, Plus, UserPlus, Shield, Bell, Search, AtSign, Smile, Gift, Send, ImagePlus, Pin, Trash2, MoreVertical, Crown, Star, Heart, X } from 'lucide-react';
import { fn, USE_SUPABASE } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { CupidArrowAnimation } from './CupidArrowAnimation';

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

interface Server {
  code: string;
  name: string;
  joinedAt: string;
}

interface ServerDetails {
  code: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  members: Member[];
  channels: Channel[];
}

interface Member {
  userId: string;
  username: string;
  joinedAt: string;
  rank?: number;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'stage';
  category?: string;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  reactions?: { emoji: string; users: string[]; count: number }[];
}

interface DiscordServerViewProps {
  currentUserId: string;
  currentUsername: string;
  servers: Server[];
  onCreateServer: () => void;
  onJoinServer: () => void;
}

export function DiscordServerView({ 
  currentUserId, 
  currentUsername, 
  servers,
  onCreateServer,
  onJoinServer
}: DiscordServerViewProps) {
  const [selectedServer, setSelectedServer] = useState<ServerDetails | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['TEXT CHANNELS', 'VOICE CHANNELS']));
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'overview' | 'roles' | 'moderation' | 'integrations'>('overview');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCupidAnimation, setShowCupidAnimation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = USE_SUPABASE ? getSupabaseClient() : null;

  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      loadServerDetails(servers[0].code);
    }
  }, [servers]);

  useEffect(() => {
    if (selectedServer) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedServer, selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadServerDetails = async (serverCode: string) => {
    try {
      const response = await fetch(fn(`server/details/${serverCode}/${currentUserId}`));
      const data = await response.json();
      if (data.success) {
        setSelectedServer(data.server);
      }
    } catch (error) {
      console.error('Error loading server details:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedServer) return;
    try {
      const response = await fetch(fn(`message/list/${selectedServer.code}/${selectedChannel}`));
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedServer) return;

    setShowCupidAnimation(true);

    try {
      const response = await fetch(fn('message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, channelName: selectedChannel, userId: currentUserId, username: currentUsername, text: message })
      });
      if (response.ok) {
        setMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedServer) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const filePath = `message-images/${fileName}`;

      let imageUrl: string | undefined;
      if (USE_SUPABASE && supabase) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('make-b35a818f-call-photos')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload image');
          return;
        }

        const { data: urlData } = supabase.storage.from('make-b35a818f-call-photos').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      } else {
        imageUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }

      const response = await fetch(fn('message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, channelName: selectedChannel, userId: currentUserId, username: currentUsername, text: message.trim() || '', imageUrl })
      });

      if (response.ok) {
        setMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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

  const getRankIcon = (rank?: number) => {
    if (rank === 5) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (rank === 4) return <Star className="w-4 h-4 text-purple-400" />;
    if (rank === 3) return <Shield className="w-4 h-4 text-blue-400" />;
    return null;
  };

  const getRankColor = (rank?: number) => {
    if (rank === 5) return 'text-yellow-400';
    if (rank === 4) return 'text-purple-400';
    if (rank === 3) return 'text-blue-400';
    if (rank === 2) return 'text-green-400';
    return 'text-gray-400';
  };

  // Group channels by category
  const channelsByCategory: Record<string, Channel[]> = {
    'TEXT CHANNELS': [],
    'VOICE CHANNELS': [],
    'STAGE CHANNELS': []
  };

  selectedServer?.channels.forEach(channel => {
    if (channel.type === 'text') {
      channelsByCategory['TEXT CHANNELS'].push(channel);
    } else if (channel.type === 'voice') {
      channelsByCategory['VOICE CHANNELS'].push(channel);
    } else if (channel.type === 'stage') {
      channelsByCategory['STAGE CHANNELS'].push(channel);
    }
  });

  // Sort members by rank
  const sortedMembers = [...(selectedServer?.members || [])].sort((a, b) => {
    const rankA = a.rank || 0;
    const rankB = b.rank || 0;
    return rankB - rankA;
  });

  const membersByRole = {
    'Owner & Co-Owner': sortedMembers.filter(m => m.rank === 5),
    'Admins': sortedMembers.filter(m => m.rank === 4),
    'Moderators': sortedMembers.filter(m => m.rank === 3),
    'Testers': sortedMembers.filter(m => m.rank === 2),
    'Members': sortedMembers.filter(m => !m.rank || m.rank === 1)
  };

  if (!selectedServer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No server selected</p>
          <div className="flex gap-3">
            <button
              onClick={onCreateServer}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            >
              Create Server
            </button>
            <button
              onClick={onJoinServer}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              Join Server
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Server Sidebar - Channel List */}
      <div className="w-60 bg-[#16161f]/95 backdrop-blur-xl flex flex-col border-r border-purple-500/20">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-purple-500/20 cursor-pointer hover:bg-[#1a1a2e]/50 transition-all">
          <h2 className="text-white font-semibold truncate">{selectedServer.name}</h2>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(channelsByCategory).map(([category, channels]) => (
            channels.length > 0 && (
              <div key={category}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-2 py-1.5 flex items-center gap-1 text-gray-400 hover:text-gray-300 text-xs uppercase tracking-wide mt-4"
                >
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {category}
                </button>

                {/* Channel List */}
                {expandedCategories.has(category) && (
                  <div className="space-y-0.5 px-2">
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel.name)}
                        className={`w-full px-2 py-1.5 flex items-center gap-2 rounded transition-all ${
                          selectedChannel === channel.name
                            ? 'bg-[#1a1a2e]/80 text-white'
                            : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-gray-300'
                        }`}
                      >
                        {channel.type === 'text' && <Hash className="w-4 h-4" />}
                        {channel.type === 'voice' && <Volume2 className="w-4 h-4" />}
                        {channel.type === 'stage' && <Users className="w-4 h-4" />}
                        <span className="text-sm truncate">{channel.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        {/* User Info */}
        <div className="p-2 bg-[#0a0a1f]/80 border-t border-purple-500/20">
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
            <button
              onClick={() => setShowServerSettings(!showServerSettings)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1a2e]/50 rounded transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Messages */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-purple-500/20 bg-[#0a0a1f]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-gray-400" />
            <span className="text-white font-semibold">{selectedChannel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-all">
              <Pin className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-all">
              <Users className="w-5 h-5" />
            </button>
            <div className="relative ml-2">
              <input
                type="text"
                placeholder="Search"
                className="w-36 px-3 py-1 bg-[#16161f]/80 border border-purple-500/20 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 hover:bg-[#16161f]/30 -mx-2 px-2 py-1 rounded transition-all group">
              <img 
                src={getValentineImage(msg.username)} 
                alt={msg.username}
                className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white font-medium">{msg.username}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.imageUrl && (
                  <div className="mb-2">
                    <img 
                      src={msg.imageUrl} 
                      alt="Shared image" 
                      className="rounded-lg max-w-md max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity border border-purple-500/20"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}
                {msg.text && (
                  <div className="text-gray-300 break-words">{msg.text}</div>
                )}
                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {msg.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        className="px-2 py-1 bg-[#16161f]/60 border border-purple-500/20 rounded text-sm hover:bg-[#1a1a2e]/60 transition-all flex items-center gap-1"
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-gray-400 text-xs">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
                <button className="p-1 text-gray-400 hover:text-white hover:bg-[#1a1a2e]/50 rounded transition-all">
                  <Smile className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-white hover:bg-[#1a1a2e]/50 rounded transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-[#0a0a1f]/80 backdrop-blur-xl border-t border-purple-500/20 relative">
          <CupidArrowAnimation 
            isActive={showCupidAnimation} 
            onComplete={() => setShowCupidAnimation(false)} 
          />
          <div className="flex items-center gap-2 px-4 py-3 bg-[#16161f]/80 border border-purple-500/20 rounded-lg">
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
              className="text-gray-400 hover:text-white transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={uploadingImage ? 'Uploading image...' : `Message #${selectedChannel}`}
              disabled={uploadingImage}
              className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 disabled:opacity-50"
            />
            <button className="text-gray-400 hover:text-white transition-all">
              <Gift className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white transition-all">
              <Smile className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Member List Sidebar */}
      <div className="w-60 bg-[#16161f]/95 backdrop-blur-xl border-l border-purple-500/20 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
            Members — {selectedServer.members.length}
          </h3>
          
          {Object.entries(membersByRole).map(([role, members]) => (
            members.length > 0 && (
              <div key={role} className="mb-4">
                <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                  {role === 'Owner & Co-Owner' && <Crown className="w-3 h-3 text-yellow-400" />}
                  {role === 'Admins' && <Star className="w-3 h-3 text-purple-400" />}
                  {role === 'Moderators' && <Shield className="w-3 h-3 text-blue-400" />}
                  {role} — {members.length}
                </h4>
                <div className="space-y-1">
                  {members.map((member) => (
                    <button
                      key={member.userId}
                      className="w-full px-2 py-1.5 flex items-center gap-2 rounded hover:bg-[#1a1a2e]/50 transition-all group"
                    >
                      <div className="relative">
                        <img 
                          src={getValentineImage(member.username)} 
                          alt={member.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16161f] ${getStatusColor(member.status)}`}></div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm truncate flex items-center gap-1 ${getRankColor(member.rank)}`}>
                          {getRankIcon(member.rank)}
                          {member.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Server Settings Modal */}
      {showServerSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161f]/95 backdrop-blur-xl border border-purple-500/20 rounded-xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-56 bg-[#0a0a1f]/80 p-4 space-y-1 border-r border-purple-500/20">
              <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 px-2">{selectedServer.name}</h3>
              <button
                onClick={() => setActiveSettingsTab('overview')}
                className={`w-full px-3 py-2 text-left rounded transition-all ${
                  activeSettingsTab === 'overview' ? 'bg-purple-600/30 text-white' : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveSettingsTab('roles')}
                className={`w-full px-3 py-2 text-left rounded transition-all ${
                  activeSettingsTab === 'roles' ? 'bg-purple-600/30 text-white' : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-white'
                }`}
              >
                Roles & Permissions
              </button>
              <button
                onClick={() => setActiveSettingsTab('moderation')}
                className={`w-full px-3 py-2 text-left rounded transition-all ${
                  activeSettingsTab === 'moderation' ? 'bg-purple-600/30 text-white' : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-white'
                }`}
              >
                Moderation
              </button>
              <button
                onClick={() => setActiveSettingsTab('integrations')}
                className={`w-full px-3 py-2 text-left rounded transition-all ${
                  activeSettingsTab === 'integrations' ? 'bg-purple-600/30 text-white' : 'text-gray-400 hover:bg-[#1a1a2e]/50 hover:text-white'
                }`}
              >
                Integrations
              </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {activeSettingsTab === 'overview' && 'Server Overview'}
                  {activeSettingsTab === 'roles' && 'Roles & Permissions'}
                  {activeSettingsTab === 'moderation' && 'Moderation Settings'}
                  {activeSettingsTab === 'integrations' && 'Integrations'}
                </h2>
                <button
                  onClick={() => setShowServerSettings(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#1a1a2e]/50 rounded transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeSettingsTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Server Name</label>
                    <input
                      type="text"
                      value={selectedServer.name}
                      className="w-full px-4 py-2 bg-[#0a0a1f]/80 border border-purple-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Server Code</label>
                    <input
                      type="text"
                      value={selectedServer.code}
                      className="w-full px-4 py-2 bg-[#0a0a1f]/80 border border-purple-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Owner</label>
                    <p className="text-white">{selectedServer.ownerUsername}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Members</label>
                    <p className="text-white">{selectedServer.members.length} members</p>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'roles' && (
                <div className="space-y-4">
                  <p className="text-gray-400">Manage server roles and permissions. Only Owner and Co-Owners (Rank 5) can modify these settings.</p>
                  <div className="space-y-3">
                    {[
                      { rank: 5, name: 'Owner & Co-Owner', color: 'text-yellow-400', description: 'Full server control' },
                      { rank: 4, name: 'Admin', color: 'text-purple-400', description: 'Manage channels and members' },
                      { rank: 3, name: 'Moderator', color: 'text-blue-400', description: 'Moderate messages and users' },
                      { rank: 2, name: 'Tester', color: 'text-green-400', description: 'Access to testing features' },
                      { rank: 1, name: 'Member', color: 'text-gray-400', description: 'Basic server access' }
                    ].map((role) => (
                      <div key={role.rank} className="p-4 bg-[#0a0a1f]/80 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${role.color}`}>{role.name}</span>
                          <span className="text-gray-500 text-sm">Rank {role.rank}</span>
                        </div>
                        <p className="text-gray-400 text-sm">{role.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'moderation' && (
                <div className="space-y-4">
                  <p className="text-gray-400">Configure moderation settings and auto-mod rules.</p>
                  <div className="space-y-3">
                    <div className="p-4 bg-[#0a0a1f]/80 border border-purple-500/20 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Auto-Moderation</h3>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-gray-300 text-sm">Filter profanity</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-gray-300 text-sm">Prevent spam</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-gray-300 text-sm">Block external links</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'integrations' && (
                <div className="space-y-4">
                  <p className="text-gray-400">Connect external services and bots to your server.</p>
                  <div className="text-center py-8">
                    <p className="text-gray-500">No integrations configured</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}