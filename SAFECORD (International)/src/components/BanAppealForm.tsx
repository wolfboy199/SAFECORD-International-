import { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';
import { fn } from '../utils/supabase/info';

interface BanAppealFormProps {
  username: string;
  userId: string;
  banReason: string;
  bannedAt: string;
  onLogout: () => void;
}

export function BanAppealForm({ username, userId, banReason, bannedAt, onLogout }: BanAppealFormProps) {
  const [appealMessage, setAppealMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(fn('appeal/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, appealMessage: appealMessage.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubmitted(true);
        } else {
          setError(data.error || 'Failed to submit appeal');
        }
      } else {
        setError('Failed to submit appeal. Please try again later.');
      }
    } catch (err) {
      console.error('Error submitting appeal:', err);
      setError('Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1f] via-[#1a0a2e] to-[#16213e] relative overflow-hidden flex items-center justify-center p-4">
      {/* Galaxy Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-40 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
        
        {/* Nebula clouds */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-float-delay"></div>
      </div>

      <div className="relative bg-[#1a1a2e]/95 backdrop-blur-xl border border-red-500/30 rounded-2xl w-full max-w-2xl shadow-2xl shadow-red-900/50">
        {/* Header */}
        <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-900/50 to-orange-900/50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-white mb-1">Account Banned</h2>
              <p className="text-red-200">Your account has been suspended from SAFECORD</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 bg-gray-700/50 backdrop-blur-sm border border-red-500/20 text-gray-300 rounded-lg hover:bg-gray-700/70 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ban Information */}
        <div className="p-6 space-y-4">
          <div className="bg-[#0f0f1e]/80 border border-red-500/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Username</p>
                <p className="text-white">@{username}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Banned On</p>
                <p className="text-white">{new Date(bannedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-1">Ban Reason</p>
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-200">{banReason}</p>
              </div>
            </div>
          </div>

          {!submitted ? (
            <>
              {/* Appeal Form */}
              <div>
                <h3 className="text-white mb-3">Submit a Ban Appeal</h3>
                <p className="text-gray-400 text-sm mb-4">
                  If you believe this ban was a mistake, please explain your situation below. 
                  Our moderation team will review your appeal and respond accordingly.
                </p>
                
                <textarea
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                  placeholder="Explain why you believe this ban should be lifted..."
                  maxLength={1000}
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0f0f1e]/80 border border-purple-500/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-500 text-xs">
                    {appealMessage.length}/1000 characters
                  </p>
                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-200 mb-2">Appeal Guidelines:</p>
                <ul className="text-yellow-100/80 text-sm space-y-1 list-disc list-inside">
                  <li>Be honest and respectful in your appeal</li>
                  <li>Explain your side of the situation clearly</li>
                  <li>Do not make multiple appeals for the same ban</li>
                  <li>False or abusive appeals may result in permanent ban</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitAppeal}
                disabled={!appealMessage.trim() || isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {isSubmitting ? 'Submitting Appeal...' : 'Submit Appeal'}
              </button>
            </>
          ) : (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
              <div className="inline-block p-4 bg-green-500/30 rounded-full mb-4">
                <Send className="w-8 h-8 text-green-200" />
              </div>
              <h3 className="text-green-200 mb-2">Appeal Submitted Successfully</h3>
              <p className="text-green-100/80 mb-4">
                Your ban appeal has been submitted to our moderation team. 
                They will review your case and respond within 24-48 hours.
              </p>
              <p className="text-green-100/60 text-sm">
                Please check back later or wait for an email notification.
              </p>
              <button
                onClick={onLogout}
                className="mt-6 px-6 py-2 bg-gray-700/50 backdrop-blur-sm border border-green-500/20 text-green-200 rounded-lg hover:bg-gray-700/70 transition-all"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
