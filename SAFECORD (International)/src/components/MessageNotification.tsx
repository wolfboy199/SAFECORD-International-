import { useEffect } from 'react';
import { X } from 'lucide-react';
import { playNotificationSound } from '../utils/notificationSound';

interface MessageNotificationProps {
  fromUsername: string;
  message: string;
  onClose: () => void;
}

export function MessageNotification({ fromUsername, message, onClose }: MessageNotificationProps) {
  useEffect(() => {
    // Play notification sound
    playNotificationSound();

    const timer = setTimeout(onClose, 5000);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(`New message from ${fromUsername}`, {
        body: message,
        icon: '/favicon.ico',
        tag: 'new-message'
      });
    }

    return () => clearTimeout(timer);
  }, [fromUsername, message, onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f1e]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 shadow-2xl shadow-purple-900/50 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white mb-1">{fromUsername}</p>
            <p className="text-gray-300 text-sm truncate">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}