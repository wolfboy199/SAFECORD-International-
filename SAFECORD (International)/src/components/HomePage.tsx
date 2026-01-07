import { useState } from 'react';
import { Phone } from 'lucide-react';
import { fn, USE_SUPABASE } from '../utils/supabase/info';
import { SafetyBanner } from './SafetyBanner';

interface HomePageProps {
  onJoinRoom: (roomCode: string, username: string) => void;
}

export function HomePage({ onJoinRoom }: HomePageProps) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(fn('room/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, ownerId: currentUserId, ownerUsername: currentUsername })
      });

      const data = await response.json();
      if (data.success) {
        onJoinRoom(data.roomCode, username);
      } else {
        alert('Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    onJoinRoom(roomCode.toUpperCase(), username);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-green-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
      
      <div className="relative bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/10">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gradient-to-br from-red-500 to-green-600 p-4 rounded-full shadow-lg shadow-red-500/50">
            <Phone className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-center mb-8 text-white">Voice Call</h1>

        <div className="space-y-6">
          <div>
            <label className="block mb-2 text-gray-300">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-700/30 backdrop-blur-sm border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full bg-gradient-to-r from-red-600 to-green-600 text-white py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-red-500/30"
          >
            {isCreating ? 'Creating...' : 'Create New Room'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-800/30 backdrop-blur-xl px-4 text-gray-400">or</span>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-gray-300">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="w-full px-4 py-3 bg-gray-700/30 backdrop-blur-sm border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            className="w-full bg-gray-700/30 backdrop-blur-sm text-white border-2 border-red-500/30 py-3 rounded-lg hover:bg-gray-700/50 transition-all"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}