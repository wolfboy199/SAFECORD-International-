import { useEffect } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { playNotificationSound } from '../utils/notificationSound';
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

interface IncomingCallModalProps {
  callerId: string;
  callerUsername: string;
  roomCode: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerId, callerUsername, roomCode, onAccept, onDecline }: IncomingCallModalProps) {
  useEffect(() => {
    // Play notification sound
    playNotificationSound();

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('Incoming Call', {
        body: `${callerUsername} is calling you`,
        icon: '/favicon.ico',
        tag: 'incoming-call'
      });
    }
  }, [callerUsername]);

  const handleAccept = async () => {
    // Call backend to clear the incoming call
    try {
      await fetch(fn('call/accept'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: callerId })
      });
    } catch (error) {
      console.error('Error accepting call:', error);
    }
    onAccept();
  };

  const handleDecline = async () => {
    // Call backend to clear the incoming call
    try {
      await fetch(fn('call/decline'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: callerId })
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f1e]/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-900/50 max-w-md w-full animate-in zoom-in-95 duration-300">
        {/* Pulsing Ring Effect */}
        <div className="flex justify-center mb-6 relative">
          <div className="absolute w-32 h-32 rounded-full bg-red-500/20 animate-ping"></div>
          <div className="absolute w-28 h-28 rounded-full bg-red-500/30 animate-pulse"></div>
          <div className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50 relative z-10">
            <img 
              src={getValentineImage(callerUsername)} 
              alt={callerUsername}
              className="w-24 h-24 rounded-full object-cover border-4 border-red-500/50"
            />
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl mb-2">{callerUsername}</h2>
          <p className="text-purple-300 animate-pulse">is calling you...</p>
        </div>

        {/* Call Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleDecline}
            className="flex-1 px-6 py-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-300 rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
          >
            <PhoneOff className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-6 py-4 bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-300 rounded-xl hover:bg-green-500/30 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-green-500/20 hover:shadow-green-500/40 animate-pulse"
          >
            <Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}