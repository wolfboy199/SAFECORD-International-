import { Router } from 'itty-router'
import bcrypt from 'bcryptjs'

// Simple router using itty-router to handle endpoints
const router = Router()

// Worker KV binding: KV_STORE (set in wrangler.toml)
declare const KV_STORE: KVNamespace

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

// Health
router.get('/make-server-b35a818f/health', () => {
  return jsonResponse({ success: true, message: 'SAFECORD Worker healthy', timestamp: new Date().toISOString() })
})

// Signup
router.post('/make-server-b35a818f/auth/signup', async (req) => {
  try {
    const body = await req.json()
    const { username, password, deviceInfo, ageConfirmed } = body
    if (!username || !password) return jsonResponse({ success: false, error: 'Missing username or password' }, 400)
    if (!ageConfirmed) return jsonResponse({ success: false, error: 'Age not confirmed' }, 400)

    const existing = await KV_STORE.get(`user:${username}`)
    if (existing) return jsonResponse({ success: false, error: 'Username already exists' }, 400)

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2,9)}`
    const userData = { userId, username, passwordHash, deviceInfo: deviceInfo || null, ageConfirmed: true, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), banned: false }

    await KV_STORE.put(`user:${username}`, JSON.stringify(userData))
    await KV_STORE.put(`user_by_id:${userId}`, JSON.stringify(userData))

    // update users:list
    const listRaw = await KV_STORE.get('users:list')
    const list = listRaw ? JSON.parse(listRaw) : []
    if (!list.includes(username)) {
      list.push(username)
      await KV_STORE.put('users:list', JSON.stringify(list))
    }

    return jsonResponse({ success: true, user: { userId, username } })
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500)
  }
})

// Login
router.post('/make-server-b35a818f/auth/login', async (req) => {
  try {
    const body = await req.json()
    const { username, password, deviceInfo } = body
    if (!username || !password) return jsonResponse({ success: false, error: 'Missing username or password' }, 400)

    const raw = await KV_STORE.get(`user:${username}`)
    if (!raw) return jsonResponse({ success: false, error: 'Invalid username or password' }, 401)
    const userData = JSON.parse(raw)
    const match = await bcrypt.compare(password, userData.passwordHash)
    if (!match) return jsonResponse({ success: false, error: 'Invalid username or password' }, 401)

    // update lastLogin
    userData.lastLogin = new Date().toISOString()
    await KV_STORE.put(`user:${username}`, JSON.stringify(userData))

    return jsonResponse({ success: true, user: { userId: userData.userId, username: userData.username, banned: userData.banned || false } })
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500)
  }
})

// Public users list (usernames only)
router.get('/make-server-b35a818f/public/users', async () => {
  try {
    const raw = await KV_STORE.get('users:list')
    const list = raw ? JSON.parse(raw) : []
    return jsonResponse({ success: true, users: list })
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500)
  }
})

// Basic fallback
router.all('*', () => new Response('Not found', { status: 404 }))

addEventListener('fetch', (event) => {
  event.respondWith(router.handle(event.request))
})
