// Lightweight in-browser mock server to allow the app to run on static hosts (GitHub Pages)
// Intercepts `fetch()` calls to paths starting with /make-server-b35a818f/ and returns JSON Responses.

type User = { userId: string; username: string; password: string; rank?: number; banned?: boolean; createdAt: string; lastLogin: string };

const PREFIX = '/make-server-b35a818f/';

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function readStorage(): { users: Record<string, User> } {
  try {
    const raw = localStorage.getItem('safecord:mockdb');
    if (!raw) return { users: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { users: {} };
  }
}

function writeStorage(db: { users: Record<string, User> }) {
  localStorage.setItem('safecord:mockdb', JSON.stringify(db));
}

function makeUser(username: string, password: string): User {
  return { userId: `user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, username, password, rank: 0, banned: false, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
}

async function handleRequest(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  // allow absolute URLs
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  if (!path.startsWith(PREFIX)) return fetch(input as any, init as any);

  const sub = path.slice(PREFIX.length);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

  const db = readStorage();

  // Health
  if (sub === 'health' && method === 'GET') {
    return json({ success: true, message: 'SAFECORD Mock Server healthy', timestamp: new Date().toISOString() });
  }

  // Auth signup
  if (sub === 'auth/signup' && method === 'POST') {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const { username, password, ageConfirmed } = body;
    if (!username || !password) return json({ success: false, error: 'Missing username or password' }, 400);
    if (!ageConfirmed) return json({ success: false, error: 'Age not confirmed' }, 400);
    if (db.users[username.toLowerCase()]) return json({ success: false, error: 'Username already exists' }, 400);
    const u = makeUser(username, password);
    db.users[username.toLowerCase()] = u;
    writeStorage(db);
    return json({ success: true, user: { userId: u.userId, username: u.username } });
  }

  // Auth login
  if (sub === 'auth/login' && method === 'POST') {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const { username, password } = body;
    if (!username || !password) return json({ success: false, error: 'Missing username or password' }, 400);
    const user = db.users[username.toLowerCase()];
    if (!user || user.password !== password) return json({ success: false, error: 'Invalid username or password' }, 401);
    user.lastLogin = new Date().toISOString();
    writeStorage(db);
    return json({ success: true, user: { userId: user.userId, username: user.username, banned: user.banned || false, rank: user.rank || 0 } });
  }

  // Public users list
  if (sub === 'public/users' && method === 'GET') {
    const list = Object.values(db.users).map(u => u.username);
    return json({ success: true, users: list });
  }

  // Profile
  if (sub.startsWith('profile/') && method === 'GET') {
    const username = sub.split('/')[1];
    const user = db.users[username.toLowerCase()];
    if (!user) return json({ success: false, error: 'Profile not found' }, 404);
    return json({ success: true, profile: { username: user.username, rank: user.rank || 0, profilePicture: null } });
  }

  // Admin publish-update (supports target=testers)
  if (sub === 'admin/publish-update' && method === 'POST') {
    // Minimal authorization: ensure adminUsername present
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const adminUsername = body?.adminUsername;
    if (!adminUsername) return json({ success: false, error: 'Unauthorized' }, 403);
    // In mock, accept any adminUsername
    const target = body?.target || 'all';
    return json({ success: true, message: `Mock publish to ${target} acknowledged` });
  }

  // Admin prompt (mock AI) - echoes and slightly modifies prompt
  if (sub === 'admin/prompt' && method === 'POST') {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const adminUsername = body?.adminUsername;
    const prompt = body?.prompt || '';
    if (!adminUsername) return json({ success: false, error: 'Unauthorized' }, 403);
    // Simple mock response
    const result = `Mock AI response for ${adminUsername}: ` + prompt.split('').reverse().join('').slice(0, 500);
    return json({ success: true, result });
  }

  // Default: not found
  return json({ success: false, error: 'Not found (mock)' }, 404);
}

// Patch global fetch to intercept mock routes in browser environments
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const origFetch = window.fetch.bind(window);
  // Only enable mock if not running under a real backend environment
  window.fetch = async (input: RequestInfo, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      if (path.startsWith(PREFIX)) {
        return await handleRequest(input, init);
      }
    } catch (e) {
      console.error('Mock server error', e);
      return json({ success: false, error: String(e) }, 500);
    }
    return origFetch(input as any, init as any);
  };
}

export {};
