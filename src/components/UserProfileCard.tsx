import { fn } from '../utils/supabase/info';

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

interface UserProfileCardProps {
  username: string;
  onClose: () => void;
}

interface Profile {
  username: string;
  nickname: string;
  profilePicture: string | null;
  banner: string | null;
  aboutMe: string | null;
  status: string;
  customStatus: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500'
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline'
};

export function UserProfileCard({ username, onClose }: UserProfileCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(fn(`profile/${username}`));
      
      if (!response.ok) {
        // Profile endpoint might not exist yet, use defaults
        console.log('Profile endpoint not available, using defaults');
        setProfile({
          username: username,
          nickname: username,
          profilePicture: null,
          banner: null,
          aboutMe: null,
          status: 'online',
          customStatus: null
        });
        setLoading(false);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON, use defaults
        console.log('Non-JSON response, using defaults');
        setProfile({
          username: username,
          nickname: username,
          profilePicture: null,
          banner: null,
          aboutMe: null,
          status: 'online',
          customStatus: null
        });
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
      } else {
        // Use defaults if profile not found
        setProfile({
          username: username,
          nickname: username,
          profilePicture: null,
          banner: null,
          aboutMe: null,
          status: 'online',
          customStatus: null
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Use defaults on error
      setProfile({
        username: username,
        nickname: username,
        profilePicture: null,
        banner: null,
        aboutMe: null,
        status: 'online',
        customStatus: null
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile && !loading) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e]/95 backdrop-blur-xl border border-purple-500/20 rounded-xl w-full max-w-md shadow-2xl shadow-purple-900/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading profile...</div>
        ) : (
          <>
            {/* Banner */}
            <div 
              className="h-32 relative"
              style={{
                background: profile?.banner || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-sm border border-white/10 text-white rounded-lg hover:bg-black/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Picture */}
            <div className="px-6 -mt-16 relative">
              <div className="relative inline-block">
                {profile?.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.nickname}
                    className="w-28 h-28 rounded-full object-cover border-4 border-[#1a1a2e]"
                  />
                ) : (
                  <img 
                    src={getValentineImage(profile?.username || username)} 
                    alt={profile?.nickname}
                    className="w-28 h-28 rounded-full object-cover border-4 border-[#1a1a2e]"
                  />
                )}
                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full border-4 border-[#1a1a2e] flex items-center justify-center">
                  <div className={`w-full h-full rounded-full ${STATUS_COLORS[profile?.status || 'online']}`} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Username */}
              <div>
                <h2 className="text-white text-2xl">{profile?.nickname}</h2>
                <p className="text-gray-400">@{profile?.username}</p>
              </div>

              {/* Custom Status */}
              {profile?.customStatus && (
                <div className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-200 text-sm">{profile.customStatus}</p>
                </div>
              )}

              {/* About Me */}
              {profile?.aboutMe && (
                <div>
                  <h3 className="text-gray-400 text-sm mb-2">ABOUT ME</h3>
                  <div className="px-3 py-2 bg-[#0f0f1e]/80 border border-purple-500/20 rounded-lg">
                    <p className="text-gray-300">{profile.aboutMe}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="text-gray-400 text-sm mb-2">STATUS</h3>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f1e]/80 border border-purple-500/20 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[profile?.status || 'online']}`} />
                  <span className="text-gray-300">{STATUS_LABELS[profile?.status || 'online']}</span>
                </div>
              </div>

              {/* Badges (future feature) */}
              <div>
                <h3 className="text-gray-400 text-sm mb-2">BADGES</h3>
                <div className="flex items-center gap-2">
                  {['mrconny', 'mrconferce'].includes(profile?.username.toLowerCase() || '') && (
                    <div className="px-3 py-2 bg-gradient-to-r from-red-500/30 to-orange-600/30 border border-red-500/30 rounded-lg flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span className="text-red-200 text-sm">Admin</span>
                    </div>
                  )}
                  {!['mrconny', 'mrconferce'].includes(profile?.username.toLowerCase() || '') && (
                    <div className="text-gray-500 text-sm">No badges yet</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}