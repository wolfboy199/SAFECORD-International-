import { useState, useEffect, useRef } from 'react';
import { Hash, Plus, LogIn, Send, Heart, ImagePlus, Settings, ChevronDown, Volume2, Radio, Users as UsersIcon, Shield, Trash2, Edit2, X, Upload, Mic, MicOff, Headphones } from 'lucide-react';
import { fn, USE_SUPABASE } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { ServerSettings } from './ServerSettings';

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

// SafeCord Logo Component
function SafeCordLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="16" fill="url(#gradient)" />
      <path d="M16 8C12.5 8 10 10.5 10 14C10 17.5 12.5 20 16 20C19.5 20 22 17.5 22 14C22 10.5 19.5 8 16 8Z" fill="white" />
      <path d="M16 12C14.9 12 14 12.9 14 14C14 15.1 14.9 16 16 16C17.1 16 18 15.1 18 14C18 12.9 17.1 12 16 12Z" fill="url(#gradient)" />
      <path d="M12 20C12 22.2 13.8 24 16 24C18.2 24 20 22.2 20 20H12Z" fill="white" />
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface ServerViewProps {
  currentUserId: string;
  currentUsername: string;
}

interface Server {
  code: string;
  name: string;
  joinedAt: string;
  iconUrl?: string;
}

interface ServerDetails {
  code: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  iconUrl?: string;
  members: { userId: string; username: string; joinedAt: string; role?: string }[];
  channels: { id: string; name: string; type: string }[];
  roles: { id: string; name: string; color: string; permissions: string[] }[];
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
}

