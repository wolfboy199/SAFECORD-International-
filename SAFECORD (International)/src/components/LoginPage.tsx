import { useState, useEffect } from 'react';
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, Calendar, FileText, X } from 'lucide-react';
import { fn } from '../utils/supabase/info';
import QRCode from 'qrcode';
import { BanAppealForm } from './BanAppealForm';
import { TermsOfService } from './TermsOfService';

interface LoginPageProps {
  onLogin: (user: { userId: string; username: string }) => void;
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showUpdates, setShowUpdates] = useState(false);
  const [showToS, setShowToS] = useState(false);
  const [bannedUser, setBannedUser] = useState<{
    userId: string;
    username: string;
    banReason: string;
    bannedAt: string;
  } | null>(null);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qr = await QRCode.toDataURL(fn('auth/login'));
        setQrCode(qr);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignup && !ageConfirmed) {
      setError('You must confirm you are 13 years or older to use SAFECORD');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    const deviceInfo = getDeviceInfo();

    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const response = await fetch(fn(`auth/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, deviceInfo, ageConfirmed }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Check if user is banned
        if (data.user.banned) {
          // Show ban appeal form instead of logging in
          setBannedUser({
            userId: data.user.userId,
            username: data.user.username,
            banReason: data.user.banReason || 'No reason provided',
            bannedAt: data.user.bannedAt || new Date().toISOString()
          });
          return;
        }

        // Check if user is timed out
        if (data.user.timedOut) {
          const timeoutEnd = new Date(data.user.timeoutEndsAt);
          const now = new Date();
          const timeLeft = timeoutEnd.getTime() - now.getTime();
          
          // Format time remaining nicely
          const seconds = Math.floor(timeLeft / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          const months = Math.floor(days / 30);
          const years = Math.floor(days / 365);
          
          let timeLeftMessage = '';
          if (years > 0) {
            timeLeftMessage = `${years} year${years > 1 ? 's' : ''}`;
          } else if (months > 0) {
            timeLeftMessage = `${months} month${months > 1 ? 's' : ''}`;
          } else if (days > 0) {
            timeLeftMessage = `${days} day${days > 1 ? 's' : ''}`;
          } else if (hours > 0) {
            timeLeftMessage = `${hours} hour${hours > 1 ? 's' : ''}`;
          } else if (minutes > 0) {
            timeLeftMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
          } else if (seconds > 0) {
            timeLeftMessage = `${seconds} second${seconds > 1 ? 's' : ''}`;
          } else {
            timeLeftMessage = 'a few seconds';
          }
          
          setError(`Your account is temporarily timed out. Reason: ${data.user.timeoutReason}. Time remaining: ${timeLeftMessage}.`);
          return;
        }

        // Save to localStorage for persistent login
        localStorage.setItem('voiceCallUser', JSON.stringify(data.user));
        
        const message = isSignup 
          ? `Welcome to SAFECORD, ${data.user.username}!` 
          : `Welcome back, ${data.user.username}!`;
        
        setSuccessMessage(message);
        
        // Wait a moment for user to see success message
        setTimeout(() => {
          onLogin(data.user);
        }, 500);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutFromBanAppeal = () => {
    setBannedUser(null);
    setUsername('');
    setPassword('');
  };

  // If user is banned, show ban appeal form
  if (bannedUser) {
    return (
      <BanAppealForm
        username={bannedUser.username}
        userId={bannedUser.userId}
        banReason={bannedUser.banReason}
        bannedAt={bannedUser.bannedAt}
        onLogout={handleLogoutFromBanAppeal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1a10] via-[#13261b] to-[#0f1f15] relative overflow-hidden flex items-center justify-center p-4">
      {/* Galaxy Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Stars */}
        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-40 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-2/3 left-2/3 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        
        {/* Nebula clouds */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-red-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-green-600/20 rounded-full blur-3xl animate-float-delay"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-float"></div>
        
        {/* Planets */}
        <div className="absolute top-10 right-1/4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full opacity-40 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-green-400 to-red-600 rounded-full opacity-30 animate-float-delay"></div>
        
        {/* Shooting stars */}
        <div className="absolute top-1/3 left-0 w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent animate-shooting-star"></div>
      </div>
      
      {/* Updates Button - Bottom Right */}
      <button
        onClick={() => setShowUpdates(true)}
        className="fixed bottom-6 right-6 p-3 bg-gray-800/50 backdrop-blur-xl border border-white/10 text-white rounded-full hover:bg-gray-700/50 transition-all shadow-lg shadow-red-500/20 z-40"
        title="Latest Updates"
      >
        <FileText className="w-5 h-5" />
      </button>

      {/* Updates Popup */}
      {showUpdates && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-red-600 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white">Latest Updates</h2>
                  <p className="text-gray-400">What&apos;s new in SAFECORD</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpdates(false)}
                className="p-2 bg-gray-700/50 backdrop-blur-sm border border-white/10 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Updates List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Update Entry */}
                <div className="bg-[#0b1a10]/80 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-red-600/30 rounded-lg">
                      <Lock className="w-5 h-5 text-red-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white mb-1">Security Settings Update</h3>
                      <p className="text-gray-400 text-sm">December 8, 2024</p>
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p>• Added Security tab in Profile Settings</p>
                    <p>• Users can now change their username and password</p>
                    <p>• Enhanced account security controls</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Container - Centered */}
      <div className="relative flex items-center gap-8 w-full max-w-5xl">
        {/* Login/Signup Card - Centered */}
        <div className="relative bg-[#0f1f15]/80 backdrop-blur-xl border border-red-500/20 rounded-lg shadow-2xl shadow-red-900/50 p-8 w-full max-w-md mx-auto lg:mx-0">
          <h2 className="text-white mb-2 text-center">
            {isSignup ? 'Create your account' : 'Welcome back!'}
          </h2>
          <p className="text-gray-400 mb-6 text-center">
            {isSignup ? "Join SAFECORD today" : "We're so excited to see you again!"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 backdrop-blur-sm border border-red-500/30 rounded text-red-200">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-900/30 backdrop-blur-sm border border-green-500/30 rounded text-green-200">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-gray-300 uppercase text-xs">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-gray-300 uppercase text-xs">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0b1a10]/80 border border-red-500/20 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent"
              />
            </div>

            {isSignup && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <input
                  type="checkbox"
                  id="age-confirm"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-red-500"
                />
                <label htmlFor="age-confirm" className="text-gray-200 text-sm">
                  I confirm that I am <strong>13 years of age or older</strong>. I understand that SAFECORD has strict content moderation and inappropriate behavior will result in a permanent ban. By signing up, I agree to the{' '}
                  <a 
                    href="https://docs.google.com/document/d/1JNo3CX9ERU6T8GCBxi1DcszdqcIQnLnoQc_f2Kz8GoE/edit?tab=t.0" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Terms of Service
                  </a>.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-green-600 text-white py-2.5 rounded hover:from-red-700 hover:to-green-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
            >
              {isLoading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log in'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
                setSuccessMessage('');
              }}
              className="text-red-400 hover:text-red-300 hover:underline text-sm transition-colors"
            >
              {isSignup
                ? 'Already have an account? Log in'
                : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Terms of Service Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowToS(true)}
              className="text-gray-400 hover:text-red-400 text-xs transition-colors underline"
            >
              View Terms of Service
            </button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="hidden lg:flex flex-col items-center bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-44 h-44" />
            ) : (
              <div className="text-gray-400">Loading QR...</div>
            )}
          </div>
          <h3 className="text-gray-800">Log in with QR Code</h3>
          <p className="text-gray-600 text-center text-sm mt-2">
            Scan this with the SAFECORD mobile app to log in instantly.
          </p>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showToS && <TermsOfService onClose={() => setShowToS(false)} />}
    </div>
  );
}