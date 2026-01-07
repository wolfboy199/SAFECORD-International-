import { useState, useEffect } from 'react';
import { Shield, X, Ban, CheckCircle, AlertTriangle, User, Network, FileText, ThumbsUp, ThumbsDown, UserPlus, Skull, Eye, LogIn, Code, CheckSquare, Send, ArrowUp, ArrowDown, Heart } from 'lucide-react';
import { fn, USE_SUPABASE } from '../utils/supabase/info';

interface User {
  username: string;
  userId: string;
  banned: boolean;
  terminated: boolean;
  banReason: string | null;
  bannedAt: string | null;
  createdAt: string;
  lastLogin: string;
  deviceInfo: any;
  ipAddress?: string;
  rank?: number;
}

interface BanAppeal {
  id: string;
  userId: string;
  username: string;
  appealMessage: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  banReason: string;
  bannedAt: string;
}

interface AdminPanelProps {
  username: string;
  onClose: () => void;
}

export function AdminPanel({ username, onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'banned' | 'active' | 'terminated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deploymentError, setDeploymentError] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'appeals' | 'create' | 'code'>('users');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createdAccountDetails, setCreatedAccountDetails] = useState<{ username: string; password: string } | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandOutput, setCommandOutput] = useState<string[]>([]);

  // Check if user is co-owner (Mark, Mark 2.0, wolfattack199, Tanner2680, wyattsands123) or owner (mrconferce2)
  const isCoOwner = username.toLowerCase() === 'mark' || username.toLowerCase() === 'mark 2.0' || username.toLowerCase() === 'wolfattack199' || username.toLowerCase() === 'tanner2680' || username.toLowerCase() === 'wyattsands123';
  const isOwner = username.toLowerCase() === 'mrconferce2';
  const canTerminate = isCoOwner || isOwner;

  // Get user's admin role
  const getAdminRole = (adminUsername: string): { role: string; rank: number } | null => {
    const lowerUsername = adminUsername.toLowerCase();
    
    // Owner (mrconferce2)
    if (lowerUsername === 'mrconferce2') {
      return { role: 'Owner', rank: 3 };
    }
    
    // Co-Owners (Mark, Mark 2.0, wolfattack199, Tanner2680, wyattsands123)
    if (lowerUsername === 'mark' || lowerUsername === 'mark 2.0' || lowerUsername === 'wolfattack199' || lowerUsername === 'tanner2680' || lowerUsername === 'wyattsands123') {
      return { role: 'Co-Owner', rank: 2 };
    }
    
    // Admin/Moderators (IM BEST MOD)
    if (lowerUsername === 'im best mod') {
      return { role: 'Admin', rank: 1 };
    }
    
    return null;
  };
  
  // Check if user is protected from bans
  const isProtectedUser = (targetUsername: string): boolean => {
    const protectedUsernames = ['mrconferce', 'wyattsands123', 'wolfattack199', 'mark'];
    return protectedUsernames.includes(targetUsername.toLowerCase());
  };
  
  // Check if current admin can manage target user
  const canManageUser = (targetUsername: string): boolean => {
    const adminRole = getAdminRole(username);
    const targetRole = getAdminRole(targetUsername);
    
    if (!adminRole) return false;
    
    // Can't manage yourself
    if (username.toLowerCase() === targetUsername.toLowerCase()) return false;
    
    // If target is not an admin, any admin can manage them
    if (!targetRole) return true;
    
    // Can only manage users with lower rank
    return adminRole.rank > targetRole.rank;
  };
  
  const currentAdminRole = getAdminRole(username);

  useEffect(() => {
    // Auto-unban protected co-owners on load
    unbanProtectedCoOwners();
    fetchUsers();
    fetchAppeals();
  }, []);

  const unbanProtectedCoOwners = async () => {
    try {
      await fetch(fn('admin/unban-protected'), { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      // Silently fail - this is a background operation
      console.log('Auto-unban completed');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(fn(`admin/users/${username}`));

      if (response.status === 404) {
        // Endpoint not deployed yet - show mock data instead
        setUsers([]);
        setDeploymentError(true);
        return;
      }

      if (response.status === 403) {
        // Forbidden - endpoint exists but may need configuration
        console.warn('Admin endpoint returned 403. Using local-only mode.');
        setUsers([]);
        setDeploymentError(true);
        return;
      }

      if (!response.ok) {
        // Other errors - fail silently and show empty state
        console.warn(`Admin endpoint returned ${response.status}. Using local-only mode.`);
        setUsers([]);
        setDeploymentError(true);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setUsers([]);
        setDeploymentError(true);
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Additional frontend filter to ensure mark and wolfattack199 never show
        const filteredUsers = data.users.filter((user: User) => {
          const lowerUsername = user.username.toLowerCase();
          return lowerUsername !== 'mark' && lowerUsername !== 'wolfattack199';
        });
        setUsers(filteredUsers);
        setDeploymentError(false);
      } else {
        console.error('API error:', data.error);
        if (data.error === 'Unauthorized') {
          alert('You do not have admin permissions.');
          onClose();
        } else {
          setUsers([]);
          setDeploymentError(true);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fail silently - admin panel will show "no backend" message
      setUsers([]);
      setDeploymentError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await fetch(fn(`admin/appeals/${username}`));

      if (response.status === 404) {
        // Endpoint not deployed yet - show mock data instead
        setAppeals([]);
        setDeploymentError(true);
        return;
      }

      if (response.status === 403) {
        // Forbidden - endpoint exists but may need configuration
        console.warn('Admin endpoint returned 403. Using local-only mode.');
        setAppeals([]);
        setDeploymentError(true);
        return;
      }

      if (!response.ok) {
        // Other errors - fail silently and show empty state
        console.warn(`Admin endpoint returned ${response.status}. Using local-only mode.`);
        setAppeals([]);
        setDeploymentError(true);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setAppeals([]);
        setDeploymentError(true);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAppeals(data.appeals);
        setDeploymentError(false);
      } else {
        console.error('API error:', data.error);
        if (data.error === 'Unauthorized') {
          alert('You do not have admin permissions.');
          onClose();
        } else {
          setAppeals([]);
          setDeploymentError(true);
        }
      }
    } catch (error) {
      console.error('Error fetching appeals:', error);
      // Fail silently - admin panel will show "no backend" message
      setAppeals([]);
      setDeploymentError(true);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (targetUsername: string) => {
    const reason = prompt('Enter ban reason:');
    if (!reason) return;

    // Ask for duration
    const durationInput = prompt(
      'Enter ban duration:\n\n' +
      'Examples:\n' +
      '- "30s" for 30 seconds\n' +
      '- "5m" for 5 minutes\n' +
      '- "2h" for 2 hours\n' +
      '- "1d" for 1 day\n' +
      '- "1w" for 1 week\n' +
      '- "1mo" for 1 month\n' +
      '- "1y" for 1 year\n' +
      '- "permanent" for permanent ban\n\n' +
      'Leave empty for permanent ban:'
    );

    // Parse duration
    let duration = 'permanent';
    if (durationInput && durationInput.trim() !== '' && durationInput.toLowerCase() !== 'permanent') {
      duration = durationInput.trim().toLowerCase();
    }

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/ban'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUsername: username,
          targetUsername,
          reason,
          duration,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message || `Successfully banned ${targetUsername}`);
        await fetchUsers();
      } else {
        alert('Error banning user: ' + data.error);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Error banning user');
    } finally {
      setActionLoading(null);
    }
  };

  const unbanUser = async (targetUsername: string) => {
    if (!confirm(`Are you sure you want to unban ${targetUsername}?`)) return;

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/unban'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, targetUsername }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully unbanned ${targetUsername}`);
        await fetchUsers();
      } else {
        alert('Error unbanning user: ' + data.error);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Error unbanning user');
    } finally {
      setActionLoading(null);
    }
  };

  const ipBanUser = async (targetUsername: string) => {
    const reason = prompt('Enter IP ban reason (this will also ban the account):');
    if (!reason) return;

    if (!confirm(`Are you sure you want to IP BAN ${targetUsername}? This will permanently ban their IP address from creating new accounts.`)) return;

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/ipban'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, targetUsername, reason }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        await fetchUsers();
      } else {
        alert('Error IP banning user: ' + data.error);
      }
    } catch (error) {
      console.error('Error IP banning user:', error);
      alert('Error IP banning user');
    } finally {
      setActionLoading(null);
    }
  };

  // Placeholder to enable IP logging on the backend for moderation auditing.
  // NOTE: This requires a secure backend endpoint and proper access controls.
  const enableIPLogging = async () => {
    if (!confirm('Enable secure IP logging for moderation? This requires backend support.')) return;
    try {
      setActionLoading('ip-logging');
      const response = await fetch(fn('admin/enable-ip-logging'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username }),
      });

      const data = await response.json();
      if (data.success) {
        alert('IP logging enabled (backend acknowledged)');
      } else {
        alert('Failed to enable IP logging: ' + (data.error || 'unknown'));
      }
    } catch (error) {
      console.error('Error enabling IP logging:', error);
      alert('Error enabling IP logging');
    } finally {
      setActionLoading(null);
    }
  };

  const approveAppeal = async (appealId: string) => {
    if (!confirm(`Are you sure you want to approve this appeal?`)) return;

    try {
      setActionLoading(appealId);
      const response = await fetch(fn('admin/approve-appeal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, appealId }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully approved appeal`);
        await fetchAppeals();
      } else {
        alert('Error approving appeal: ' + data.error);
      }
    } catch (error) {
      console.error('Error approving appeal:', error);
      alert('Error approving appeal');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectAppeal = async (appealId: string) => {
    if (!confirm(`Are you sure you want to reject this appeal?`)) return;

    try {
      setActionLoading(appealId);
      const response = await fetch(fn('admin/reject-appeal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, appealId }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully rejected appeal`);
        await fetchAppeals();
      } else {
        alert('Error rejecting appeal: ' + data.error);
      }
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      alert('Error rejecting appeal');
    } finally {
      setActionLoading(null);
    }
  };

  const createUser = async () => {
    if (!newUsername || !newPassword) {
      alert('Username and password are required.');
      return;
    }

    try {
      setActionLoading('create');
      const response = await fetch(fn('admin/create-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, newUsername, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully created user ${newUsername}`);
        setCreatedAccountDetails({ username: newUsername, password: newPassword });
        setNewUsername('');
        setNewPassword('');
      } else {
        alert('Error creating user: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    } finally {
      setActionLoading(null);
    }
  };

  const setUserRank = async (targetUsername: string, newRank: number) => {
    const rankNames = ['Member', 'Admin', 'Co-Owner', 'Owner', 'Tester', 'Developer'];
    if (!confirm(`Are you sure you want to set ${targetUsername} to ${rankNames[newRank]} (Rank ${newRank})?`)) return;

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/set-rank'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, targetUsername, rank: newRank }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        await fetchUsers();
      } else {
        alert('Error setting rank: ' + data.error);
      }
    } catch (error) {
      console.error('Error setting rank:', error);
      alert('Error setting rank');
    } finally {
      setActionLoading(null);
    }
  };

  const terminateUser = async (targetUsername: string) => {
    const reason = prompt('Enter termination reason (PERMANENT, CANNOT BE APPEALED):');
    if (!reason) return;

    if (!confirm(`Are you sure you want to PERMANENTLY TERMINATE ${targetUsername}? This action cannot be undone by regular admins and the user cannot appeal.`)) return;

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/terminate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, targetUsername, reason }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully terminated ${targetUsername}`);
        await fetchUsers();
      } else {
        alert('Error terminating user: ' + data.error);
      }
    } catch (error) {
      console.error('Error terminating user:', error);
      alert('Error terminating user');
    } finally {
      setActionLoading(null);
    }
  };

  const unterminateUser = async (targetUsername: string) => {
    if (!confirm(`Are you sure you want to UNTERMINATE ${targetUsername}? This action is only available to the SAFECORD owner.`)) return;

    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('admin/unterminate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: username, targetUsername }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully unterminated ${targetUsername}`);
        await fetchUsers();
      } else {
        alert('Error unterminating user: ' + data.error);
      }
    } catch (error) {
      console.error('Error unterminating user:', error);
      alert('Error unterminating user');
    } finally {
      setActionLoading(null);
    }
  };

  const accessCreatedAccount = async (targetUsername: string, targetPassword: string) => {
    try {
      setActionLoading(targetUsername);
      const response = await fetch(fn('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, password: targetPassword }),
      });

      const data = await response.json();
      if (data.success) {
        // Store credentials to access later
        alert(`Logged in as ${targetUsername}. You can now use this account.`);
        // You could redirect or open in a new window here
      } else {
        alert('Error accessing account: ' + data.error);
      }
    } catch (error) {
      console.error('Error accessing account:', error);
      alert('Error accessing account');
    } finally {
      setActionLoading(null);
    }
  };

  const executeCommand = async () => {
    if (!commandInput.trim()) return;
    
    const command = commandInput.trim();
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    // Add command to output
    setCommandOutput(prev => [...prev, `> ${command}`]);
    
    try {
      if (cmd === '/rank') {
        const rank = parseInt(parts[1]);
        const targetUsername = parts.slice(2).join(' ');
        
        if (isNaN(rank) || !targetUsername) {
          setCommandOutput(prev => [...prev, 'Error: Invalid syntax. Usage: /rank <0-5> <username>']);
          setCommandInput('');
          return;
        }
        
        if (rank < 0 || rank > 5) {
          setCommandOutput(prev => [...prev, 'Error: Rank must be between 0-5']);
          setCommandInput('');
          return;
        }
        
        // Call the set rank API
        const response = await fetch(fn('admin/set-rank'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername: username, targetUsername, rank }),
        });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ ${data.message}`]);
          await fetchUsers();
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else if (cmd === '/publish_update') {
        // Call the publish update API
        const response = await fetch(fn('admin/publish-update'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername: username }),
        });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ ${data.message}`]);
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else if (cmd === '/code') {
        const response = await fetch(fn('code'), { method: 'GET', headers: { 'X-Username': username } });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ Access granted. Source code:`]);
          setCommandOutput(prev => [...prev, `${data.sourceCode}`]);
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else {
        setCommandOutput(prev => [...prev, `Error: Unknown command "${cmd}"`]);
      }
    } catch (error) {
      setCommandOutput(prev => [...prev, `✗ Error: ${String(error)}`]);
    }
    
    setCommandInput('');
  };

  const handleCommandKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  const filteredUsers = users
    .filter((user) => {
      if (filter === 'banned') return user.banned;
      if (filter === 'active') return !user.banned;
      if (filter === 'terminated') return user.terminated;
      return true;
    })
    .filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    total: users.length,
    banned: users.filter((u) => u.banned).length,
    active: users.filter((u) => !u.banned).length,
    terminated: users.filter((u) => u.terminated).length,
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4" onClick={(e) => {
      // Close when clicking backdrop
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="bg-gradient-to-br from-gray-900/95 via-pink-900/20 to-rose-900/30 backdrop-blur-2xl border border-pink-500/20 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with Valentine's gradient */}
        <div className="relative p-6 border-b border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-red-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 rounded-2xl shadow-lg">
                <Shield className="w-7 h-7 text-white" />
                <Heart className="absolute -top-1 -right-1 w-4 h-4 text-pink-300" />
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2 mb-1">
                  <span className="text-xl font-semibold bg-gradient-to-r from-pink-200 via-rose-200 to-red-200 bg-clip-text text-transparent">
                    Admin Control Panel
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-pink-500/30 to-rose-500/30 border border-pink-400/40 rounded-full text-sm text-pink-200 shadow-sm">
                    {username}
                  </span>
                  {currentAdminRole && (
                    <span className={`px-3 py-1 rounded-full text-sm shadow-sm ${
                      currentAdminRole.rank === 4 
                        ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/40 text-cyan-200'
                        : currentAdminRole.rank === 3 
                        ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/40 text-yellow-200'
                        : currentAdminRole.rank === 2
                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/40 text-purple-200'
                        : 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border border-blue-400/40 text-blue-200'
                    }`}>
                      {currentAdminRole.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-gray-800/60 backdrop-blur-sm border border-pink-500/20 text-gray-300 rounded-xl hover:bg-gray-800/80 hover:border-pink-400/30 transition-all duration-200 group"
            >
              <X className="w-5 h-5 group-hover:text-pink-300 transition-colors" />
            </button>
          </div>
        </div>

        {/* Stats with Valentine's gradients */}
        <div className="p-6 border-b border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent">
          <div className="grid grid-cols-3 gap-4">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-5 group hover:border-blue-300/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-all"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-blue-500/30 rounded-xl">
                  <User className="w-8 h-8 text-blue-300" />
                </div>
                <div>
                  <p className="text-blue-300 text-sm mb-1">Total Users</p>
                  <p className="text-blue-100 text-3xl font-semibold">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-teal-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-2xl p-5 group hover:border-emerald-300/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-400/20 transition-all"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-emerald-500/30 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-300" />
                </div>
                <div>
                  <p className="text-emerald-300 text-sm mb-1">Active Users</p>
                  <p className="text-emerald-100 text-3xl font-semibold">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-red-500/20 via-rose-500/15 to-pink-500/20 backdrop-blur-sm border border-red-400/30 rounded-2xl p-5 group hover:border-red-300/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-400/20 transition-all"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-red-500/30 rounded-xl">
                  <Ban className="w-8 h-8 text-red-300" />
                </div>
                <div>
                  <p className="text-red-300 text-sm mb-1">Banned Users</p>
                  <p className="text-red-100 text-3xl font-semibold">{stats.banned}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Quick actions / moderation side panel (compact) */}
        <div className="p-6 border-b border-pink-500/20 bg-gradient-to-br from-transparent to-transparent">
          <div className="flex items-start gap-6">
            <div className="w-64 bg-[#0b1112]/60 border border-pink-500/10 rounded-2xl p-3 flex flex-col gap-2">
              <button onClick={fetchUsers} className="w-full px-4 py-2 text-sm rounded-xl bg-gray-800/40 text-gray-200 hover:bg-gray-800/60 transition">Refresh Users</button>
              <button onClick={() => setActiveTab('appeals')} className="w-full px-4 py-2 text-sm rounded-xl bg-gray-800/30 text-gray-200 hover:bg-gray-800/50 transition">View Appeals</button>
              <button onClick={() => setActionLoading('mass-ban') || fetchUsers()} className="w-full px-4 py-2 text-sm rounded-xl bg-gray-800/30 text-gray-200 hover:bg-gray-800/50 transition">Quick Mass Actions</button>
              <button onClick={enableIPLogging} className="w-full px-4 py-2 text-sm rounded-xl bg-red-700/20 text-red-200 hover:bg-red-700/30 transition">Enable IP Logging</button>
              <button onClick={() => setActiveTab('code')} className="w-full px-4 py-2 text-sm rounded-xl bg-pink-600/20 text-pink-200 hover:bg-pink-600/30 transition">Open Dev Console</button>
            </div>
            <div className="flex-1">
              {/* Existing search & filters remain below; this area intentionally left as spacer to keep layout tidy. */}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-pink-500/20 space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full px-5 py-3 bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400/50 placeholder-gray-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-pink-500/40 to-rose-500/40 border border-pink-400/50 text-pink-100 shadow-lg'
                  : 'bg-gray-800/30 border border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600/50'
              }`}
            >
              All <span className="ml-1.5 text-xs opacity-80">({stats.total})</span>
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 ${
                filter === 'active'
                  ? 'bg-gradient-to-r from-emerald-500/40 to-green-500/40 border border-emerald-400/50 text-emerald-100 shadow-lg'
                  : 'bg-gray-800/30 border border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600/50'
              }`}
            >
              Active <span className="ml-1.5 text-xs opacity-80">({stats.active})</span>
            </button>
            <button
              onClick={() => setFilter('banned')}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 ${
                filter === 'banned'
                  ? 'bg-gradient-to-r from-red-500/40 to-rose-500/40 border border-red-400/50 text-red-100 shadow-lg'
                  : 'bg-gray-800/30 border border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600/50'
              }`}
            >
              Banned <span className="ml-1.5 text-xs opacity-80">({stats.banned})</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-pink-500/20">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-t-xl transition-all duration-200 relative ${
                activeTab === 'users'
                  ? 'bg-gradient-to-b from-pink-500/20 to-transparent border-t border-x border-pink-400/40 text-pink-200'
                  : 'bg-gray-800/20 border border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500"></div>}
              Users
            </button>
            <button
              onClick={() => setActiveTab('appeals')}
              className={`px-6 py-3 rounded-t-xl transition-all duration-200 relative ${
                activeTab === 'appeals'
                  ? 'bg-gradient-to-b from-pink-500/20 to-transparent border-t border-x border-pink-400/40 text-pink-200'
                  : 'bg-gray-800/20 border border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              {activeTab === 'appeals' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500"></div>}
              Appeals
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 rounded-t-xl transition-all duration-200 relative ${
                activeTab === 'create'
                  ? 'bg-gradient-to-b from-pink-500/20 to-transparent border-t border-x border-pink-400/40 text-pink-200'
                  : 'bg-gray-800/20 border border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500"></div>}
              Create User
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-6 py-3 rounded-t-xl transition-all duration-200 relative ${
                activeTab === 'code'
                  ? 'bg-gradient-to-b from-pink-500/20 to-transparent border-t border-x border-pink-400/40 text-pink-200'
                  : 'bg-gray-800/20 border border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              {activeTab === 'code' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500"></div>}
              Command Line
            </button>
          </div>
        </div>

        {/* Users List */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            {deploymentError ? (
              <div className="text-center py-8">
                <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="text-yellow-200 mb-2">Deployment Required</h3>
                      <p className="text-yellow-100/80 mb-4">
                        The admin endpoints are not available yet. The Supabase Edge Function needs to be redeployed to activate the admin panel features.
                      </p>
                      <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                        <p className="text-gray-300 text-sm">
                          <strong>To fix this:</strong>
                        </p>
                        <ol className="text-gray-400 text-sm mt-2 space-y-1 list-decimal list-inside">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Navigate to Edge Functions</li>
                          <li>Find the &quot;server&quot; function</li>
                          <li>Click &quot;Deploy&quot; to redeploy with the latest changes</li>
                        </ol>
                      </div>
                      <button
                        onClick={() => {
                          setDeploymentError(false);
                          fetchUsers();
                        }}
                        className="px-4 py-2 bg-yellow-500/30 border border-yellow-500/50 text-yellow-200 rounded-lg hover:bg-yellow-500/40 transition-all"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center text-gray-400 py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No users found</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.userId}
                    className={`relative overflow-hidden bg-gray-800/40 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 hover:bg-gray-800/60 ${
                      user.banned ? 'border-red-500/40 shadow-red-500/10' : 'border-pink-500/20 hover:border-pink-400/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-white text-lg">{user.username}</p>
                          {user.rank !== undefined && user.rank > 0 && (
                            <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-sm ${
                              user.rank === 5
                                ? 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 border border-pink-400/50 text-pink-200'
                                : user.rank === 4 
                                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 text-cyan-200'
                                : user.rank === 3 
                                ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/50 text-yellow-200'
                                : user.rank === 2
                                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 text-purple-200'
                                : 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border border-blue-400/50 text-blue-200'
                            }`}>
                              <Shield className="w-3.5 h-3.5" />
                              {user.rank === 5 ? 'DEVELOPER' : user.rank === 4 ? 'TESTER' : user.rank === 3 ? 'OWNER' : user.rank === 2 ? 'CO-OWNER' : 'ADMIN'}
                            </span>
                          )}
                          {user.terminated && (
                            <span className="px-3 py-1 bg-gradient-to-r from-gray-600/30 to-gray-700/30 border border-gray-500/50 text-gray-200 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                              <Skull className="w-3.5 h-3.5" />
                              TERMINATED
                            </span>
                          )}
                          {user.banned && !user.terminated && (
                            <span className="px-3 py-1 bg-gradient-to-r from-red-500/30 to-rose-500/30 border border-red-400/50 text-red-200 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                              <Ban className="w-3.5 h-3.5" />
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 space-y-2">
                          <p className="text-xs">User ID: <span className="text-gray-300">{user.userId}</span></p>
                          <div className="flex gap-4 text-xs">
                            <p>Created: <span className="text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</span></p>
                            <p>Last Login: <span className="text-gray-300">{new Date(user.lastLogin).toLocaleDateString()}</span></p>
                          </div>
                          {user.banned && user.banReason && (
                            <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-red-200 text-xs">
                                    <strong>Ban Reason:</strong> {user.banReason}
                                  </p>
                                  <p className="text-red-200/70 text-xs mt-1">
                                    Banned: {new Date(user.bannedAt!).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {user.ipAddress && (
                            <div className="mt-3 p-3 bg-gray-900/30 border border-gray-600/30 rounded-xl">
                              <div className="flex items-start gap-2">
                                <Network className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-gray-200 text-xs">
                                    <strong>IP Address:</strong> {user.ipAddress}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {user.banned ? (
                            <button
                              onClick={() => unbanUser(user.username)}
                              disabled={actionLoading === user.username}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-200 rounded-xl hover:from-emerald-500/40 hover:to-green-500/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => banUser(user.username)}
                              disabled={actionLoading === user.username || isProtectedUser(user.username)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500/30 to-rose-500/30 border border-red-400/50 text-red-200 rounded-xl hover:from-red-500/40 hover:to-rose-500/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              <Ban className="w-4 h-4" />
                              Ban
                            </button>
                          )}
                          {user.ipAddress && (
                            <button
                              onClick={() => ipBanUser(user.username)}
                              disabled={actionLoading === user.username}
                              className="px-4 py-2 bg-gradient-to-r from-red-600/30 to-rose-600/30 border border-red-500/50 text-red-200 rounded-xl hover:from-red-600/40 hover:to-rose-600/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              <Network className="w-4 h-4" />
                              IP Ban
                            </button>
                          )}
                        </div>
                        {canTerminate && (
                          <div className="flex gap-2">
                            {user.terminated ? (
                              <button
                                onClick={() => unterminateUser(user.username)}
                                disabled={actionLoading === user.username}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-200 rounded-xl hover:from-emerald-500/40 hover:to-green-500/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Unterminate
                              </button>
                            ) : (
                              <button
                                onClick={() => terminateUser(user.username)}
                                disabled={actionLoading === user.username}
                                className="px-4 py-2 bg-gradient-to-r from-gray-600/30 to-gray-700/30 border border-gray-500/50 text-gray-200 rounded-xl hover:from-gray-600/40 hover:to-gray-700/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                              >
                                <Skull className="w-4 h-4" />
                                Terminate
                              </button>
                            )}
                          </div>
                        )}
                        {(currentAdminRole && (currentAdminRole.rank === 2 || currentAdminRole.rank === 3)) && (
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={() => setUserRank(user.username, 1)}
                              disabled={actionLoading === user.username}
                              className="px-3 py-1.5 bg-blue-500/30 border border-blue-400/50 text-blue-200 rounded-lg text-xs hover:bg-blue-500/40 transition-all disabled:opacity-50 flex items-center gap-1"
                              title="Set to Admin"
                            >
                              <ArrowUp className="w-3 h-3" />
                              R1
                            </button>
                            <button
                              onClick={() => setUserRank(user.username, 2)}
                              disabled={actionLoading === user.username || currentAdminRole.rank < 3}
                              className="px-3 py-1.5 bg-purple-500/30 border border-purple-400/50 text-purple-200 rounded-lg text-xs hover:bg-purple-500/40 transition-all disabled:opacity-50 flex items-center gap-1"
                              title="Set to Co-Owner"
                            >
                              <ArrowUp className="w-3 h-3" />
                              R2
                            </button>
                            <button
                              onClick={() => setUserRank(user.username, 4)}
                              disabled={actionLoading === user.username}
                              className="px-3 py-1.5 bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 rounded-lg text-xs hover:bg-cyan-500/40 transition-all disabled:opacity-50 flex items-center gap-1"
                              title="Set to Tester"
                            >
                              <ArrowUp className="w-3 h-3" />
                              R4
                            </button>
                            <button
                              onClick={() => setUserRank(user.username, 5)}
                              disabled={actionLoading === user.username || currentAdminRole.rank !== 3}
                              className="px-3 py-1.5 bg-pink-500/30 border border-pink-400/50 text-pink-200 rounded-lg text-xs hover:bg-pink-500/40 transition-all disabled:opacity-50 flex items-center gap-1"
                              title="Set to Developer (Owner Only)"
                            >
                              <ArrowUp className="w-3 h-3" />
                              R5
                            </button>
                            <button
                              onClick={() => setUserRank(user.username, 0)}
                              disabled={actionLoading === user.username}
                              className="px-3 py-1.5 bg-gray-500/30 border border-gray-400/50 text-gray-200 rounded-lg text-xs hover:bg-gray-500/40 transition-all disabled:opacity-50 flex items-center gap-1"
                              title="Set to Member"
                            >
                              <ArrowDown className="w-3 h-3" />
                              R0
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appeals List */}
        {activeTab === 'appeals' && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            {deploymentError ? (
              <div className="text-center py-8">
                <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="text-yellow-200 mb-2">Deployment Required</h3>
                      <p className="text-yellow-100/80 mb-4">
                        The admin endpoints are not available yet. The Supabase Edge Function needs to be redeployed to activate the admin panel features.
                      </p>
                      <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                        <p className="text-gray-300 text-sm">
                          <strong>To fix this:</strong>
                        </p>
                        <ol className="text-gray-400 text-sm mt-2 space-y-1 list-decimal list-inside">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Navigate to Edge Functions</li>
                          <li>Find the &quot;server&quot; function</li>
                          <li>Click &quot;Deploy&quot; to redeploy with the latest changes</li>
                        </ol>
                      </div>
                      <button
                        onClick={() => {
                          setDeploymentError(false);
                          fetchAppeals();
                        }}
                        className="px-4 py-2 bg-yellow-500/30 border border-yellow-500/50 text-yellow-200 rounded-lg hover:bg-yellow-500/40 transition-all"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center text-gray-400 py-8">Loading appeals...</div>
            ) : appeals.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No appeals found</div>
            ) : (
              <div className="space-y-3">
                {appeals.map((appeal) => (
                  <div
                    key={appeal.id}
                    className={`relative overflow-hidden bg-gray-800/40 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 hover:bg-gray-800/60 ${
                      appeal.status === 'pending'
                        ? 'border-yellow-400/40 shadow-yellow-500/10'
                        : appeal.status === 'approved'
                        ? 'border-emerald-400/40 shadow-emerald-500/10'
                        : 'border-red-400/40 shadow-red-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-white text-lg">{appeal.username}</p>
                          {appeal.status === 'pending' && (
                            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/50 text-yellow-200 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              PENDING
                            </span>
                          )}
                          {appeal.status === 'approved' && (
                            <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-200 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                              <ThumbsUp className="w-3.5 h-3.5" />
                              APPROVED
                            </span>
                          )}
                          {appeal.status === 'rejected' && (
                            <span className="px-3 py-1 bg-gradient-to-r from-red-500/30 to-rose-500/30 border border-red-400/50 text-red-200 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                              <ThumbsDown className="w-3.5 h-3.5" />
                              REJECTED
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 space-y-2">
                          <p className="text-xs">User ID: <span className="text-gray-300">{appeal.userId}</span></p>
                          <div className="flex gap-4 text-xs">
                            <p>Created: <span className="text-gray-300">{new Date(appeal.createdAt).toLocaleDateString()}</span></p>
                            {appeal.reviewedAt && (
                              <p>Reviewed: <span className="text-gray-300">{new Date(appeal.reviewedAt).toLocaleDateString()}</span></p>
                            )}
                          </div>
                          {appeal.reviewedBy && (
                            <p className="text-xs">Reviewed By: <span className="text-gray-300">{appeal.reviewedBy}</span></p>
                          )}
                          {appeal.banReason && (
                            <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-red-200 text-xs">
                                    <strong>Ban Reason:</strong> {appeal.banReason}
                                  </p>
                                  <p className="text-red-200/70 text-xs mt-1">
                                    Banned: {new Date(appeal.bannedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {appeal.appealMessage && (
                            <div className="mt-3 p-3 bg-gray-900/30 border border-gray-600/30 rounded-xl">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-gray-200 text-xs">
                                    <strong>Appeal Message:</strong> {appeal.appealMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {appeal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveAppeal(appeal.id)}
                              disabled={actionLoading === appeal.id}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-200 rounded-xl hover:from-emerald-500/40 hover:to-green-500/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectAppeal(appeal.id)}
                              disabled={actionLoading === appeal.id}
                              className="px-4 py-2 bg-gradient-to-r from-red-500/30 to-rose-500/30 border border-red-400/50 text-red-200 rounded-xl hover:from-red-500/40 hover:to-rose-500/40 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              <ThumbsDown className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create User Form */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            {deploymentError ? (
              <div className="text-center py-8">
                <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="text-yellow-200 mb-2">Deployment Required</h3>
                      <p className="text-yellow-100/80 mb-4">
                        The admin endpoints are not available yet. The Supabase Edge Function needs to be redeployed to activate the admin panel features.
                      </p>
                      <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                        <p className="text-gray-300 text-sm">
                          <strong>To fix this:</strong>
                        </p>
                        <ol className="text-gray-400 text-sm mt-2 space-y-1 list-decimal list-inside">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Navigate to Edge Functions</li>
                          <li>Find the &quot;server&quot; function</li>
                          <li>Click &quot;Deploy&quot; to redeploy with the latest changes</li>
                        </ol>
                      </div>
                      <button
                        onClick={() => {
                          setDeploymentError(false);
                          fetchUsers();
                        }}
                        className="px-4 py-2 bg-yellow-500/30 border border-yellow-500/50 text-yellow-200 rounded-lg hover:bg-yellow-500/40 transition-all"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6">
                  <h3 className="text-pink-200 text-lg mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Create New User Account
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-4 py-3 bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 transition-all"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-3 bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 transition-all"
                    />
                    <button
                      onClick={createUser}
                      disabled={actionLoading === 'create'}
                      className="w-full px-4 py-3 bg-gradient-to-r from-pink-500/30 to-rose-500/30 border border-pink-400/50 text-pink-200 rounded-xl hover:from-pink-500/40 hover:to-rose-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create User Account
                    </button>
                  </div>
                </div>
                {createdAccountDetails && (
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6">
                    <h4 className="text-emerald-200 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Account Created Successfully
                    </h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-gray-300 text-sm">
                        <strong>Username:</strong> {createdAccountDetails.username}
                      </p>
                      <p className="text-gray-300 text-sm">
                        <strong>Password:</strong> {createdAccountDetails.password}
                      </p>
                    </div>
                    <button
                      onClick={() => accessCreatedAccount(createdAccountDetails.username, createdAccountDetails.password)}
                      disabled={actionLoading === createdAccountDetails.username}
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-200 rounded-xl hover:from-emerald-500/40 hover:to-green-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <LogIn className="w-5 h-5" />
                      Access Account
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Command Line */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            {deploymentError ? (
              <div className="text-center py-8">
                <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="text-yellow-200 mb-2">Deployment Required</h3>
                      <p className="text-yellow-100/80 mb-4">
                        The admin endpoints are not available yet. The Supabase Edge Function needs to be redeployed to activate the admin panel features.
                      </p>
                      <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                        <p className="text-gray-300 text-sm">
                          <strong>To fix this:</strong>
                        </p>
                        <ol className="text-gray-400 text-sm mt-2 space-y-1 list-decimal list-inside">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Navigate to Edge Functions</li>
                          <li>Find the &quot;server&quot; function</li>
                          <li>Click &quot;Deploy&quot; to redeploy with the latest changes</li>
                        </ol>
                      </div>
                      <button
                        onClick={() => {
                          setDeploymentError(false);
                          fetchUsers();
                        }}
                        className="px-4 py-2 bg-yellow-500/30 border border-yellow-500/50 text-yellow-200 rounded-lg hover:bg-yellow-500/40 transition-all"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-sm border border-blue-400/40 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="w-6 h-6 text-blue-400" />
                    <h3 className="text-blue-200 text-lg">Available Commands</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/rank 0 &lt;username&gt;</strong> - Set user to Member role</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/rank 1 &lt;username&gt;</strong> - Set user to Admin role</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/rank 2 &lt;username&gt;</strong> - Set user to Co-Owner role (Owner only)</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/rank 3 &lt;username&gt;</strong> - Set user to Owner role (Owner only)</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/rank 4 &lt;username&gt;</strong> - Set user to Tester role</p>
                    </div>
                    <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 rounded-xl p-3 border border-pink-500/40">
                      <p className="text-pink-300 text-sm"><strong>/rank 5 &lt;username&gt;</strong> - Set user to Developer role</p>
                      <p className="text-pink-200/70 text-xs mt-1">🔒 Only Owner (mrconferce2 or Mark 2.0) can assign this rank</p>
                      <p className="text-pink-200/70 text-xs">✨ Developers can: edit code, publish updates, access source files, view banned users</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/publish_update</strong> - Publish updates to all users</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-gray-300 text-sm"><strong>/code</strong> - Access source code (Rank 5 Developer only)</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6">
                  <p className="text-pink-200 mb-3 flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Command Terminal
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      placeholder="Enter command..."
                      className="flex-1 px-4 py-3 bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 transition-all"
                      onKeyPress={handleCommandKeyPress}
                    />
                    <button
                      onClick={executeCommand}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500/30 to-rose-500/30 border border-pink-400/50 text-pink-200 rounded-xl hover:from-pink-500/40 hover:to-rose-500/40 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Send className="w-5 h-5" />
                      Execute
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6">
                  <p className="text-pink-200 mb-3">
                    <strong>Output:</strong>
                  </p>
                  <div className="bg-black/40 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm border border-gray-700/50">
                    {commandOutput.length === 0 ? (
                      <p className="text-gray-500">No output yet. Execute a command to see results here.</p>
                    ) : (
                      commandOutput.map((output, index) => (
                        <p key={index} className={`${output.startsWith('>') ? 'text-blue-300' : output.startsWith('✓') ? 'text-green-300' : output.startsWith('✗') || output.startsWith('Error') ? 'text-red-300' : 'text-gray-400'}`}>
                          {output}
                        </p>
                      ))
                    )}
                  </div>
                  {commandOutput.length > 0 && (
                    <button
                      onClick={() => setCommandOutput([])}
                      className="mt-3 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-700/70 transition-all text-sm"
                    >
                      Clear Output
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}