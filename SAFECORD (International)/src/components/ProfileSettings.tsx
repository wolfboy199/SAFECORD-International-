import { useState, useEffect, useRef } from 'react';
import { X, Upload, Palette, Bell, Lock, Shield, User as UserIcon, Database, Smartphone, MessageSquare, Video, Image as ImageIcon, Keyboard, Globe, Eye, Users, Gamepad2, Settings as SettingsIcon, LogOut, Link as LinkIcon, Zap } from 'lucide-react';
import { fn } from '../utils/supabase/info';

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

interface ProfileSettingsProps {
  username: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const BANNER_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f77062 0%, #fe5196 100%)'
];

export function ProfileSettings({ username, onClose, onUpdate }: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState('account');
  const [activeTab, setActiveTab] = useState('standing');
  const [nickname, setNickname] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [banner, setBanner] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [seasonalMode, setSeasonalMode] = useState(false);
  const [uiDensity, setUiDensity] = useState('compact');
  const [uploadingImage, setUploadingImage] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    const savedSeasonalMode = localStorage.getItem('seasonalMode');
    setSeasonalMode(savedSeasonalMode === 'true');
    const savedUiDensity = localStorage.getItem('uiDensity') || 'compact';
    setUiDensity(savedUiDensity);
  }, [username]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(fn(`profile/${username}`));
      
      if (!response.ok) {
        const defaultData = {
          nickname: username,
          profilePicture: '',
          banner: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          aboutMe: '',
          email: '',
          phone: ''
        };
        setNickname(defaultData.nickname);
        setProfilePicture(defaultData.profilePicture);
        setPreviewUrl(defaultData.profilePicture);
        setBanner(defaultData.banner);
        setAboutMe(defaultData.aboutMe);
        setEmail(defaultData.email);
        setPhone(defaultData.phone);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setNickname(data.profile.nickname || username);
        setProfilePicture(data.profile.profilePicture || '');
        setPreviewUrl(data.profile.profilePicture || '');
        setBanner(data.profile.banner || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        setAboutMe(data.profile.aboutMe || '');
        setEmail(data.profile.email || '');
        setPhone(data.profile.phone || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfilePicture(base64);
        setPreviewUrl(base64);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError('Nickname cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(fn('profile/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nickname: nickname.trim(), profilePicture, banner, aboutMe, email, phone })
      });

      const data = await response.json();
      if (data.success) {
        alert('Profile updated successfully!');
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeasonalToggle = () => {
    const newValue = !seasonalMode;
    setSeasonalMode(newValue);
    localStorage.setItem('seasonalMode', String(newValue));
    alert(`Seasonal mode ${newValue ? 'enabled' : 'disabled'}. Refresh to see changes.`);
  };

  const handleUiDensityChange = (density: string) => {
    setUiDensity(density);
    localStorage.setItem('uiDensity', density);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('voiceCallUser');
      window.location.reload();
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    return '•'.repeat(username.length) + '@' + domain;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    return '•'.repeat(phone.length - 4) + phone.slice(-4);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-red-500/20">
              <button
                onClick={() => setActiveTab('standing')}
                className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                  activeTab === 'standing'
                    ? 'text-white border-pink-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Standing
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                  activeTab === 'security'
                    ? 'text-white border-pink-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Security
              </button>
            </div>

            {activeTab === 'standing' && (
              <>
                {/* Profile Banner */}
                <div 
                  className="relative w-full h-40 rounded-lg overflow-hidden"
                  style={{ 
                    background: banner.startsWith('data:') || banner.startsWith('http') 
                      ? `url(${banner})` 
                      : banner,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Avatar */}
                  <div className="absolute bottom-0 left-4 transform translate-y-1/2">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-[#13261b] overflow-hidden bg-pink-600/30">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <img 
                            src={getValentineImage(nickname || username)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Profile Button */}
                  <button
                    onClick={() => profilePicInputRef.current?.click()}
                    className="absolute bottom-4 right-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-all text-sm font-semibold"
                  >
                    Edit User Profile
                  </button>
                  <input
                    ref={profilePicInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </div>

                {/* Profile Info */}
                <div className="space-y-4 pt-8">
                  {/* Display Name */}
                  <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                        <input
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="bg-transparent text-white border-none outline-none w-full"
                        />
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-gray-600/50 text-gray-300 rounded hover:bg-gray-600/70 transition-all text-sm disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-gray-400 text-sm mb-1">Username</label>
                        <div className="text-white">{username}</div>
                      </div>
                      <button className="px-4 py-1.5 bg-gray-600/50 text-gray-300 rounded hover:bg-gray-600/70 transition-all text-sm">
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-gray-400 text-sm mb-1">Email</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={email ? maskEmail(email) : ''}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Add email address"
                            className="bg-transparent text-white border-none outline-none flex-1"
                          />
                          {email && (
                            <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded cursor-pointer hover:bg-green-900/50">
                              Reveal
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="px-4 py-1.5 bg-gray-600/50 text-gray-300 rounded hover:bg-gray-600/70 transition-all text-sm">
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={phone ? maskPhone(phone) : ''}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Add phone number"
                            className="bg-transparent text-white border-none outline-none flex-1"
                          />
                          {phone && (
                            <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded cursor-pointer hover:bg-green-900/50">
                              Reveal
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {phone && (
                          <button className="px-4 py-1.5 bg-red-600/50 text-red-200 rounded hover:bg-red-600/70 transition-all text-sm">
                            Remove
                          </button>
                        )}
                        <button className="px-4 py-1.5 bg-gray-600/50 text-gray-300 rounded hover:bg-gray-600/70 transition-all text-sm">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password and Authentication */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Password and Authentication</h3>
                  
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Multi-Factor Authentication enabled</span>
                    </div>
                  </div>

                  <button className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-all font-semibold">
                    Change Password
                  </button>
                </div>

                {/* Authenticator App */}
                <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Authenticator App</h4>
                  <p className="text-gray-400 text-sm">
                    Configuring an authenticator app is a good way to add an extra layer of security to your SafeCord account to make sure
                    that you're the only one who can access it.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'profiles':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">User Profile</h2>
              <p className="text-gray-400 text-sm">
                Customize your profile with banners and about me section.
              </p>
            </div>

            {/* Banner Customization */}
            <div>
              <label className="block text-white font-semibold mb-3">Profile Banner</label>
              <div 
                className="w-full h-32 rounded-lg border-2 border-pink-500/30 overflow-hidden mb-3"
                style={{ 
                  background: banner.startsWith('data:') || banner.startsWith('http') 
                    ? `url(${banner})` 
                    : banner,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="grid grid-cols-6 gap-3">
                {BANNER_PRESETS.map((gradient, index) => (
                  <button
                    key={index}
                    onClick={() => setBanner(gradient)}
                    className={`h-16 rounded-lg border-2 transition-all hover:scale-105 ${
                      banner === gradient 
                        ? 'border-pink-500 ring-2 ring-pink-500/50' 
                        : 'border-red-500/20 hover:border-pink-500/50'
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>

            {/* About Me */}
            <div>
              <label className="block text-white font-semibold mb-2">About Me</label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Tell us about yourself"
                maxLength={190}
                rows={4}
                className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-500 resize-none"
              />
              <p className="text-gray-500 text-sm mt-1">{aboutMe.length}/190 characters</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-red-500/20">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Privacy & Safety</h2>
              <p className="text-gray-400 text-sm">
                Control who can add you as a friend, send you messages, and more.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Allow direct messages from server members</h3>
                    <p className="text-gray-400 text-sm">This applies to all servers unless overridden.</p>
                  </div>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Enable message requests</h3>
                    <p className="text-gray-400 text-sm">Allow messages from people you don't share a server with.</p>
                  </div>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-gray-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Appearance</h2>
              <p className="text-gray-400 text-sm">
                Customize how SafeCord looks with theme colors and UI options.
              </p>
            </div>

            {/* Theme Color Presets */}
            <div>
              <label className="block text-white font-semibold mb-3">Theme Colors</label>
              <div className="grid grid-cols-6 gap-3">
                {BANNER_PRESETS.map((gradient, index) => (
                  <button
                    key={index}
                    onClick={() => setBanner(gradient)}
                    className={`h-16 rounded-lg border-2 transition-all hover:scale-105 ${
                      banner === gradient 
                        ? 'border-pink-500 ring-2 ring-pink-500/50' 
                        : 'border-red-500/20 hover:border-pink-500/50'
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>

            {/* UI Density */}
            <div>
              <label className="block text-white font-semibold mb-2">Message Display</label>
              <p className="text-gray-400 text-sm mb-3">
                Adjust the space between server, channel, and member lists.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleUiDensityChange('compact')}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    uiDensity === 'compact'
                      ? 'bg-pink-600/30 border-pink-500'
                      : 'bg-[#0b1a10]/60 border-red-500/20 hover:border-pink-500/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    uiDensity === 'compact' ? 'border-pink-500' : 'border-gray-500'
                  }`}>
                    {uiDensity === 'compact' && (
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-white">Compact</span>
                </button>
                <button
                  onClick={() => handleUiDensityChange('cozy')}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    uiDensity === 'cozy'
                      ? 'bg-pink-600/30 border-pink-500'
                      : 'bg-[#0b1a10]/60 border-red-500/20 hover:border-pink-500/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    uiDensity === 'cozy' ? 'border-pink-500' : 'border-gray-500'
                  }`}>
                    {uiDensity === 'cozy' && (
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-white">Cozy</span>
                </button>
              </div>
            </div>

            {/* Seasonal Mode Toggle */}
            <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">Seasonal Themes</h3>
                  <p className="text-gray-400 text-sm">
                    Keep seasonal themes active all year round. By default, seasonal themes only show 
                    during the first week of each season/holiday (Valentine's Day, Halloween, Christmas, etc).
                  </p>
                </div>
                <button
                  onClick={handleSeasonalToggle}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                    seasonalMode ? 'bg-pink-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      seasonalMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-red-500/20">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Voice & Video</h2>
              <p className="text-gray-400 text-sm">
                Configure your microphone, camera, and other voice settings.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Input Device</label>
                <select className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option>Default</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Output Device</label>
                <select className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option>Default</option>
                </select>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Echo Cancellation</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Reduces echo in voice calls.</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Noise Suppression</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Filters out background noise.</p>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Text & Images</h2>
              <p className="text-gray-400 text-sm">
                Control how images, links, and text are displayed in chat.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Show embeds and preview website links</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Show rich previews for links posted in chat.</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Show image previews</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Display images uploaded to chat inline.</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Use stickers</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Allow stickers in your messages.</p>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Notifications</h2>
              <p className="text-gray-400 text-sm">
                Control what you're notified about and how.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Enable Desktop Notifications</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Show notifications on your desktop.</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Play a sound</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Play notification sounds.</p>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Notification Sound</label>
                <select className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option>Default</option>
                  <option>Chime</option>
                  <option>Bell</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'keybinds':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Keybinds</h2>
              <p className="text-gray-400 text-sm">
                Customize keyboard shortcuts for SafeCord.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Toggle Mute</span>
                  <kbd className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded border border-gray-600 font-mono text-sm">Ctrl + Shift + M</kbd>
                </div>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Toggle Deafen</span>
                  <kbd className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded border border-gray-600 font-mono text-sm">Ctrl + Shift + D</kbd>
                </div>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Create Server</span>
                  <kbd className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded border border-gray-600 font-mono text-sm">Ctrl + Shift + N</kbd>
                </div>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Language</h2>
              <p className="text-gray-400 text-sm">
                Select the language you want to use in SafeCord.
              </p>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Language</label>
              <select className="w-full px-4 py-3 bg-[#0b1a10]/60 border border-red-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50">
                <option>English, USA</option>
                <option>English, UK</option>
                <option>Español</option>
                <option>Français</option>
                <option>Deutsch</option>
                <option>日本語</option>
              </select>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Advanced</h2>
              <p className="text-gray-400 text-sm">
                Advanced settings for power users.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Developer Mode</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-gray-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Enable developer features and debugging tools.</p>
              </div>

              <div className="bg-[#0b1a10]/60 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Hardware Acceleration</h3>
                  <button className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-pink-600">
                    <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-6" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Uses your GPU to make SafeCord smoother.</p>
              </div>
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
      <div className="w-64 bg-[#0f1f15]/95 backdrop-blur-xl border-r border-red-500/20 overflow-y-auto scrollbar-server flex flex-col">
        <div className="flex-1 p-4">
          {/* User Info */}
          <div className="mb-6 flex items-center gap-3 p-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-500/30">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img 
                    src={getValentineImage(nickname || username)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{nickname || username}</p>
              <p className="text-gray-400 text-xs truncate">@{username}</p>
            </div>
          </div>

          <div className="h-[1px] bg-red-500/20 mb-6"></div>

          {/* User Settings */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase mb-2 px-2 font-semibold">User Settings</p>
            <button
              onClick={() => setActiveSection('account')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'account'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              My Account
            </button>
            <button
              onClick={() => setActiveSection('profiles')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'profiles'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Profiles
            </button>
            <button
              onClick={() => setActiveSection('privacy')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'privacy'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              Privacy & Safety
            </button>
          </div>

          {/* App Settings */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase mb-2 px-2 font-semibold">App Settings</p>
            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'appearance'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              Appearance
            </button>
            <button
              onClick={() => setActiveSection('voice')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'voice'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              Voice & Video
            </button>
            <button
              onClick={() => setActiveSection('text')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'text'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Text & Images
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'notifications'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              Notifications
            </button>
            <button
              onClick={() => setActiveSection('keybinds')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'keybinds'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Keybinds
            </button>
            <button
              onClick={() => setActiveSection('language')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'language'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              Language
            </button>
            <button
              onClick={() => setActiveSection('advanced')}
              className={`w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-2 ${
                activeSection === 'advanced'
                  ? 'bg-red-600/30 text-white'
                  : 'text-gray-300 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              Advanced
            </button>
          </div>
        </div>

        {/* Logout Button at Bottom */}
        <div className="p-4 border-t border-red-500/20">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#13261b]/95 backdrop-blur-xl overflow-y-auto scrollbar-messages">
        <div className="max-w-4xl mx-auto p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#0b1a10]/80 hover:bg-[#0f1f15]/80 transition-colors group z-10"
            title="Close Settings"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading profile...</div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
