import { useState, useEffect } from 'react';
import { Users, Hash, LogOut, Shield, Server, UserCog, Heart } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { CallRoom } from './components/CallRoom';
import { FriendsView } from './components/FriendsView';
import { AdminPanel } from './components/AdminPanelPlaceholder';
import { ServerView } from './components/ServerView';
import { ProfileSettings } from './components/ProfileSettings';
import { IncomingCallModal } from './components/IncomingCallModal';
import { SeasonalBackground } from './components/SeasonalBackground';
import { CodeEditor } from './components/CodeEditor';
import './components/DevUtils'; // Load dev utils for console access
import { DevConsole } from './components/DevConsole';
import { fn } from './utils/supabase/info';

type View = 'home' | 'friends' | 'call' | 'servers';

export default function App() {
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [friendCallInfo, setFriendCallInfo] = useState<{ friendId: string; friendUsername: string } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; callerUsername: string; roomCode: string } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userRank, setUserRank] = useState<number>(0);

  // Fetch user rank from backend
  const fetchUserRank = async (username: string) => {
    try {
      const response = await fetch(fn(`profile/${username}`));
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          // Try to get rank from profile or default to 0
          const rank = data.profile.rank || 0;
          setUserRank(rank);
          return rank;
        }
      }
      // If response is not ok or data is incomplete, just return 0 silently
      return 0;
    } catch (error) {
      // Silently fail - this is expected when profile doesn't exist yet
      // console.error('Error fetching user rank:', error);
      return 0;
    }
  };

  // Poll for rank changes every 5 seconds
  useEffect(() => {
    if (!user) return;

    const checkRankChanges = async () => {
      const newRank = await fetchUserRank(user.username);
      if (newRank !== userRank) {
        console.log(`Rank changed from ${userRank} to ${newRank}`);
        // Force re-render by updating state
        setUserRank(newRank);
      }
    };

    // Check immediately
    checkRankChanges();

    // Then check every 5 seconds
    const interval = setInterval(checkRankChanges, 5000);

    return () => clearInterval(interval);
  }, [user, userRank]);

  // Check localStorage for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('voiceCallUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchUserRank(parsedUser.username);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('voiceCallUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Poll for incoming calls
  useEffect(() => {
    if (!user || currentView === 'call') return;

    const checkIncomingCalls = async () => {
      try {
        const response = await fetch(fn(`call/incoming/${user.userId}`));
        
        if (!response.ok) {
          // Silently fail if endpoint not available
          return;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Not JSON, skip
          return;
        }
        
        const text = await response.text();
        
        if (!text || text.trim() === '') {
          return;
        }
        
        // Try to parse JSON
        try {
          const data = JSON.parse(text);
          if (data.success && data.call) {
            setIncomingCall({
              callerId: data.call.callerId,
              callerUsername: data.call.callerUsername,
              roomCode: data.call.roomCode
            });
          } else {
            setIncomingCall(null);
          }
        } catch (parseError) {
          // JSON parse error, skip silently
          return;
        }
      } catch (error) {
        // Network error or endpoint not available, fail silently
        // This prevents console spam when backend isn't deployed
        return;
      }
    };

    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 2000);

    return () => clearInterval(interval);
  }, [user, currentView]);

  // Keyboard shortcut for Code Editor (Ctrl+Shift+C for Rank 5 users)
  useEffect(() => {
    if (!user) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+C (or Cmd+Shift+C on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        
        // Only allow Rank 5 users to open code editor
        if (userRank === 5) {
          setShowCodeEditor(true);
          console.log('🔧 Code Editor opened - Rank 5 access granted');
        } else {
          console.log('❌ Code Editor access denied - Rank 5 required (Current rank:', userRank, ')');
        }
      }

      // Also support Ctrl+S to save when code editor is open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && showCodeEditor) {
        e.preventDefault();
        // The save will be handled within the CodeEditor component
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user, userRank, showCodeEditor]);

  const handleLogin = (loggedInUser: { userId: string; username: string }) => {
    setUser(loggedInUser);
    setCurrentView('friends');
    fetchUserRank(loggedInUser.username);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleJoinRoom = async (roomCode: string, name: string) => {
    setDisplayName(name);
    setCurrentRoom(roomCode);
    setCurrentView('call');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setDisplayName('');
    setFriendCallInfo(null);
    setCurrentView('friends');
  };

  const handleLogout = () => {
    localStorage.removeItem('voiceCallUser');
    setUser(null);
    setCurrentRoom(null);
    setDisplayName('');
    setCurrentView('home');
  };

  const handleStartFriendCall = (friendId: string, friendUsername: string) => {
    setFriendCallInfo({ friendId, friendUsername });
    // For simplicity, we'll create a room code based on sorted user IDs
    const roomCode = `CALL${Date.now().toString(36).toUpperCase()}`;
    setDisplayName(user!.username);
    setCurrentRoom(roomCode);
    setCurrentView('call');
  };

  const isAdmin = (username: string) => {
    const lowerUsername = username.toLowerCase();
    // Check hardcoded admins or dynamic rank >= 1 (includes rank 4 testers)
    const isInList = ['mark', 'wolfattack199', 'mrconferce2', 'tanner2680', 'im best mod', 'wyattsands123', 'mark 2.0'].includes(lowerUsername);
    const hasRank = userRank >= 1;
    const result = isInList || hasRank;
    
    console.log('Admin check:', {
      username,
      lowerUsername,
      isInList,
      userRank,
      hasRank,
      result
    });
    
    return result;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-green-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleAcceptCall = () => {
    if (incomingCall) {
      setDisplayName(user!.username);
      setCurrentRoom(incomingCall.roomCode);
      setCurrentView('call');
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
  };

  return (
    <SeasonalBackground>
      <div className="min-h-screen relative overflow-hidden flex">
        {/* Incoming Call Modal */}
        {incomingCall && (
          <IncomingCallModal
            callerId={incomingCall.callerId}
            callerUsername={incomingCall.callerUsername}
            roomCode={incomingCall.roomCode}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
          />
        )}

        {currentView === 'call' ? (
          <div className="relative flex-1 flex">
            {currentRoom && (
              <CallRoom
                roomCode={currentRoom}
                username={displayName}
                userId={user.userId}
                onLeave={handleLeaveRoom}
              />
            )}
          </div>
        ) : (
          <>
            {/* Left Sidebar - Server Icons */}
            <div className="relative w-[72px] bg-[#1a0a14]/95 backdrop-blur-xl flex flex-col items-center py-3 gap-2 border-r border-pink-500/20">
              {/* Home/SAFECORD Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center mb-2 shadow-lg shadow-pink-500/50 group relative">
                <Hash className="w-6 h-6 text-white" />
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  SAFECORD
                </div>
              </div>

              <div className="w-8 h-[2px] bg-pink-500/20 rounded-full"></div>

              {/* Friends Icon */}
              <div
                onClick={() => setCurrentView('friends')}
                className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shadow-lg group relative ${
                  currentView === 'friends'
                    ? 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-pink-500/50'
                    : 'bg-[#1f0f19]/80 hover:bg-pink-600/30 shadow-pink-900/30'
                }`}
              >
                <Users className="w-6 h-6 text-white" />
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Friends
                </div>
              </div>

              {/* Rooms Icon */}
              <div
                onClick={() => setCurrentView('home')}
                className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shadow-lg group relative ${
                  currentView === 'home'
                    ? 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-pink-500/50'
                    : 'bg-[#1f0f19]/80 hover:bg-pink-600/30 shadow-pink-900/30'
                }`}
              >
                <Hash className="w-6 h-6 text-white" />
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Voice Rooms
                </div>
              </div>

              {/* Servers Icon */}
              <div
                onClick={() => setCurrentView('servers')}
                className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shadow-lg group relative ${
                  currentView === 'servers'
                    ? 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-pink-500/50'
                    : 'bg-[#1f0f19]/80 hover:bg-pink-600/30 shadow-pink-900/30'
                }`}
              >
                <Server className="w-6 h-6 text-white" />
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Servers
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Settings/Profile Icon */}
              <div
                onClick={() => setShowProfileSettings(true)}
                className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center bg-[#1f0f19]/80 hover:bg-pink-600/30 shadow-lg shadow-pink-900/30 group relative"
              >
                <UserCog className="w-6 h-6 text-white" />
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Profile Settings
                </div>
              </div>

              {/* Admin Panel Icon */}
              {isAdmin(user.username) && (
                <div
                  onClick={() => setShowAdminPanel(true)}
                  className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center bg-gradient-to-br from-rose-700 to-pink-500 shadow-lg shadow-rose-500/30 group relative"
                >
                  <Heart className="w-6 h-6 text-white" />
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[#1a0a14]/95 backdrop-blur-xl border border-pink-500/30 rounded-lg text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Admin Panel
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="relative flex-1 flex">
              {currentView === 'home' && <HomePage onJoinRoom={handleJoinRoom} />}
              {currentView === 'friends' && (
                <FriendsView
                  currentUserId={user.userId}
                  currentUsername={user.username}
                  onStartCall={handleStartFriendCall}
                />
              )}
              {currentView === 'servers' && <ServerView currentUserId={user.userId} currentUsername={user.username} />}
            </div>
          </>
        )}

        {/* Admin Panel Modal */}
        {/* Developer Console (dev only) */}
        {isAdmin(user.username) && <DevConsole />}
        {showAdminPanel && isAdmin(user.username) && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <AdminPanel username={user.username} onClose={() => setShowAdminPanel(false)} />
          </div>
        )}

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <ProfileSettings
            username={user.username}
            onClose={() => setShowProfileSettings(false)}
          />
        )}

        {/* Code Editor Modal */}
        {showCodeEditor && (
          <CodeEditor
            userId={user.userId}
            username={user.username}
            userRank={userRank}
            onClose={() => setShowCodeEditor(false)}
          />
        )}
      </div>
    </SeasonalBackground>
  );
}