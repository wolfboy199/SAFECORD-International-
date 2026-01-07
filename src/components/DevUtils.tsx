import { useState } from 'react';
import { fn } from '../utils/supabase/info';

/**
 * Developer Utilities Component
 * This component provides one-time initialization functions
 * To give Mark 2.0 Rank 5, call the initializeRank5() function
 */

export function DevUtils() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const initializeRank5 = async () => {
    setLoading(true);
    setStatus('Initializing...');

    try {
      const response = await fetch(fn('init-rank5'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'SAFECORD_INIT_2025' })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`✅ Success! ${data.message}`);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#16161f]/95 backdrop-blur-xl border border-purple-500/20 rounded-xl">
      <h2 className="text-white text-xl font-bold mb-4">Developer Utilities</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-[#0a0a1f]/80 border border-purple-500/20 rounded-lg">
          <h3 className="text-white font-medium mb-2">Initialize Rank 5 for Mark 2.0</h3>
          <p className="text-gray-400 text-sm mb-4">
            This will give Mark 2.0 Developer (Rank 5) permissions.
          </p>
          <button
            onClick={initializeRank5}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Initialize Rank 5'}
          </button>
        </div>

        {status && (
          <div className="p-4 bg-[#0a0a1f]/80 border border-purple-500/20 rounded-lg">
            <p className="text-white">{status}</p>
          </div>
        )}

        <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> This is a one-time initialization utility. 
            After Mark 2.0 has Rank 5, you can use the admin panel to manage ranks normally.
          </p>
        </div>
      </div>
    </div>
  );
}

// Export helper function to call from console
export async function giveRank5ToMark20() {
  try {
    const response = await fetch(fn('init-rank5'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'SAFECORD_INIT_2025' })
    });

    const data = await response.json();
    console.log('✅ Rank 5 initialization result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error initializing Rank 5:', error);
    throw error;
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).giveRank5ToMark20 = giveRank5ToMark20;
  console.log('💡 Dev Utils loaded! Run giveRank5ToMark20() to initialize Rank 5 for Mark 2.0');
}