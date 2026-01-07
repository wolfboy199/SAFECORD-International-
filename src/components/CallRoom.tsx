import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Copy, Check, Send, Image, Mic, MicOff, Users } from 'lucide-react';
import { Volume2 } from 'lucide-react';
import { fn } from '../utils/supabase/info';
import { Soundboard } from './Soundboard';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

interface Photo {
  id: string;
  userId: string;
  username: string;
  url: string;
  fileName: string;
  timestamp: string;
}

interface CallRoomProps {
  roomCode: string;
  username: string;
  userId: string;
  onLeave: () => void;
}

export function CallRoom({ roomCode, username, userId, onLeave }: CallRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectedPeers, setConnectedPeers] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pollingIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const previousParticipantsRef = useRef<string[]>([]);

  // Join room on mount
  useEffect(() => {
    joinRoom();
    startPolling();

    return () => {
      stopPolling();
      stopCall();
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle participant changes
  useEffect(() => {
    if (!isCallActive) return;

    const previous = previousParticipantsRef.current;
    const current = participants;
    
    // Find left participants (someone left)
    const leftParticipants = previous.filter(p => !current.includes(p) && p !== userId);

    // Remove peer connections for left participants
    leftParticipants.forEach(peerId => {
      closePeerConnection(peerId);
    });

    // Find new participants (someone joined)
    const newParticipants = current.filter(p => !previous.includes(p) && p !== userId);

    // Create peer connections for new participants
    newParticipants.forEach(peerId => {
      if (!peerConnectionsRef.current.has(peerId)) {
        console.log('New participant joined, creating connection:', peerId);
        createPeerConnection(peerId, true);
      }
    });

    previousParticipantsRef.current = participants;
  }, [participants, isCallActive]);

  const joinRoom = async () => {
    try {
      const response = await fetch(fn('room/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.room.messages || []);
        setPhotos(data.room.photos || []);
        const participantsList = data.room.participants || [];
        setParticipants(participantsList);
        previousParticipantsRef.current = participantsList;
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const startPolling = () => {
    pollingIntervalRef.current = window.setInterval(async () => {
      await fetchRoomData();
      if (isCallActive) {
        await fetchSignals();
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const fetchRoomData = async () => {
    try {
      const response = await fetch(fn(`room/${roomCode}`));

      const data = await response.json();
      if (data.success) {
        setMessages(data.room.messages || []);
        setPhotos(data.room.photos || []);
        setParticipants(data.room.participants || []);
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(fn('message/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId, username, text: newMessage }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
      } else if (data.banned) {
        localStorage.removeItem('voiceCallUser');
        alert(data.error);
        window.location.reload();
      } else {
        console.error('Error sending message:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const uploadPhoto = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('roomCode', roomCode);
      formData.append('userId', userId);
      formData.append('username', username);
      formData.append('file', file);

      const response = await fetch(fn('photo/upload'), { method: 'POST', body: formData });

      const data = await response.json();
      if (!data.success) {
        console.error('Error uploading photo:', data.error);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadPhoto(file);
    }
  };

  const createPeerConnection = async (peerId: string, createOffer: boolean) => {
    try {
      if (!localStreamRef.current) return;

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      
      // Add local stream tracks
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Handle incoming stream
      pc.ontrack = (event) => {
        console.log('Received remote track from', peerId);
        if (event.streams[0]) {
          setRemoteStreams(prev => new Map(prev).set(peerId, event.streams[0]));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, {
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, pc.connectionState);
        updateConnectedPeersCount();
      };

      // Store peer connection
      peerConnectionsRef.current.set(peerId, pc);

      // Create offer if initiating
      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(peerId, {
          type: 'offer',
          sdp: pc.localDescription?.toJSON(),
        });
      }

      updateConnectedPeersCount();
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const closePeerConnection = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
      updateConnectedPeersCount();
    }
  };

  const updateConnectedPeersCount = () => {
    let count = 0;
    peerConnectionsRef.current.forEach((pc) => {
      if (pc.connectionState === 'connected') {
        count++;
      }
    });
    setConnectedPeers(count);
  };

  const startCall = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      localStreamRef.current = stream;
      setIsCallActive(true);

      // Create peer connections for all existing participants
      const otherParticipants = participants.filter(p => p !== userId);
      otherParticipants.forEach(peerId => {
        createPeerConnection(peerId, true);
      });
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    setIsCallActive(false);
    setIsMuted(false);
    setConnectedPeers(0);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const sendSignal = async (toUserId: string, signal: any) => {
    try {
      await fetch(fn('signal/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, fromUserId: userId, toUserId, signal }),
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  const fetchSignals = async () => {
    try {
      const response = await fetch(fn(`signal/${roomCode}/${userId}`));

      const data = await response.json();
      if (data.success && data.signals.length > 0) {
        for (const signalData of data.signals) {
          const signalId = `${signalData.fromUserId}-${signalData.signal.type}-${signalData.timestamp}`;
          
          // Skip if already processed
          if (processedSignalsRef.current.has(signalId)) {
            continue;
          }
          
          processedSignalsRef.current.add(signalId);
          await handleSignal(signalData.fromUserId, signalData.signal);
          
          // Clean up old processed signals (keep last 100)
          if (processedSignalsRef.current.size > 100) {
            const arr = Array.from(processedSignalsRef.current);
            processedSignalsRef.current = new Set(arr.slice(-100));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const handleSignal = async (fromUserId: string, signal: any) => {
    try {
      let pc = peerConnectionsRef.current.get(fromUserId);

      // Create peer connection if it doesn't exist
      if (!pc && signal.type === 'offer') {
        await createPeerConnection(fromUserId, false);
        pc = peerConnectionsRef.current.get(fromUserId);
      }

      if (!pc) return;

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromUserId, {
          type: 'answer',
          sdp: pc.localDescription?.toJSON(),
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-green-900 flex flex-col">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
      
      {/* Header */}
      <div className="relative bg-gray-800/30 backdrop-blur-xl shadow-sm border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-white">Room: {roomCode}</h2>
            <div className="flex items-center gap-3 text-gray-300 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
              </div>
              {isCallActive && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span>{connectedPeers} connected</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/30 backdrop-blur-sm border border-white/10 text-gray-200 rounded-lg hover:bg-gray-700/50 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-red-500/30 backdrop-blur-sm border border-red-500/30 text-red-200 rounded-lg hover:bg-red-500/40 transition-all"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800/30 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg ${
                isCallActive ? 'bg-green-500/30 border-2 border-green-400 animate-pulse shadow-green-500/50' : 'bg-gray-700/30 border-2 border-white/10'
              }`}>
                {isCallActive ? (
                  isMuted ? <MicOff className="w-16 h-16 text-white" /> : <Mic className="w-16 h-16 text-white" />
                ) : (
                  <Phone className="w-16 h-16 text-white" />
                )}
              </div>

              <div className="text-center">
                {isCallActive ? (
                  <>
                    <p className="text-green-300">Call Active</p>
                    {isMuted && <p className="text-yellow-300 text-sm mt-1">Microphone muted</p>}
                  </>
                ) : (
                  <p className="text-gray-300">Ready to call</p>
                )}
              </div>

              <div className="flex gap-4">
                {!isCallActive ? (
                  <button
                    onClick={startCall}
                    className="px-8 py-4 bg-green-500/30 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-full hover:bg-green-500/40 transition-all flex items-center gap-2 shadow-lg shadow-green-500/30"
                  >
                    <Phone className="w-5 h-5" />
                    Start Call
                  </button>
                ) : (
                  <>
                    <button
                      onClick={toggleMute}
                      className={`px-6 py-3 rounded-full transition-all backdrop-blur-sm shadow-lg flex items-center gap-2 ${
                        isMuted ? 'bg-yellow-500/30 border border-yellow-500/30 text-yellow-200 shadow-yellow-500/30' : 'bg-gray-600/30 border border-white/20 text-gray-200'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      onClick={stopCall}
                      className="px-8 py-4 bg-red-500/30 backdrop-blur-sm border border-red-500/30 text-red-200 rounded-full hover:bg-red-500/40 transition-all flex items-center gap-2 shadow-lg shadow-red-500/30"
                    >
                      <PhoneOff className="w-5 h-5" />
                      End Call
                    </button>
                  </>
                )}
              </div>

              {/* Soundboard Button */}
              <button
                onClick={() => setShowSoundboard(true)}
                className="mt-4 px-6 py-3 bg-green-600/30 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-lg hover:bg-green-600/40 transition-all flex items-center gap-2 shadow-lg shadow-green-500/30"
              >
                <Volume2 className="w-5 h-5" />
                Open Soundboard
              </button>
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="bg-gray-800/30 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg p-6">
              <h3 className="mb-4 text-white">Shared Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <img
                      src={photo.url}
                      alt={photo.fileName}
                      className="w-full h-40 object-cover rounded-lg border border-white/10"
                    />
                    <p className="text-gray-300 text-sm">{photo.username}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg flex flex-col h-[600px]">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white">Messages</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 backdrop-blur-sm ${
                    message.userId === userId
                      ? 'bg-red-500/30 border border-red-500/30 text-white shadow-lg shadow-red-500/20'
                      : 'bg-gray-700/50 border border-white/10 text-gray-100'
                  }`}
                >
                  {message.userId !== userId && (
                    <p className="opacity-75 mb-1 text-sm">{message.username}</p>
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="p-2 bg-gray-700/30 backdrop-blur-sm border border-white/10 text-gray-200 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer"
              >
                <Image className="w-5 h-5" />
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-700/30 backdrop-blur-sm border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-400"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-red-500/30 backdrop-blur-sm border border-red-500/30 text-white rounded-lg hover:bg-red-500/40 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Soundboard Modal */}
      {showSoundboard && <Soundboard onClose={() => setShowSoundboard(false)} />}

      {/* Remote Audio Players */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <audio
          key={peerId}
          autoPlay
          playsInline
          muted={false}
          volume={1.0}
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
              el.volume = 1.0;
              // Try to play audio (handle browser autoplay policy)
              el.play().catch(err => {
                console.error(`Error playing audio for peer ${peerId}:`, err);
                // User interaction may be required for audio to play
              });
            }
          }}
          onPlay={() => console.log(`Audio playing for peer ${peerId}`)}
          onError={(e) => console.error(`Audio error for peer ${peerId}:`, e)}
        />
      ))}
    </div>
  );
}