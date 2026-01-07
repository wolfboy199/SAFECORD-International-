import { useState } from 'react';
import { Sparkles, Upload, Image, Sticker, Volume2, FileUp, Crown } from 'lucide-react';

interface NitroFeaturesProps {
  username: string;
  onClose: () => void;
}

export function NitroFeatures({ username, onClose }: NitroFeaturesProps) {
  const [hasNitro] = useState(true); // Free for everyone

  const nitroPerks = [
    {
      icon: <Upload className="w-5 h-5" />,
      title: 'Higher Upload Limit',
      description: 'Upload files up to 100MB (10x normal limit)',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Image className="w-5 h-5" />,
      title: 'Custom Profile Banner',
      description: 'Set a custom animated or static banner on your profile',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Sticker className="w-5 h-5" />,
      title: 'Custom Emoji',
      description: 'Use custom emoji and animated emoji everywhere',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Volume2 className="w-5 h-5" />,
      title: 'HD Voice Quality',
      description: 'Crystal-clear 128kbps voice quality in calls',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: <FileUp className="w-5 h-5" />,
      title: 'HD Video Streaming',
      description: 'Stream and share your screen in HD (1080p 60fps)',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: <Crown className="w-5 h-5" />,
      title: 'Nitro Badge',
      description: 'Show off your Nitro status with an exclusive badge',
      color: 'from-yellow-500 to-amber-500'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0a0a1f]/95 via-[#1a0a2e]/95 to-[#16213e]/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2">
                  SAFECORD Nitro
                  <span className="px-2 py-1 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/50 rounded text-xs">
                    FREE FOR ALL
                  </span>
                </h2>
                <p className="text-gray-400">Premium features at no cost</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-700/50 backdrop-blur-sm border border-white/10 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nitro Status */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white mb-1">You have Nitro!</h3>
                <p className="text-gray-300 text-sm">
                  All SAFECORD users get Nitro features for free - no subscription required.
                </p>
              </div>
              <div className="px-4 py-2 bg-green-500/30 border border-green-500/50 rounded-lg">
                <p className="text-green-200">ACTIVE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="p-6">
          <h3 className="text-white mb-4">Your Nitro Perks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nitroPerks.map((perk, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-gradient-to-br ${perk.color} rounded-lg`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white mb-1">{perk.title}</h4>
                    <p className="text-gray-400 text-sm">{perk.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-green-500/30 border border-green-500/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <p className="text-gray-300 text-sm text-center">
            Enjoy all premium features for free as part of the SAFECORD community! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
