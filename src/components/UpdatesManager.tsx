import { useState, useEffect } from 'react';
import { Code, Send, CheckSquare, X, Eye } from 'lucide-react';
import { fn } from '../utils/supabase/info';

interface Update {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'testing' | 'published';
  approvals: string[];
}

interface UpdatesManagerProps {
  username: string;
  userRank: number;
}

export function UpdatesManager({ username, userRank }: UpdatesManagerProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'updates'>('code');
  const [code, setCode] = useState('');
  const [updates, setUpdates] = useState<Update[]>([]);
  const [testingUpdate, setTestingUpdate] = useState<Update | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRank >= 1) {
      loadUpdates();
    }
    if (userRank === 4) {
      loadTestingUpdate();
    }
  }, [userRank]);

  const loadUpdates = async () => {
    try {
      const response = await fetch(fn('updates/list'));
      const data = await response.json();
      if (data.success) {
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Error loading updates:', error);
    }
  };

  const loadTestingUpdate = async () => {
    try {
      const response = await fetch(fn('updates/testing'));
      const data = await response.json();
      if (data.success && data.update) {
        setTestingUpdate(data.update);
      }
    } catch (error) {
      console.error('Error loading testing update:', error);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) {
      alert('Please enter some code!');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(fn('updates/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, command: '//code' })
      });

      const data = await response.json();
      if (data.success) {
        alert('Code submitted for testing!');
        setCode('');
        loadUpdates();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting code:', error);
      alert('Error submitting code');
    } finally {
      setLoading(false);
    }
  };

  const publishUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to publish this update to everyone?')) return;

    try {
      setLoading(true);
      const response = await fetch(fn('updates/publish'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, updateId, command: '/publish' })
      });

      const data = await response.json();
      if (data.success) {
        alert('Update published to everyone!');
        loadUpdates();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error publishing update:', error);
      alert('Error publishing update');
    } finally {
      setLoading(false);
    }
  };

  const approveUpdate = async (updateId: string) => {
    try {
      setLoading(true);
      const response = await fetch(fn('updates/approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, updateId })
      });

      const data = await response.json();
      if (data.success) {
        if (data.autoPublished) {
          alert('Update approved! 4 checkmarks reached - auto-published!');
        } else {
          alert('Update approved!');
        }
        loadTestingUpdate();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error approving update:', error);
      alert('Error approving update');
    } finally {
      setLoading(false);
    }
  };

  // Rank 4 (Tester) view
  if (userRank === 4) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-blue-200">Tester Access</h3>
              <p className="text-gray-400 text-sm">Review and approve updates before publication</p>
            </div>
          </div>

          {testingUpdate ? (
            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Update ID:</strong> {testingUpdate.id}
                </p>
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Created by:</strong> {testingUpdate.createdBy}
                </p>
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Approvals:</strong> {testingUpdate.approvals.length} / 4
                </p>
                <div className="flex gap-2 mt-2">
                  {[...Array(4)].map((_, i) => (
                    <CheckSquare
                      key={i}
                      className={`w-6 h-6 ${
                        i < testingUpdate.approvals.length
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Code Preview:</strong>
                </p>
                <pre className="bg-gray-950/80 p-4 rounded text-xs text-gray-300 overflow-auto max-h-64">
                  {testingUpdate.code}
                </pre>
              </div>

              {!testingUpdate.approvals.includes(username) && (
                <button
                  onClick={() => approveUpdate(testingUpdate.id)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-500/30 backdrop-blur-sm border border-green-500/50 text-green-200 rounded-lg hover:bg-green-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-5 h-5" />
                  Approve This Update
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No updates currently in testing.</p>
          )}
        </div>
      </div>
    );
  }

  // Mod/Admin view (Rank 1-3)
  return (
    <div className="p-6 space-y-4">
      {/* Tab Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'code'
              ? 'bg-purple-500/30 border border-purple-500/50 text-purple-200'
              : 'bg-gray-700/30 border border-white/10 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <Code className="w-4 h-4 inline mr-2" />
          Code Editor
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'updates'
              ? 'bg-purple-500/30 border border-purple-500/50 text-purple-200'
              : 'bg-gray-700/30 border border-white/10 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <Send className="w-4 h-4 inline mr-2" />
          Updates & Publishing
        </button>
      </div>

      {/* Code Editor Tab */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-purple-200">Code Editor</h3>
                <p className="text-gray-400 text-sm">Type //code to create and test new features</p>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code here..."
              className="w-full h-64 px-4 py-3 bg-gray-900/80 backdrop-blur-sm border border-purple-500/30 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 font-mono text-sm"
            />

            <button
              onClick={submitCode}
              disabled={loading}
              className="mt-4 w-full px-4 py-3 bg-purple-500/30 backdrop-blur-sm border border-purple-500/50 text-purple-200 rounded-lg hover:bg-purple-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckSquare className="w-5 h-5" />
              Submit to Testers
            </button>
          </div>
        </div>
      )}

      {/* Updates & Publishing Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-blue-200">Updates Manager</h3>
                <p className="text-gray-400 text-sm">Use /publish to release updates to everyone</p>
              </div>
            </div>

            {updates.length === 0 ? (
              <p className="text-gray-400 text-sm">No updates available.</p>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className={`bg-gray-900/50 rounded-lg p-4 border ${
                      update.status === 'published'
                        ? 'border-green-500/30'
                        : update.status === 'testing'
                        ? 'border-yellow-500/30'
                        : 'border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white text-sm">{update.id}</p>
                        <p className="text-gray-400 text-xs">By {update.createdBy}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(update.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded text-xs ${
                            update.status === 'published'
                              ? 'bg-green-500/30 border border-green-500/50 text-green-200'
                              : update.status === 'testing'
                              ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-200'
                              : 'bg-gray-500/30 border border-gray-500/50 text-gray-200'
                          }`}
                        >
                          {update.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {update.status === 'testing' && (
                      <div className="mb-3">
                        <p className="text-gray-300 text-xs mb-1">
                          Tester Approvals: {update.approvals.length} / 4
                        </p>
                        <div className="flex gap-2">
                          {[...Array(4)].map((_, i) => (
                            <CheckSquare
                              key={i}
                              className={`w-5 h-5 ${
                                i < update.approvals.length
                                  ? 'text-green-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <pre className="bg-gray-950/80 p-3 rounded text-xs text-gray-300 overflow-auto max-h-32 mb-3">
                      {update.code}
                    </pre>

                    {update.status === 'testing' && (
                      <button
                        onClick={() => publishUpdate(update.id)}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-500/30 backdrop-blur-sm border border-blue-500/50 text-blue-200 rounded-lg hover:bg-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Publish Now (Skip Testers)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