export function ServerView({ currentUserId, currentUsername }: ServerViewProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerDetails | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showChannelCreate, setShowChannelCreate] = useState(false);
  const [showRoleCreate, setShowRoleCreate] = useState(false);
  const [channelType, setChannelType] = useState<'text' | 'voice' | 'stage'>('text');
  const [newChannelName, setNewChannelName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#ec4899');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [serverName, setServerName] = useState('');
  const [serverIconUrl, setServerIconUrl] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingServerIcon, setUploadingServerIcon] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serverIconInputRef = useRef<HTMLInputElement>(null);
  const userProfilesRef = useRef<Record<string, { profilePicture: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sort members by role order (roles array indicates hierarchy)
  const sortedMembers = selectedServer
    ? [...selectedServer.members].sort((a, b) => {
        const ra = selectedServer.roles.findIndex((r) => r.name === a.role);
        const rb = selectedServer.roles.findIndex((r) => r.name === b.role);
        if (ra === rb) return a.username.localeCompare(b.username);
        if (ra === -1) return 1;
        if (rb === -1) return -1;
        return ra - rb;
      })
    : [];

  const supabase = USE_SUPABASE ? getSupabaseClient() : null;

  // System server that all users are auto-joined to
  const SYSTEM_SERVER = {
    code: 'MODREPORT',
    name: 'Report Mod Abuse',
    joinedAt: new Date().toISOString(),
    isSystem: true
  };

  useEffect(() => {
    loadServers();
  }, [currentUserId]);

  useEffect(() => {
    if (selectedServer) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedServer, selectedChannel]);

  // Auto-scroll messages to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchUserProfile = async (username: string) => {
    // Check cache first
    if (userProfilesRef.current[username]) {
      return userProfilesRef.current[username];
    }

    try {
      const response = await fetch(fn(`profile/${username}`));
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          const profileData = { profilePicture: data.profile.profilePicture || '' };
          userProfilesRef.current[username] = profileData;
          return profileData;
        }
      }
    } catch (error) {
      // Silently fail
    }
    
    return { profilePicture: '' };
  };

  const getUserProfilePicture = (username: string) => {
    const profile = userProfilesRef.current[username];
    if (profile && profile.profilePicture) {
      return profile.profilePicture;
    }
    return getValentineImage(username);
  };

  const loadServers = async () => {
    try {
      const response = await fetch(fn(`server/list/${currentUserId}`));
      const data = await response.json();
      if (data.success) {
        const allServers = [SYSTEM_SERVER, ...data.servers];
        setServers(allServers);
        if (allServers.length > 0 && !selectedServer) {
          loadServerDetails(allServers[0].code);
        }
      } else {
        setServers([SYSTEM_SERVER]);
        if (!selectedServer) {
          loadServerDetails(SYSTEM_SERVER.code);
        }
      }
    } catch (error) {
      console.error('Error loading servers:', error);
      setServers([SYSTEM_SERVER]);
      if (!selectedServer) {
        loadServerDetails(SYSTEM_SERVER.code);
      }
    }
  };

  const loadServerDetails = async (code: string) => {
    if (code === 'MODREPORT') {
      setSelectedServer({
        code: 'MODREPORT',
        name: 'Report Mod Abuse',
        ownerId: 'SYSTEM',
        ownerUsername: 'SAFECORD System',
        members: [
          { userId: currentUserId, username: currentUsername, joinedAt: new Date().toISOString() }
        ],
        channels: [
          { id: 'general', name: 'general', type: 'text' },
          { id: 'reports', name: 'reports', type: 'text' },
          { id: 'appeals', name: 'appeals', type: 'text' }
        ],
        roles: []
      });
      return;
    }

    try {
      const response = await fetch(fn(`server/${code}`));
      const data = await response.json();
      if (data.success) {
        setSelectedServer(data.server);
        setServerName(data.server.name);
        setServerIconUrl(data.server.iconUrl || '');
      }
    } catch (error) {
      console.error('Error loading server details:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedServer) return;
    
    try {
      const response = await fetch(fn(`server/${selectedServer.code}/${selectedChannel}/messages`));
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        
        // Load profile pictures for all message senders
        const usernames = [...new Set(data.messages.map((msg: Message) => msg.username))];
        usernames.forEach((username: string) => {
          fetchUserProfile(username);
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(fn('server/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, username: currentUsername, serverName: serverName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setServerName('');
        loadServers();
        loadServerDetails(data.server.code);
      } else {
        setError(data.error || 'Failed to create server');
      }
    } catch (error) {
      console.error('Error creating server:', error);
      setError('Failed to create server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !selectedServer) return;

    setIsLoading(true);
    try {
      const response = await fetch(fn('server/channel/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, channelName: newChannelName.trim(), channelType: channelType, userId: currentUserId }),
      });

      const data = await response.json();
      if (data.success) {
        setShowChannelCreate(false);
        setNewChannelName('');
        loadServerDetails(selectedServer.code);
      } else {
        alert(data.error || 'Failed to create channel');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !selectedServer) return;

    setIsLoading(true);
    try {
      const response = await fetch(fn('server/role/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, roleName: newRoleName.trim(), roleColor: newRoleColor, rolePermissions: newRolePermissions, userId: currentUserId }),
      });

      const data = await response.json();
      if (data.success) {
        setShowRoleCreate(false);
        setNewRoleName('');
        setNewRoleColor('#ec4899');
        setNewRolePermissions([]);
        loadServerDetails(selectedServer.code);
      } else {
        alert(data.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingServerIcon(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `server-${selectedServer.code}-${Date.now()}.${fileExt}`;
      const filePath = `server-icons/${fileName}`;

      let iconUrl: string | undefined;
      if (USE_SUPABASE && supabase) {
        const { data: uploadData, error: uploadError } = await supabase.storage.from('make-b35a818f-call-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload icon');
          return;
        }
        const { data: urlData } = supabase.storage.from('make-b35a818f-call-photos').getPublicUrl(filePath);
        iconUrl = urlData.publicUrl;
        setServerIconUrl(iconUrl);
      } else {
        // Fallback: data URL
        iconUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
        if (iconUrl) setServerIconUrl(iconUrl);
      }

      // Update server icon in backend
      await fetch(fn('server/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, userId: currentUserId, iconUrl })
      });

      loadServers();
    } catch (error) {
      console.error('Error uploading server icon:', error);
      alert('Failed to upload icon');
    } finally {
      setUploadingServerIcon(false);
      if (serverIconInputRef.current) {
        serverIconInputRef.current.value = '';
      }
    }
  };

  const handleUpdateServerName = async () => {
    if (!serverName.trim() || !selectedServer) return;

    setIsLoading(true);
    try {
      const response = await fetch(fn('server/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, userId: currentUserId, name: serverName.trim() })
      });

      const data = await response.json();
      if (data.success) {
        loadServers();
        loadServerDetails(selectedServer.code);
        setShowServerSettings(false);
      } else {
        alert(data.error || 'Failed to update server');
      }
    } catch (error) {
      console.error('Error updating server:', error);
      alert('Failed to update server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(fn('server/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, username: currentUsername, serverCode: joinCode.trim().toUpperCase() })
      });

      const data = await response.json();
      if (data.success) {
        setShowJoinModal(false);
        setJoinCode('');
        loadServers();
        loadServerDetails(data.server.code);
      } else {
        setError(data.error || 'Failed to join server');
      }
    } catch (error) {
      console.error('Error joining server:', error);
      setError('Failed to join server');
    } finally {
      setIsLoading(false);
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
        const { data: uploadData, error: uploadError } = await supabase.storage.from('make-b35a818f-call-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
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

      const response = await fetch(fn('server/message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, channelId: selectedChannel, userId: currentUserId, username: currentUsername, text: message.trim() || '', imageUrl })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('');
        loadMessages();
      } else if (data.banned) {
        alert(data.error);
        localStorage.removeItem('voiceCallUser');
        window.location.reload();
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedServer) return;

    try {
      const response = await fetch(fn('server/message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCode: selectedServer.code, channelId: selectedChannel, userId: currentUserId, username: currentUsername, text: message.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('');
        loadMessages();
      } else if (data.banned) {
        alert(data.error);
        localStorage.removeItem('voiceCallUser');
        window.location.reload();
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const isServerOwner = selectedServer && selectedServer.ownerId === currentUserId;
  
  // Check if user has administrator permissions
  const hasAdminPermissions = () => {
    if (!selectedServer) return false;
    if (isServerOwner) return true;
    
    // Check if user has a role with administrator permission
    const currentMember = selectedServer.members.find(m => m.userId === currentUserId);
    if (!currentMember || !currentMember.role) return false;
    
    const memberRole = selectedServer.roles.find(r => r.name === currentMember.role);
    if (!memberRole) return false;
    
    return memberRole.permissions.includes('administrator');
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Server List Sidebar */}
      <div className="w-20 bg-[#0b1a10]/80 backdrop-blur-xl border-r border-red-500/20 flex flex-col items-center py-4 overflow-y-auto scrollbar-server">
        {/* SAFECORD Home */}
        <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center mb-2 shadow-lg shadow-pink-500/50 group relative flex-shrink-0">
          <SafeCordLogo size={28} />
          <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            SAFECORD
          </div>
        </div>

        <div className="w-8 h-[2px] bg-pink-500/20 rounded-full mb-2 flex-shrink-0"></div>

        {/* Servers Container - Scrollable */}
        <div className="flex flex-col items-center gap-2 w-full px-2 flex-1 overflow-y-auto scrollbar-server">
          {servers.map((server) => (
            <button
              key={server.code}
              onClick={() => loadServerDetails(server.code)}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all group flex-shrink-0 ${
                selectedServer?.code === server.code
                  ? server.code === 'MODREPORT' 
                    ? 'bg-gradient-to-br from-green-700 to-green-500 rounded-xl shadow-lg shadow-green-900/50'
                    : 'bg-gradient-to-br from-red-600 to-red-800 rounded-xl shadow-lg shadow-red-900/50'
                  : server.code === 'MODREPORT'
                    ? 'bg-green-600/30 hover:bg-green-600/50 hover:rounded-xl'
                    : 'bg-red-600/30 hover:bg-red-600/50 hover:rounded-xl'
              }`}
              title={server.name}
            >
              {server.iconUrl ? (
                <img src={server.iconUrl} alt={server.name} className="w-full h-full rounded-2xl object-cover" />
              ) : server.code === 'MODREPORT' ? (
                <Heart className="w-6 h-6 text-white" />
              ) : (
                <span className="text-white font-bold">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              )}
              {server.code === 'MODREPORT' && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-[#0b1a10] flex items-center justify-center">
                  <span className="text-[8px]">⭐</span>
                </div>
              )}
              <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {server.name}
              </div>
            </button>
          ))}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex flex-col items-center gap-2 w-full px-2 pt-2 border-t border-pink-500/20 mt-2 flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-12 h-12 rounded-full bg-red-600/30 hover:bg-green-600/50 border-2 border-dashed border-red-400/50 flex items-center justify-center transition-all group"
            title="Create Server"
          >
            <Plus className="w-6 h-6 text-red-300 group-hover:text-green-300" />
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="w-12 h-12 rounded-full bg-red-600/30 hover:bg-yellow-600/50 border-2 border-dashed border-red-400/50 flex items-center justify-center transition-all group"
            title="Join Server"
          >
            <LogIn className="w-6 h-6 text-red-300 group-hover:text-yellow-300" />
          </button>
        </div>
      </div>

      {selectedServer ? (
        <>
          {/* Channels Sidebar */}
          <div className="w-60 bg-[#13261b]/80 backdrop-blur-xl border-r border-red-500/20 flex flex-col">
            {/* Server Header with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowServerMenu(!showServerMenu)}
                className="w-full p-4 border-b border-red-500/20 flex items-center justify-between hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="text-white truncate font-bold">{selectedServer.name}</h2>
                  <p className="text-gray-400 text-sm">Code: {selectedServer.code}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-white transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Server Dropdown Menu */}
              {showServerMenu && (
                <div className="absolute top-full left-0 right-0 bg-[#0f1f15]/95 backdrop-blur-xl border-b border-red-500/20 shadow-2xl z-50">
                  {isServerOwner && (
                    <>
                      <button
                        onClick={() => {
                          setShowServerSettings(true);
                          setShowServerMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>Server Settings</span>
                        <Settings className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="h-[1px] bg-red-500/20 my-1"></div>
                    </>
                  )}
                  {hasAdminPermissions() && (
                    <>
                      <button
                        onClick={() => {
                          setShowChannelCreate(true);
                          setChannelType('text');
                          setShowServerMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>Create Text Channel</span>
                        <Hash className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => {
                          setShowChannelCreate(true);
                          setChannelType('voice');
                          setShowServerMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>Create Voice Channel</span>
                        <Volume2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => {
                          setShowChannelCreate(true);
                          setChannelType('stage');
                          setShowServerMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>Create Stage</span>
                        <Radio className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="h-[1px] bg-red-500/20 my-1"></div>
                      <button
                        onClick={() => {
                          setShowRoleCreate(true);
                          setShowServerMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>Create Role</span>
                        <Shield className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="h-[1px] bg-red-500/20 my-1"></div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedServer.code);
                      alert('Server code copied to clipboard!');
                      setShowServerMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-red-500/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>Copy Server Code</span>
                    <LogIn className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-server">
              <div className="mb-4">
                <p className="text-gray-400 uppercase text-xs px-2 mb-2 font-semibold">Text Channels</p>
                {selectedServer.channels.filter(c => c.type === 'text').map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full px-2 py-2 rounded flex items-center gap-2 transition-colors ${
                      selectedChannel === channel.id
                        ? 'bg-red-600/30 text-white'
                        : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span>{channel.name}</span>
                  </button>
                ))}
              </div>

              {selectedServer.channels.filter(c => c.type === 'voice').length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 uppercase text-xs px-2 mb-2 font-semibold">Voice Channels</p>
                  {selectedServer.channels.filter(c => c.type === 'voice').map((channel) => (
                    <button
                      key={channel.id}
                      className="w-full px-2 py-2 rounded flex items-center gap-2 text-gray-300 hover:bg-red-600/10 hover:text-white transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{channel.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedServer.channels.filter(c => c.type === 'stage').length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 uppercase text-xs px-2 mb-2 font-semibold">Stages</p>
                  {selectedServer.channels.filter(c => c.type === 'stage').map((channel) => (
                    <button
                      key={channel.id}
                      className="w-full px-2 py-2 rounded flex items-center gap-2 text-gray-300 hover:bg-red-600/10 hover:text-white transition-colors"
                    >
                      <Radio className="w-4 h-4" />
                      <span>{channel.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Member list moved to right sidebar for Discord-style layout */}
            </div>

            {/* User Panel at Bottom */}
            <div className="p-2 bg-[#0b1a10]/80 border-t border-red-500/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img 
                    src={getValentineImage(currentUsername)} 
                    alt={currentUsername}
                    className="w-8 h-8 rounded-full object-cover border border-green-500/30"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1a10]"></div>
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
                    className={`p-1.5 rounded hover:bg-red-500/20 transition-colors ${isMuted || isDeafened ? 'text-red-400' : 'text-gray-300 hover:text-white'}`}
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
                    className={`p-1.5 rounded hover:bg-red-500/20 transition-colors ${isDeafened ? 'text-red-400' : 'text-gray-300 hover:text-white'}`}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                  >
                    <Headphones className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-red-500/20 text-gray-300 hover:text-white transition-colors"
                    title="User Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-[#0f1f15]/60 backdrop-blur-sm">
            {/* Channel Header */}
            <div className="p-4 border-b border-red-500/20 bg-[#13261b]/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                {selectedServer.channels.find(c => c.id === selectedChannel)?.type === 'voice' ? (
                  <Volume2 className="w-5 h-5 text-gray-400" />
                ) : selectedServer.channels.find(c => c.id === selectedChannel)?.type === 'stage' ? (
                  <Radio className="w-5 h-5 text-gray-400" />
                ) : (
                  <Hash className="w-5 h-5 text-gray-400" />
                )}
                <h3 className="text-white font-semibold">{selectedChannel}</h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-messages">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <img 
                    src={getUserProfilePicture(msg.username)} 
                    alt={msg.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-red-500/30 shadow-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{msg.username}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.imageUrl && (
                      <div className="mt-2">
                        <img 
                          src={msg.imageUrl} 
                          alt="Shared image" 
                          className="rounded-lg max-w-md max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity border border-red-500/20 shadow-lg"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {msg.text && <p className="text-gray-300 mt-1">{msg.text}</p>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 flex-shrink-0">
              {error && (
                <div className="mb-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3 py-3 bg-[#0b1a10]/80 border border-red-500/20 text-red-300 rounded-lg hover:bg-[#13261b]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={uploadingImage ? 'Uploading image...' : `Message #${selectedChannel}`}
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-3 bg-[#0b1a10]/80 backdrop-blur-sm border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || uploadingImage}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-500/30"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar - Members */}
          <div className="w-64 bg-[#07110e]/80 backdrop-blur-xl border-l border-red-500/20 flex flex-col min-h-0">
            <div className="p-4 border-b border-red-500/20 flex items-center justify-between flex-shrink-0">
              <h4 className="text-white font-semibold">Members</h4>
              <span className="text-gray-400 text-sm">{selectedServer.members.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-custom">
              {sortedMembers.map((member) => (
                <div key={member.userId} className="group flex items-center gap-3 p-2 rounded hover:bg-[#13261b]/40">
                  <img
                    src={getUserProfilePicture(member.username)}
                    alt={member.username}
                    className="w-9 h-9 rounded-full object-cover border border-green-500/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-white">{member.username}</span>
                      {member.role && (
                        <span
                          className="text-xs px-2 py-0.5 rounded text-white/90"
                          style={{ background: selectedServer.roles.find((r) => r.name === member.role)?.color || 'transparent' }}
                        >
                          {member.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>online</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <MicOff className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" title="Muted" />
                    <Headphones className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" title="Deafened" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-red-500/20 flex items-center gap-2 flex-shrink-0">
              <img src={getValentineImage(currentUsername)} alt={currentUsername} className="w-8 h-8 rounded-full" />
              <button className="ml-auto p-1.5 rounded hover:bg-red-500/20" title="User Settings">
                <Settings className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#0f1f15]/60 backdrop-blur-sm">
          <div className="text-center">
            <SafeCordLogo size={64} />
            <h3 className="text-gray-400 mb-2 mt-4">No server selected</h3>
            <p className="text-gray-500 text-sm">Create or join a server to get started</p>
          </div>
        </div>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1f15]/95 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 w-full max-w-md shadow-2xl shadow-red-900/50">
            <h3 className="text-white mb-4 text-xl font-bold">Create a Server</h3>
            <form onSubmit={handleCreateServer} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Server Name</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Valentine Server"
                  className="w-full px-4 py-3 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setServerName('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serverName.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1f15]/95 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 w-full max-w-md shadow-2xl shadow-red-900/50">
            <h3 className="text-white mb-4 text-xl font-bold">Join a Server</h3>
            <form onSubmit={handleJoinServer} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Server Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 uppercase"
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinCode.length !== 6 || isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Settings Modal */}
      {showServerSettings && selectedServer && (
        <ServerSettings
          serverCode={selectedServer.code}
          serverName={selectedServer.name}
          serverIconUrl={selectedServer.iconUrl || ''}
          currentUserId={currentUserId}
          isOwner={isServerOwner}
          members={selectedServer.members}
          roles={selectedServer.roles}
          onClose={() => setShowServerSettings(false)}
          onUpdate={() => {
            loadServers();
            loadServerDetails(selectedServer.code);
          }}
        />
      )}

      {/* Create Channel Modal */}
      {showChannelCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1f15]/95 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 w-full max-w-md shadow-2xl shadow-red-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">
                Create {channelType === 'text' ? 'Text' : channelType === 'voice' ? 'Voice' : 'Stage'} Channel
              </h3>
              <button onClick={() => setShowChannelCreate(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={channelType === 'text' ? 'general-chat' : channelType === 'voice' ? 'Voice Room' : 'Stage'}
                  className="w-full px-4 py-3 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowChannelCreate(false)}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showRoleCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1f15]/95 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 w-full max-w-md shadow-2xl shadow-red-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">Create Role</h3>
              <button onClick={() => setShowRoleCreate(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Moderator"
                  className="w-full px-4 py-3 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Role Color</label>
                <input
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-full h-12 bg-[#0b1a10]/80 border border-red-500/20 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRoleCreate(false)}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={!newRoleName.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}