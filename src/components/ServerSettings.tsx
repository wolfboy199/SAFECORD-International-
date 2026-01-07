import { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2, Shield, Users, Lock, Bell, MessageSquare, Settings as SettingsIcon, AlertTriangle, Crown, Star } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { fn, USE_SUPABASE } from '../utils/supabase/info';

interface Member {
  userId: string;
  username: string;
  role?: string;
}

interface Role {
  name: string;
  color: string;
  permissions: string[];
}

interface ServerSettingsProps {
  serverCode: string;
  serverName: string;
  serverIconUrl: string;
  currentUserId: string;
  isOwner: boolean;
  members: Member[];
  roles: Role[];
  onClose: () => void;
  onUpdate: () => void;
}

const PRESENT_IMAGES = [
  "https://images.unsplash.com/photo-1670969490504-0f1be0abfc90?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1671073617037-6bcb72fb2bb7?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1765992314221-178372ba44be?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1638460392258-27e2283cfafb?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1671826587686-e31526568513?w=200&h=200&fit=crop"
];

const getValentineImage = (username: string) => {
  const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PRESENT_IMAGES[sum % PRESENT_IMAGES.length];
};

export function ServerSettings({
  serverCode,
  serverName: initialServerName,
  serverIconUrl: initialServerIconUrl,
  currentUserId,
  isOwner,
  members: initialMembers,
  roles: initialRoles,
  onClose,
  onUpdate
}: ServerSettingsProps) {
  const [activeSection, setActiveSection] = useState('profile');
  const [serverName, setServerName] = useState(initialServerName);
  const [serverIconUrl, setServerIconUrl] = useState(initialServerIconUrl);
  const [serverDescription, setServerDescription] = useState('');
  const [bannerColor, setBannerColor] = useState('#ec4899');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { profilePicture: string }>>({});
  const iconInputRef = useRef<HTMLInputElement>(null);
  const supabase = USE_SUPABASE ? getSupabaseClient() : null;

  useEffect(() => {
    setMembers(initialMembers);
    setRoles(initialRoles);
    loadMemberProfiles();
  }, [initialMembers, initialRoles]);

  const loadMemberProfiles = async () => {
    for (const member of initialMembers) {
      try {
        const response = await fetch(fn(`profile/${member.username}`));

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile) {
            setMemberProfiles(prev => ({
              ...prev,
              [member.username]: { profilePicture: data.profile.profilePicture || '' }
            }));
          }
        }
      } catch (error) {
        // Silently fail
      }
    }
  };

  const getUserProfilePicture = (username: string) => {
    const profile = memberProfiles[username];
    if (profile && profile.profilePicture) {
      return profile.profilePicture;
    }
    return getValentineImage(username);
  };

  const bannerColors = [
    '#1a1a2e', '#ff006e', '#fb5607', '#ffbe0b', '#ffdd00',
    '#8338ec', '#06b6d4', '#14b8a6', '#84cc16', '#64748b'
  ];

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploadingIcon(true);

    try {
      if (USE_SUPABASE && supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `server-${serverCode}-${Date.now()}.${fileExt}`;
        const filePath = `server-icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('make-b35a818f-call-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload icon');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('make-b35a818f-call-photos')
          .getPublicUrl(filePath);

        setServerIconUrl(urlData.publicUrl);

        await fetch(fn('server/update'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverCode: serverCode,
            userId: currentUserId,
            iconUrl: urlData.publicUrl
          })
        });

        onUpdate();
      } else {
        // Fallback: convert to data URL and send to API (Worker can decide how to handle)
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          setServerIconUrl(dataUrl);
          try {
            await fetch(fn('server/update'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serverCode: serverCode,
                userId: currentUserId,
                iconUrl: dataUrl
              })
            });
            onUpdate();
          } catch (err) {
            console.error('Error sending icon data URL:', err);
            alert('Failed to upload icon');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload icon');
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(fn('server/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverCode: serverCode,
          userId: currentUserId,
          name: serverName,
          description: serverDescription,
          bannerColor: bannerColor
        })
      });

      const data = await response.json();
      if (data.success) {
        onUpdate();
        alert('Server settings saved!');
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      const response = await fetch(fn('server/assign-role'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverCode: serverCode,
          userId: currentUserId,
          targetUserId: userId,
          roleName: roleName === 'none' ? null : roleName
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setMembers(prev => prev.map(m => 
          m.userId === userId ? { ...m, role: roleName === 'none' ? undefined : roleName } : m
        ));
        onUpdate();
        alert('Role assigned successfully!');
      } else {
        alert(data.error || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Failed to assign role');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Server Profile</h2>
              <p className="text-gray-400 text-sm">
                Customize your server with a name, icon, and banner color to make it stand out.
              </p>
            </div>

            {/* Server Name */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">Name</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                maxLength={100}
              />
            </div>

            {/* Server Icon */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">Icon</label>
              <p className="text-gray-500 text-sm mb-3">
                We recommend an image of at least 512x512 for the server.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-red-600/30 flex items-center justify-center overflow-hidden border-2 border-red-500/20">
                  {serverIconUrl ? (
                    <img src={serverIconUrl} alt="Server icon" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold">
                      {serverName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="px-4 py-2 bg-pink-600/30 text-pink-200 rounded-lg hover:bg-pink-600/40 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingIcon ? 'Uploading...' : 'Change Server Icon'}
                </button>
                {serverIconUrl && (
                  <button
                    type="button"
                    onClick={() => setServerIconUrl('')}
                    className="px-4 py-2 bg-red-600/30 text-red-200 rounded-lg hover:bg-red-600/40 transition-all"
                  >
                    Remove Icon
                  </button>
                )}
              </div>
            </div>

            {/* Banner Color */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">Banner Color</label>
              <div className="grid grid-cols-5 gap-3 mb-3">
                {bannerColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBannerColor(color)}
                    className={`w-full h-16 rounded-lg transition-all hover:scale-105 ${
                      bannerColor === color ? 'ring-4 ring-white/50' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">Description</label>
              <textarea
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                placeholder="How did your server get started? Why should people join?"
                className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-gray-500 text-sm mt-1">{serverDescription.length}/500</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-red-500/20">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Roles</h2>
              <p className="text-gray-400 text-sm">
                Manage roles and permissions for your server members.
              </p>
            </div>

            {/* Roles List */}
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.name} className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <h3 className="text-white font-semibold">{role.name}</h3>
                        <p className="text-gray-400 text-sm">
                          {role.permissions.includes('administrator') && (
                            <span className="inline-flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Administrator
                            </span>
                          )}
                          {role.permissions.includes('manage_channels') && !role.permissions.includes('administrator') && (
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Manage Channels
                            </span>
                          )}
                          {!role.permissions.includes('administrator') && !role.permissions.includes('manage_channels') && (
                            <span>Member</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {members.filter(m => m.role === role.name).length} members
                    </div>
                  </div>
                </div>
              ))}

              {roles.length === 0 && (
                <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6 text-center">
                  <Shield className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No roles yet. Create one from the server dropdown menu.</p>
                </div>
              )}
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-blue-300 font-semibold mb-1">Create New Roles</h3>
                  <p className="text-gray-400 text-sm">
                    Click the server dropdown menu at the top to create new roles with custom permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Members</h2>
              <p className="text-gray-400 text-sm">
                View and manage your server members. Assign roles to give members special permissions.
              </p>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.userId} className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={getUserProfilePicture(member.username)} 
                        alt={member.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-red-500/30"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">{member.username}</h3>
                          {member.role && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: roles.find(r => r.name === member.role)?.color + '30' || '#88888830',
                                color: roles.find(r => r.name === member.role)?.color || '#888888'
                              }}
                            >
                              {member.role}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {member.userId === currentUserId && '(You)'}
                        </p>
                      </div>
                    </div>
                    
                    {isOwner && member.userId !== currentUserId && (
                      <select
                        value={member.role || 'none'}
                        onChange={(e) => handleAssignRole(member.userId, e.target.value)}
                        className="px-3 py-2 bg-[#13261b]/80 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm"
                      >
                        <option value="none">No Role</option>
                        {roles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No members yet.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'invites':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Invites</h2>
              <p className="text-gray-400 text-sm">
                Share your server code to invite new members.
              </p>
            </div>

            <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-3">Server Code</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-3 bg-[#13261b]/80 border border-red-500/20 rounded-lg">
                  <code className="text-pink-400 text-xl font-mono">{serverCode}</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(serverCode);
                    alert('Server code copied to clipboard!');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all"
                >
                  Copy Code
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Share this code with friends to invite them to your server. They can join using the 
                "Join Server" button.
              </p>
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Safety Setup</h2>
              <p className="text-gray-400 text-sm">
                Configure moderation and safety features for your server.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Moderation Tools</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      SafeCord includes built-in moderation features including rank-based permissions, 
                      timeout capabilities, and underage protection.
                    </p>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                        Rank 5 system with owner and co-owner roles
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                        Timeout protection for owners and co-owners
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                        Automatic underage user detection
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">Report Mod Abuse</h3>
                    <p className="text-gray-400 text-sm">
                      All users have access to the "Report Mod Abuse" system server where they can report 
                      moderator misconduct and appeal decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Server Overview</h2>
              <p className="text-gray-400 text-sm">
                View stats and information about your server.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <Users className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">{members.length} Members</h3>
                <p className="text-gray-400 text-sm">Total server members</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <Shield className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">{roles.length} Roles</h3>
                <p className="text-gray-400 text-sm">Custom roles created</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <MessageSquare className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Channels</h3>
                <p className="text-gray-400 text-sm">Manage text, voice, and stage channels</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
                <Lock className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Safety</h3>
                <p className="text-gray-400 text-sm">Moderation and safety tools</p>
              </div>
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Delete Server</h2>
              <p className="text-gray-400 text-sm">
                Permanently delete this server and all of its data.
              </p>
            </div>

            <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
                <div>
                  <h3 className="text-red-400 font-semibold mb-2">Warning: This action is irreversible</h3>
                  <p className="text-gray-300 text-sm">
                    Deleting your server will permanently remove all channels, messages, roles, and member data. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const confirmation = prompt(
                    `Type "${serverName}" to confirm server deletion:`
                  );
                  if (confirmation === serverName) {
                    alert('Server deletion functionality coming soon');
                  }
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
              >
                Delete Server
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Coming Soon</h2>
              <p className="text-gray-400 text-sm">
                This section is under development.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#0f1f15]/95 backdrop-blur-xl border-r border-red-500/20 overflow-y-auto scrollbar-server">
        <div className="p-4">
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase mb-2 px-2">{serverName}</p>
          </div>

          {/* Server Management */}
          <div className="mb-6">
            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'profile'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Server Profile
            </button>
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'overview'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Overview
            </button>
          </div>

          {/* User Management */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase mb-2 px-2">User Management</p>
            <button
              onClick={() => setActiveSection('members')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'members'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveSection('roles')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'roles'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Roles
            </button>
            <button
              onClick={() => setActiveSection('invites')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'invites'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Invites
            </button>
          </div>

          {/* Moderation */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase mb-2 px-2">Moderation</p>
            <button
              onClick={() => setActiveSection('safety')}
              className={`w-full px-3 py-2 rounded text-left transition-colors ${
                activeSection === 'safety'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              Safety Setup
            </button>
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div>
              <p className="text-gray-500 text-xs uppercase mb-2 px-2">Danger Zone</p>
              <button
                onClick={() => setActiveSection('delete')}
                className={`w-full px-3 py-2 rounded text-left transition-colors ${
                  activeSection === 'delete'
                    ? 'bg-red-600/30 text-red-400'
                    : 'text-red-400 hover:bg-red-600/10 hover:text-red-300'
                }`}
              >
                Delete Server
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#13261b]/95 backdrop-blur-xl overflow-y-auto scrollbar-messages">
        <div className="max-w-4xl mx-auto p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#0b1a10]/80 hover:bg-[#0f1f15]/80 transition-colors group"
            title="Close Settings"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
