import { useState } from 'react';
import { Volume2, X } from 'lucide-react';

interface Sound {
  id: string;
  name: string;
  emoji: string;
  url: string;
}

const sounds: Sound[] = [
  {
    id: 'airhorn',
    name: 'Air Horn',
    emoji: '📢',
    url: 'https://www.myinstants.com/media/sounds/air-horn.mp3',
  },
  {
    id: 'bruh',
    name: 'Bruh',
    emoji: '😑',
    url: 'https://www.myinstants.com/media/sounds/movie_1.mp3',
  },
  {
    id: 'crickets',
    name: 'Crickets',
    emoji: '🦗',
    url: 'https://www.myinstants.com/media/sounds/crickets-chirping.mp3',
  },
  {
    id: 'drumroll',
    name: 'Drum Roll',
    emoji: '🥁',
    url: 'https://www.myinstants.com/media/sounds/drumroll-please.mp3',
  },
  {
    id: 'wow',
    name: 'Wow',
    emoji: '😮',
    url: 'https://www.myinstants.com/media/sounds/owen-wilson-wow.mp3',
  },
  {
    id: 'sadtrombone',
    name: 'Sad Trombone',
    emoji: '📯',
    url: 'https://www.myinstants.com/media/sounds/sad-trombone.mp3',
  },
  {
    id: 'applause',
    name: 'Applause',
    emoji: '👏',
    url: 'https://www.myinstants.com/media/sounds/short-crowd-cheer-6713.mp3',
  },
  {
    id: 'laugh',
    name: 'Evil Laugh',
    emoji: '😈',
    url: 'https://www.myinstants.com/media/sounds/evil-laugh.mp3',
  },
  {
    id: 'scream',
    name: 'Scream',
    emoji: '😱',
    url: 'https://www.myinstants.com/media/sounds/wilhelm-scream.mp3',
  },
  {
    id: 'suspense',
    name: 'Suspense',
    emoji: '😰',
    url: 'https://www.myinstants.com/media/sounds/dramatic-effect.mp3',
  },
  {
    id: 'john-cena',
    name: 'John Cena',
    emoji: '🎺',
    url: 'https://www.myinstants.com/media/sounds/john-cena-1.mp3',
  },
  {
    id: 'error',
    name: 'Windows Error',
    emoji: '❌',
    url: 'https://www.myinstants.com/media/sounds/windows-xp-error.mp3',
  },
  {
    id: 'boom',
    name: 'Explosion',
    emoji: '💥',
    url: 'https://www.myinstants.com/media/sounds/small-explosion-sound-effect.mp3',
  },
  {
    id: 'yay',
    name: 'Yay',
    emoji: '🎉',
    url: 'https://www.myinstants.com/media/sounds/yay-sound-effect.mp3',
  },
  {
    id: 'nope',
    name: 'Nope',
    emoji: '🙅',
    url: 'https://www.myinstants.com/media/sounds/nope-nope-nope.mp3',
  },
  {
    id: 'vine-boom',
    name: 'Vine Boom',
    emoji: '💥',
    url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3',
  },
  {
    id: 'bonk',
    name: 'Bonk',
    emoji: '🔨',
    url: 'https://www.myinstants.com/media/sounds/bonk-sound-effect.mp3',
  },
  {
    id: 'clown',
    name: 'Clown Horn',
    emoji: '🤡',
    url: 'https://www.myinstants.com/media/sounds/clown-horn.mp3',
  },
  {
    id: 'oof',
    name: 'Oof',
    emoji: '😵',
    url: 'https://www.myinstants.com/media/sounds/roblox-death-sound.mp3',
  },
  {
    id: 'bruh-moment',
    name: 'Bruh Moment',
    emoji: '🗿',
    url: 'https://www.myinstants.com/media/sounds/the-rock-eyebrow-raise-meme.mp3',
  },
];

interface SoundboardProps {
  onClose: () => void;
}

export function Soundboard({ onClose }: SoundboardProps) {
  const [playing, setPlaying] = useState<string | null>(null);

  const playSound = (sound: Sound) => {
    const audio = new Audio(sound.url);
    setPlaying(sound.id);
    
    audio.play().catch((error) => {
      console.error('Error playing sound:', error);
      setPlaying(null);
    });

    audio.onended = () => {
      setPlaying(null);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white">Soundboard</h2>
              <p className="text-gray-400">Click any sound to play</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-700/50 backdrop-blur-sm border border-white/10 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sounds Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => playSound(sound)}
                disabled={playing === sound.id}
                className={`p-4 rounded-xl backdrop-blur-sm border transition-all ${
                  playing === sound.id
                    ? 'bg-purple-500/40 border-purple-500/50 scale-95 shadow-lg shadow-purple-500/50'
                    : 'bg-gray-700/30 border-white/10 hover:bg-gray-700/50 hover:border-white/20 hover:scale-105'
                }`}
              >
                <div className="text-4xl mb-2">{sound.emoji}</div>
                <p className="text-white text-sm">{sound.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-gray-900/50">
          <p className="text-gray-400 text-center">
            Powered by MyInstants • {sounds.length} sounds available
          </p>
        </div>
      </div>
    </div>
  );
}
