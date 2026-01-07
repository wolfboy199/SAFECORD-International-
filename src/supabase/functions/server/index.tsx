import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Initialize storage bucket for photos
const BUCKET_NAME = "make-b35a818f-call-photos";
const initStorage = async () => {
  try {
    const { data: buckets } =
      await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(
      (bucket) => bucket.name === BUCKET_NAME,
    );
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
    }
  } catch (error) {
    // Storage initialization error
  }
};

initStorage();

// Migrate any plaintext passwords stored as `password` to `passwordHash` so logins keep working
const migratePlaintextPasswords = async () => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    if (!allUsers || allUsers.length === 0) return;

    for (const u of allUsers) {
      try {
        const username = u.username;
        if (!username) continue;

        // If user record contains plaintext `password` and no `passwordHash`, hash it and store
        if (u.password && !u.passwordHash) {
          const hash = await bcrypt.hash(u.password, 10);
          u.passwordHash = hash;
          delete u.password;
          await kv.set(`user:${username}`, u);
          if (u.userId) await kv.set(`user_by_id:${u.userId}`, u);
          console.log(`Migrated plaintext password for user:${username}`);
        }
      } catch (err) {
        console.warn('Migration sub-item failed', err);
      }
    }
  } catch (err) {
    console.warn('Password migration failed', err);
  }
};

// Ensure protected admin accounts exist; if missing create with generated password (logged to server only)
const ensureProtectedAdmins = async () => {
  const protectedUsers = ['mark 2.0', 'mrconferce2'];
  for (const username of protectedUsers) {
    try {
      const existing = await kv.get(`user:${username}`);
      if (!existing) {
        const generatedPassword = Math.random().toString(36).slice(2, 12) + '!A1';
        const passwordHash = await bcrypt.hash(generatedPassword, 10);
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
        const adminRole = getAdminRole(username);
        const userData = {
          userId,
          username,
          passwordHash,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          banned: false,
          ipAddress: '127.0.0.1',
          rank: adminRole ? adminRole.rank : 3,
        };
        await kv.set(`user:${username}`, userData);
        await kv.set(`user_by_id:${userId}`, userData);
        // add to users:list
        try {
          const existingList = (await kv.get('users:list')) || [];
          if (!existingList.includes(username)) {
            existingList.push(username);
            await kv.set('users:list', existingList);
          }
        } catch {}
        console.log(`Created protected admin ${username} with generated password (server log only)`);
      }
    } catch (err) {
      console.warn('ensureProtectedAdmins failed for', username, err);
    }
  }
};

// Run migrations at startup
migratePlaintextPasswords().catch((e) => console.warn('Migration error', e));
ensureProtectedAdmins().catch((e) => console.warn('Ensure protected admins error', e));

// Generate unique room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(
      Math.floor(Math.random() * chars.length),
    );
  }
  return code;
}

// Health check endpoint
app.get("/make-server-b35a818f/health", (c) => {
  return c.json({
    success: true,
    message: "SAFECORD SAFECORD Server RRunning",
    timestamp: new Date().toISOString(),
    version: "1.0.2-deployment-fix2-deployment-fix",
    endpoints: [
      "auth",
      "room",
      "message",
      "photo",
      "dm",
      "friends",
      "soundboard",
      "admin",
      "server",
    ],
    admins: [
      "mrconferce2",
      "mark",
      "mark 2.0",
      "wolfattack199",
      "tanner2680",
      "im best mod",
      "wyattsands123",
    ],
    admins: [
      "mrconferce2",
      "mark",
      "mark 2.0",
      "wolfattack199",
      "tanner2680",
      "im best mod",
      "wyattsands123",
    ],
  });
});

// Auto-unban protected co-owners (mark and wolfattack199)
app.post("/make-server-b35a818f/admin/unban-protected", async (c) => {
  try {
    const protectedCoOwners = ['mark', 'wolfattack199', 'mark 2.0'];
    
    for (const username of protectedCoOwners) {
      const userData = await kv.get(`user:${username}`);
      if (userData && userData.banned) {
        userData.banned = false;
        userData.banReason = null;
        userData.bannedAt = null;
        await kv.set(`user:${username}`, userData);
      }
    }

    return c.json({
      success: true,
      message: 'Protected co-owners unbanned successfully',
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// User signup
app.post("/make-server-b35a818f/auth/signup", async (c) => {
  try {
    const { username, password, deviceInfo, ageConfirmed } =
      await c.req.json();

    // Get user's IP address
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "unknown";

    // Check if IP is banned
    const ipBan = await kv.get(`ipban:${ip}`);
    if (ipBan) {
      return c.json(
        {
          success: false,
          error: `This IP address has been permanently banned. Reason: ${ipBan.reason}`,
        },
        403,
      );
    }

    if (!ageConfirmed) {
      return c.json(
        {
          success: false,
          error: "You must confirm you are 13 years or older",
        },
        400,
      );
    }

    // Check if user exists
    const existingUser = await kv.get(`user:${username}`);
    if (existingUser) {
      return c.json(
        { success: false, error: "Username already exists" },
        400,
      );
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get admin role/rank if applicable
    const adminRole = getAdminRole(username);
    const userRank = adminRole ? adminRole.rank : 0;
    
    // Hash password before storing for security
    const passwordHash = await bcrypt.hash(password, 10);

    const userData = {
      userId,
      username,
      passwordHash,
      deviceInfo,
      ageConfirmed,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      banned: false,
      ipAddress: ip,
      rank: userRank,
    };

    await kv.set(`user:${username}`, userData);
    // Store a reference by userId for easy lookup
    await kv.set(`user_by_id:${userId}`, userData);

    // Maintain a simple users:list (usernames only) for public listing (no passwords)
    try {
      const existingList = (await kv.get('users:list')) || [];
      if (!existingList.includes(username)) {
        existingList.push(username);
        await kv.set('users:list', existingList);
      }
    } catch (e) {
      // non-fatal
    }

    // Logging removed to prevent JSON response corruption

    return c.json({
      success: true,
      user: { userId, username },
    });
  } catch (error) {
    // Error logged to stderr to prevent JSON corruption
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// User login
app.post("/make-server-b35a818f/auth/login", async (c) => {
  try {
    const { username, password, deviceInfo } =
      await c.req.json();

    // Get user's IP address
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "unknown";

    // Check if IP is banned
    const ipBan = await kv.get(`ipban:${ip}`);
    if (ipBan) {
      return c.json(
        {
          success: false,
          error: `This IP address has been permanently banned. Reason: ${ipBan.reason}`,
        },
        403,
      );
    }

    const userData = await kv.get(`user:${username}`);
    if (!userData) {
      return c.json(
        {
          success: false,
          error: "Invalid username or password",
        },
        401,
      );
    }

    const passwordHash = userData.passwordHash || userData.password; // fallback
    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (!passwordMatches) {
      return c.json(
        {
          success: false,
          error: "Invalid username or password",
        },
        401,
      );
    }

    // Check if user is banned
    if (userData.banned) {
      return c.json(
        {
          success: true,
          user: {
            userId: userData.userId,
            username: userData.username,
            banned: true,
            banReason: userData.banReason || 'Violation of terms of service',
            bannedAt: userData.bannedAt || userData.lastLogin
          }
        }
      );
    }

    // Check if user is timed out
    if (userData.timedOut) {
      const now = Date.now();
      const timeoutEnd = new Date(userData.timeoutEndsAt).getTime();
      
      // If timeout has expired, clear it
      if (now >= timeoutEnd) {
        userData.timedOut = false;
        userData.timeoutReason = null;
        userData.timeoutStartedAt = null;
        userData.timeoutEndsAt = null;
        userData.timeoutDuration = null;
        await kv.set(`user:${username}`, userData);
      } else {
        // Still timed out
        return c.json(
          {
            success: true,
            user: {
              userId: userData.userId,
              username: userData.username,
              timedOut: true,
              timeoutReason: userData.timeoutReason || 'Temporary timeout',
              timeoutStartedAt: userData.timeoutStartedAt,
              timeoutEndsAt: userData.timeoutEndsAt,
              timeoutDuration: userData.timeoutDuration
            }
          }
        );
      }
    }

    // Update last login, device info, IP, and rank
    userData.lastLogin = new Date().toISOString();
    userData.deviceInfo = deviceInfo;
    userData.ipAddress = ip;
    
    // Update rank based on current admin role (in case it changed)
    const adminRole = getAdminRole(username);
    userData.rank = adminRole ? adminRole.rank : 0;
    
    await kv.set(`user:${username}`, userData);

    // User login successful

    return c.json({
      success: true,
      user: {
        userId: userData.userId,
        username: userData.username,
        banned: false,
      },
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Create a new room
app.post("/make-server-b35a818f/room/create", async (c) => {
  try {
    let roomCode = generateRoomCode();
    let attempts = 0;

    // Ensure uniqueness
    while (attempts < 10) {
      const existing = await kv.get(`room:${roomCode}`);
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const roomData = {
      code: roomCode,
      createdAt: new Date().toISOString(),
      participants: [],
      messages: [],
      photos: [],
    };

    await kv.set(`room:${roomCode}`, roomData);

    return c.json({ success: true, roomCode });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Join a room
app.post("/make-server-b35a818f/room/join", async (c) => {
  try {
    const { roomCode, userId } = await c.req.json();

    const roomData = await kv.get(`room:${roomCode}`);
    if (!roomData) {
      return c.json(
        { success: false, error: "Room not found" },
        404,
      );
    }

    // Add participant if not already in room
    if (!roomData.participants.includes(userId)) {
      roomData.participants.push(userId);
      await kv.set(`room:${roomCode}`, roomData);
    }

    return c.json({ success: true, room: roomData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get room data
app.get("/make-server-b35a818f/room/:code", async (c) => {
  try {
    const roomCode = c.req.param("code");
    const roomData = await kv.get(`room:${roomCode}`);

    if (!roomData) {
      return c.json(
        { success: false, error: "Room not found" },
        404,
      );
    }

    return c.json({ success: true, room: roomData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Check if user is admin
function isAdmin(username: string): boolean {
  const adminUsernames = [
    "mark",
    "mark 2.0",
    "wolfattack199",
    "mrconferce2",
    "tanner2680",
    "im best mod",
    "wyattsands123",
  ];
  return adminUsernames.includes(username.toLowerCase());
}

// Get admin role and rank
function getAdminRole(
  username: string,
): { role: string; rank: number } | null {
  const lowerUsername = username.toLowerCase();

  // Owner (mrconferce2, Mark 2.0) - Rank 5
  if (
    lowerUsername === "mrconferce2" ||
    lowerUsername === "mark 2.0"
    ) {
      return { role: "Owner", rank: 5 };    
  }

  // Co-Owners (Mark, wolfattack199, Tanner2680) - Rank 5
  if (
    lowerUsername === "mark" ||
    lowerUsername === "wolfattack199" ||
    lowerUsername === "tanner2680"
  ) {
    return { role: "Co-Owner", rank: 5 };
  }

  // Admin/Moderators (IM BEST MOD, wyattsands123) - Rank 4
  if (
    lowerUsername === "im best mod" ||
    lowerUsername === "wyattsands123"
  ) {
    return { role: "Admin", rank: 4 };
  }

  return null;
}

// Check if user is protected from bans (cannot be banned)
function isProtectedUser(username: string): boolean {
  const protectedUsernames = [
    "mrconferce",
    "wyattsands123",
    "wolfattack199",
    "mark",
    "Mark 2.0",
  ];
  return protectedUsernames.includes(username.toLowerCase());
}

// Check if admin can perform action on target
function canManageUser(
  adminUsername: string,
  targetUsername: string,
): boolean {
  const adminRole = getAdminRole(adminUsername);
  const targetRole = getAdminRole(targetUsername);

  if (!adminRole) return false;

  // Can't manage yourself
  if (
    adminUsername.toLowerCase() === targetUsername.toLowerCase()
  )
    return false;

  // If target is not an admin, any admin can manage them
  if (!targetRole) return true;

  // Can only manage users with lower rank
  return adminRole.rank > targetRole.rank;
}

// Check if message contains underage disclosure
function containsUnderageDisclosure(text: string): boolean {
  const lowerText = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");

  // Patterns that indicate someone is 12 or under
  const agePatterns = [
    /\b(?:i(?:'?m| am)?|im)\s*(?:a\s*)?(\d+)(?:\s*(?:years?\s*old|yrs?\s*old|yo|y\/o))?\b/gi,
    /\b(\d+)\s*(?:years?\s*old|yrs?\s*old|yo|y\/o)\b/gi,
    /\bage\s*(?:is\s*)?(\d+)\b/gi,
  ];

  for (const pattern of agePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const age = parseInt(match[1]);
      if (age > 0 && age <= 12) {
        return true;
      }
    }
  }

  return false;
}

// Comprehensive inappropriate content detection
function containsInappropriateContent(text: string): boolean {
  // Normalize text - remove special chars, convert leet speak, handle spacing
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");

  // Comprehensive list of inappropriate terms and variations
  const inappropriateTerms = [
    // Sexual terms
    "sex",
    "sexx",
    "sexy",
    "sexting",
    "sext",
    "porn",
    "pron",
    "pr0n",
    "porno",
    "nude",
    "nudes",
    "naked",
    "nakey",
    "dick",
    "cock",
    "penis",
    "vagina",
    "pussy",
    "boob",
    "boobs",
    "breast",
    "tit",
    "tits",
    "ass",
    "butt",
    "anal",
    "cum",
    "cumming",
    "orgasm",
    "masturbate",
    "masturbating",
    "jerkoff",
    "jerk off",
    "horny",
    "aroused",
    "erection",
    "boner",
    "rape",
    "molest",
    "pedophile",
    "pedo",
    "child porn",
    "cp",

    // Grooming/predatory terms
    "send pic",
    "send pics",
    "send photo",
    "send me pic",
    "show me",
    "let me see",
    "private chat",
    "go private",
    "age check",
    "how old",
    "ur age",
    "your age",
    "meet up",
    "meetup",
    "meet irl",
    "dont tell",
    "keep secret",
    "our secret",

    // Sexual acts
    "blowjob",
    "handjob",
    "footjob",
    "fuck",
    "fucking",
    "fucked",
    "fck",
    "bang",
    "banging",
    "smash",
    "smashing",
    "hookup",
    "hook up",

    // Body parts (sexual context)
    "clit",
    "crotch",
    "genital",
    "genitals",
    "nipple",
    "nipples",
    "areola",

    // Solicitation
    "onlyfans",
    "only fans",
    "premium snap",
    "snapchat premium",
    "cash app",
    "venmo",
    "paypal",
    "sugar daddy",
    "sugar baby",
    "sugar mommy",

    // Extreme variations
    "seks",
    "secks",
    "sexi",
    "sxy",
    "fuk",
    "fuc",
    "fck",
    "phuck",
    "azz",
    "asz",
    "bewbs",
    "bewb",
    "b00bs",
    "dik",
    "dck",
    "peniz",
    "vag",
    "puss",
    "pusi",
    "nutting",
    "nut",
    "fap",
    "fapping",
    "hentai",
    "nsfw",
    "kink",
    "kinky",
    "fetish",
    "bdsm",
    "bondage",
    "dominate",
    "spank",
    "spanking",
  ];

  // Check if any inappropriate term exists in normalized text
  for (const term of inappropriateTerms) {
    if (normalized.includes(term)) {
      return true;
    }
  }

  // Additional pattern matching for suspicious phrases
  const suspiciousPatterns = [
    /send\s*me/gi,
    /show\s*me/gi,
    /wanna\s*see/gi,
    /want\s*to\s*see/gi,
    /can\s*i\s*see/gi,
    /let\s*me\s*see/gi,
    /pic\s*of\s*you/gi,
    /photo\s*of\s*you/gi,
    /you\s*look/gi,
    /how\s*old\s*are\s*you/gi,
    /where\s*you\s*live/gi,
    /meet\s*me/gi,
    /come\s*over/gi,
    /webcam/gi,
    /video\s*chat/gi,
    /skype/gi,
    /discord/gi,
    /snap/gi,
    /insta/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

// Parse duration string (e.g., "30s", "5m", "2h", "1d", "1w", "1mo", "1y")
function parseDuration(durationStr: string): number {
  if (!durationStr || durationStr === 'permanent') return -1;
  
  const match = durationStr.match(/^(\d+)(s|m|h|d|w|mo|y)$/i);
  if (!match) return -1; // Invalid format, treat as permanent
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const MS_PER_SECOND = 1000;
  const MS_PER_MINUTE = 60 * MS_PER_SECOND;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;
  const MS_PER_WEEK = 7 * MS_PER_DAY;
  const MS_PER_MONTH = 30 * MS_PER_DAY; // Approximate
  const MS_PER_YEAR = 365 * MS_PER_DAY; // Approximate
  
  switch (unit) {
    case 's': return value * MS_PER_SECOND;
    case 'm': return value * MS_PER_MINUTE;
    case 'h': return value * MS_PER_HOUR;
    case 'd': return value * MS_PER_DAY;
    case 'w': return value * MS_PER_WEEK;
    case 'mo': return value * MS_PER_MONTH;
    case 'y': return value * MS_PER_YEAR;
    default: return -1;
  }
}

// Ban a user (with custom duration support)
async function banUser(username: string, reason: string, duration?: string) {
  try {
    const userData = await kv.get(`user:${username}`);
    if (userData) {
      // Check if user is Rank 5 (Owner/Co-Owner) and reason is NOT underage
      const isHighRank = userData.rank === 5;
      const isUnderageViolation = reason.toLowerCase().includes('age') || 
                                   reason.toLowerCase().includes('underage') ||
                                   reason.toLowerCase().includes('12 or under');
      
      // Parse duration
      const durationMs = parseDuration(duration || 'permanent');
      const isPermanent = durationMs === -1;
      
      // Determine if this should be a timeout or permanent ban
      if (!isPermanent && !isUnderageViolation) {
        // Temporary timeout (for any user, not just high-rank)
        userData.timedOut = true;
        userData.timeoutReason = reason;
        userData.timeoutStartedAt = new Date().toISOString();
        userData.timeoutEndsAt = new Date(Date.now() + durationMs).toISOString();
        userData.timeoutDuration = duration || '1d';
        
        // Clear any existing ban
        userData.banned = false;
        userData.banReason = null;
        userData.bannedAt = null;
      } else if (isHighRank && !isUnderageViolation) {
        // High-rank user with permanent ban request becomes 1 day timeout
        userData.timedOut = true;
        userData.timeoutReason = reason;
        userData.timeoutStartedAt = new Date().toISOString();
        userData.timeoutEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day
        userData.timeoutDuration = '1d';
        
        // Clear any existing ban
        userData.banned = false;
        userData.banReason = null;
        userData.bannedAt = null;
      } else {
        // Permanent ban for underage violations or permanent request
        userData.banned = true;
        userData.banReason = reason;
        userData.bannedAt = new Date().toISOString();
        
        // Clear any timeout
        userData.timedOut = false;
        userData.timeoutReason = null;
        userData.timeoutStartedAt = null;
        userData.timeoutEndsAt = null;
        userData.timeoutDuration = null;
      }
      
      await kv.set(`user:${username}`, userData);
    }
  } catch (error) {
    // Error banning user
  }
}

// Send a message
app.post("/make-server-b35a818f/message/send", async (c) => {
  try {
    const { roomCode, userId, username, text } =
      await c.req.json();

    // STRICT MODERATION: Check for underage disclosure
    if (containsUnderageDisclosure(text)) {
      await banUser(
        username,
        "Disclosed age 12 or under - violates terms of service",
      );
      return c.json(
        {
          success: false,
          error:
            "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
          banned: true,
        },
        403,
      );
    }

    // STRICT MODERATION: Check for inappropriate content
    if (containsInappropriateContent(text)) {
      await banUser(
        username,
        "Sent inappropriate content - violates terms of service",
      );
      return c.json(
        {
          success: false,
          error:
            "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
          banned: true,
        },
        403,
      );
    }

    const roomData = await kv.get(`room:${roomCode}`);
    if (!roomData) {
      return c.json(
        { success: false, error: "Room not found" },
        404,
      );
    }

    const message = {
      id: crypto.randomUUID(),
      userId,
      username,
      text,
      timestamp: new Date().toISOString(),
    };

    roomData.messages.push(message);
    await kv.set(`room:${roomCode}`, roomData);

    return c.json({ success: true, message });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Upload a photo
app.post("/make-server-b35a818f/photo/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const roomCode = formData.get("roomCode") as string;
    const userId = formData.get("userId") as string;
    const username = formData.get("username") as string;
    const file = formData.get("file") as File;

    if (!file) {
      return c.json(
        { success: false, error: "No file provided" },
        400,
      );
    }

    const roomData = await kv.get(`room:${roomCode}`);
    if (!roomData) {
      return c.json(
        { success: false, error: "Room not found" },
        404,
      );
    }

    // Upload to Supabase Storage
    const fileName = `${roomCode}/${crypto.randomUUID()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: file.type,
        });

    if (uploadError) {
      return c.json(
        { success: false, error: String(uploadError) },
        500,
      );
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 3600);

    const photo = {
      id: crypto.randomUUID(),
      userId,
      username,
      url: signedUrlData?.signedUrl,
      fileName: file.name,
      timestamp: new Date().toISOString(),
    };

    roomData.photos.push(photo);
    await kv.set(`room:${roomCode}`, roomData);

    return c.json({ success: true, photo });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// WebRTC signaling - send signal
app.post("/make-server-b35a818f/signal/send", async (c) => {
  try {
    const { roomCode, fromUserId, toUserId, signal } =
      await c.req.json();

    const timestamp = Date.now();
    const signalData = {
      fromUserId,
      toUserId,
      signal,
      timestamp: new Date(timestamp).toISOString(),
    };

    await kv.set(
      `signal:${roomCode}:${toUserId}:${timestamp}`,
      signalData,
    );

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// WebRTC signaling - get signals
app.get(
  "/make-server-b35a818f/signal/:roomCode/:userId",
  async (c) => {
    try {
      const roomCode = c.req.param("roomCode");
      const userId = c.req.param("userId");

      const rawSignals = await kv.getByPrefix(
        `signal:${roomCode}:${userId}:`,
      );

      // Format signals properly
      const signals = rawSignals.map((s: any) => ({
        fromUserId: s.fromUserId,
        signal: s.signal,
        timestamp: s.timestamp,
      }));

      // Delete retrieved signals after reading
      if (rawSignals && rawSignals.length > 0) {
        for (const s of rawSignals) {
          const key = `signal:${roomCode}:${userId}:${new Date(s.timestamp).getTime()}`;
          await kv.del(key);
        }
      }

      return c.json({ success: true, signals: signals || [] });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Add friend
app.post("/make-server-b35a818f/friend/add", async (c) => {
  try {
    const { userId, friendUsername } = await c.req.json();

    // Check if user is banned from adding mods
    const modBanStatus = await kv.get(`mod_add_ban:${userId}`);
    if (modBanStatus && modBanStatus.banned) {
      return c.json(
        {
          success: false,
          error:
            "You are permanently banned from adding moderators after a previous rejection.",
        },
        403,
      );
    }

    // Check if friend exists
    const friendData = await kv.get(`user:${friendUsername}`);
    if (!friendData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    // Get current user data
    const currentUser = await kv.get(`user_by_id:${userId}`);
    if (!currentUser) {
      return c.json(
        { success: false, error: "Your account not found" },
        404,
      );
    }

    // Check if target is a moderator/owner/co-owner
    const targetRole = getAdminRole(friendData.username);
    const isModerator = targetRole !== null;

    // Get current user's friends list
    const userFriends = (await kv.get(`friends:${userId}`)) || {
      friends: [],
    };

    // Check if already friends
    if (
      userFriends.friends.some(
        (f: any) => f.userId === friendData.userId,
      )
    ) {
      return c.json(
        { success: false, error: "Already friends" },
        400,
      );
    }

    // If target is a moderator, create a friend request instead
    if (isModerator) {
      // Check if request already exists
      const existingRequests = (await kv.get(
        `friend_requests:${friendData.userId}`,
      )) || { requests: [] };
      const alreadyRequested = existingRequests.requests.some(
        (r: any) => r.fromUserId === userId,
      );

      if (alreadyRequested) {
        return c.json(
          {
            success: false,
            error: "Friend request already sent",
          },
          400,
        );
      }

      // Create friend request
      const request = {
        id: crypto.randomUUID(),
        fromUserId: userId,
        fromUsername: currentUser.username,
        toUserId: friendData.userId,
        toUsername: friendData.username,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      existingRequests.requests.push(request);
      await kv.set(
        `friend_requests:${friendData.userId}`,
        existingRequests,
      );

      return c.json({
        success: true,
        message: `Friend request sent to ${friendData.username}. They need to accept it first.`,
        isRequest: true,
      });
    }

    // Not a moderator, add friend directly
    userFriends.friends.push({
      userId: friendData.userId,
      username: friendData.username,
      addedAt: new Date().toISOString(),
    });

    // Also add to friend's list
    const friendFriendsList = (await kv.get(
      `friends:${friendData.userId}`,
    )) || { friends: [] };
    if (
      !friendFriendsList.friends.some(
        (f: any) => f.userId === userId,
      )
    ) {
      friendFriendsList.friends.push({
        userId: userId,
        username: currentUser.username,
        addedAt: new Date().toISOString(),
      });
      await kv.set(
        `friends:${friendData.userId}`,
        friendFriendsList,
      );
    }

    await kv.set(`friends:${userId}`, userFriends);

    return c.json({
      success: true,
      friend: {
        userId: friendData.userId,
        username: friendData.username,
      },
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get friend requests for a user
app.get(
  "/make-server-b35a818f/friend/requests/:userId",
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const requests = (await kv.get(
        `friend_requests:${userId}`,
      )) || { requests: [] };

      // Filter only pending requests
      const pendingRequests = requests.requests.filter(
        (r: any) => r.status === "pending",
      );

      return c.json({
        success: true,
        requests: pendingRequests,
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Accept friend request
app.post("/make-server-b35a818f/friend/accept", async (c) => {
  try {
    const { userId, requestId } = await c.req.json();

    // Get friend requests
    const requests = (await kv.get(
      `friend_requests:${userId}`,
    )) || { requests: [] };
    const request = requests.requests.find(
      (r: any) => r.id === requestId && r.status === "pending",
    );

    if (!request) {
      return c.json(
        { success: false, error: "Request not found" },
        404,
      );
    }

    // Mark request as accepted
    request.status = "accepted";
    request.acceptedAt = new Date().toISOString();
    await kv.set(`friend_requests:${userId}`, requests);

    // Add to both users' friend lists
    const userFriends = (await kv.get(`friends:${userId}`)) || {
      friends: [],
    };
    const requesterFriends = (await kv.get(
      `friends:${request.fromUserId}`,
    )) || { friends: [] };

    // Add requester to user's friends
    if (
      !userFriends.friends.some(
        (f: any) => f.userId === request.fromUserId,
      )
    ) {
      userFriends.friends.push({
        userId: request.fromUserId,
        username: request.fromUsername,
        addedAt: new Date().toISOString(),
      });
      await kv.set(`friends:${userId}`, userFriends);
    }

    // Add user to requester's friends
    if (
      !requesterFriends.friends.some(
        (f: any) => f.userId === userId,
      )
    ) {
      requesterFriends.friends.push({
        userId: userId,
        username: request.toUsername,
        addedAt: new Date().toISOString(),
      });
      await kv.set(
        `friends:${request.fromUserId}`,
        requesterFriends,
      );
    }

    return c.json({
      success: true,
      message: "Friend request accepted",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Reject friend request
app.post("/make-server-b35a818f/friend/reject", async (c) => {
  try {
    const { userId, requestId } = await c.req.json();

    // Get friend requests
    const requests = (await kv.get(
      `friend_requests:${userId}`,
    )) || { requests: [] };
    const request = requests.requests.find(
      (r: any) => r.id === requestId && r.status === "pending",
    );

    if (!request) {
      return c.json(
        { success: false, error: "Request not found" },
        404,
      );
    }

    // Mark request as rejected
    request.status = "rejected";
    request.rejectedAt = new Date().toISOString();
    await kv.set(`friend_requests:${userId}`, requests);

    // Ban the requester from adding ANY moderators permanently
    await kv.set(`mod_add_ban:${request.fromUserId}`, {
      banned: true,
      bannedBy: request.toUsername,
      reason: "Friend request to moderator was rejected",
      bannedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message:
        "Friend request rejected. User is now permanently banned from adding moderators.",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get friends list
app.get(
  "/make-server-b35a818f/friend/list/:userId",
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const userFriends = (await kv.get(
        `friends:${userId}`,
      )) || { friends: [] };

      return c.json({
        success: true,
        friends: userFriends.friends || [],
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Send direct message
app.post("/make-server-b35a818f/dm/send", async (c) => {
  try {
    const { fromUserId, toUserId, fromUsername, text, imageUrl } =
      await c.req.json();

    // STRICT MODERATION: Check for underage disclosure in DMs too (only if text exists)
    if (text && containsUnderageDisclosure(text)) {
      await banUser(
        fromUsername,
        "Disclosed age 12 or under in direct message - violates terms of service",
      );
      return c.json(
        {
          success: false,
          error:
            "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
          banned: true,
        },
        403,
      );
    }

    // STRICT MODERATION: Check for inappropriate content in DMs too (only if text exists)
    if (text && containsInappropriateContent(text)) {
      await banUser(
        fromUsername,
        "Sent inappropriate content in direct message - violates terms of service",
      );
      return c.json(
        {
          success: false,
          error:
            "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
          banned: true,
        },
        403,
      );
    }

    const conversationId = [fromUserId, toUserId]
      .sort()
      .join(":");
    const dmData = (await kv.get(`dm:${conversationId}`)) || {
      messages: [],
    };

    const message: any = {
      id: crypto.randomUUID(),
      fromUserId,
      fromUsername,
      text: text || '',
      timestamp: new Date().toISOString(),
    };

    if (imageUrl) {
      message.imageUrl = imageUrl;
    }

    dmData.messages.push(message);
    await kv.set(`dm:${conversationId}`, dmData);

    return c.json({ success: true, message });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get direct messages
app.get(
  "/make-server-b35a818f/dm/:userId/:friendId",
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const friendId = c.req.param("friendId");

      const conversationId = [userId, friendId]
        .sort()
        .join(":");
      const dmData = (await kv.get(`dm:${conversationId}`)) || {
        messages: [],
      };

      return c.json({
        success: true,
        messages: dmData.messages || [],
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Get all users
app.get(
  "/make-server-b35a818f/admin/users/:username",
  async (c) => {
    try {
      const username = c.req.param("username");

      // Check if user is admin (hardcoded) or has admin rank (including rank 4 testers)
      const isHardcodedAdmin = isAdmin(username);
      const userData = await kv.get(`user:${username}`);
      const hasAdminRank = userData && userData.rank && userData.rank >= 1;
      
      if (!isHardcodedAdmin && !hasAdminRank) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const users = await kv.getByPrefix("user:");

      // Handle case where no users exist
      if (!users || users.length === 0) {
        return c.json({ success: true, users: [] });
      }

      const usersList = users.map((userData: any) => {
        // Get rank from stored data or determine from username
        let rank =
          userData.rank !== undefined ? userData.rank : 0;

        // Override with hardcoded admin ranks if applicable
        const adminRole = getAdminRole(userData.username);
        if (adminRole) {
          rank = adminRole.rank;
        }

        return {
          username: userData.username || "Unknown",
          userId: userData.userId || "",
          banned: userData.banned || false,
          terminated: userData.terminated || false,
          banReason: userData.banReason || null,
          bannedAt: userData.bannedAt || null,
          createdAt: userData.createdAt || "",
          lastLogin: userData.lastLogin || "",
          deviceInfo: userData.deviceInfo || {},
          ipAddress: userData.ipAddress || "unknown",
          rank: rank,
        };
      });

      // Filter out protected Co-Owners (wolfattack199 and mark) from admin panel
      const filteredUsers = usersList.filter((user: any) => {
        const username = user.username.toLowerCase();
        return username !== 'wolfattack199' && username !== 'mark';
      });

      return c.json({ success: true, users: filteredUsers });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Set user rank
app.post("/make-server-b35a818f/admin/set-rank", async (c) => {
  try {
    const { adminUsername, targetUsername, rank } =
      await c.req.json();

    // Check if admin is authorized (hardcoded or by rank)
    let adminRole = getAdminRole(adminUsername);
    if (!adminRole) {
      // Check if user has an admin rank in database
      const adminUserData = await kv.get(`user:${adminUsername}`);
      if (adminUserData && adminUserData.rank && adminUserData.rank >= 1) {
        // Create a role object from stored rank
        const rankNames = ["Member", "Admin", "Co-Owner", "Owner", "Tester", "Developer"];
        adminRole = {
          role: rankNames[adminUserData.rank],
          rank: adminUserData.rank
        };
      } else {
        return c.json(
          {
            success: false,
            error: "Unauthorized. You must be an admin.",
          },
          403,
        );
      }
    }

    // Validate rank is between 0-5
    if (rank < 0 || rank > 5) {
      return c.json(
        {
          success: false,
          error: "Rank must be between 0 and 5",
        },
        400,
      );
    }

    // Check if target is a hardcoded admin (Tanner2680, Mark, etc.)
    const targetRole = getAdminRole(targetUsername);
    if (
      targetRole &&
      ["mark", "wolfattack199"].includes(
        targetUsername.toLowerCase(),
      )
    ) {
      return c.json(
        {
          success: false,
          error:
            "Cannot change rank of hardcoded administrators",
        },
        403,
      );
    }

    // Ranks 2 (Co-Owner) and 3 (Owner) can assign roles 1, 2, 3, 4, and 5
    // Other ranks can only assign ranks lower than their own
    if (adminRole.rank === 2 || adminRole.rank === 3) {
      // Only Owner (Rank 3) can assign Rank 5 - mrconferce2 and Mark 2.0
      if (rank === 5) {
        if (adminRole.rank !== 3) {
          return c.json(
            {
              success: false,
              error: "Only the Owner (mrconferce2 or Mark 2.0) can assign Rank 5 (Developer)",
            },
            403,
          );
        }
        // Owner can assign Rank 5
      } else if (rank > 5) {
        return c.json(
          {
            success: false,
            error: "You can only assign ranks 1-5",
          },
          403,
        );
      }
      // Cannot assign rank equal to or higher than your own (unless Owner giving rank 3)
      if (rank >= adminRole.rank && !(adminRole.rank === 3 && rank === 3) && rank !== 5) {
        return c.json(
          {
            success: false,
            error: "You can only assign ranks lower than your own rank",
          },
          403,
        );
      }
    } else {
      // Other admins can only set ranks lower than their own rank
      // They CANNOT set rank 5
      if (rank === 5) {
        return c.json(
          {
            success: false,
            error: "Only the Owner (mrconferce2 or Mark 2.0) can assign Rank 5 (Developer)",
          },
          403,
        );
      }
      if (adminRole.rank <= rank) {
        return c.json(
          {
            success: false,
            error:
              "You can only set ranks lower than your own rank",
          },
          403,
        );
      }
    }

    // Get target user data
    const userData = await kv.get(`user:${targetUsername}`);
    if (!userData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    // Update rank
    userData.rank = rank;
    await kv.set(`user:${targetUsername}`, userData);
    await kv.set(`user_by_id:${userData.userId}`, userData);

    const rankNames = ["Member", "Admin", "Co-Owner", "Owner", "Tester", "Developer"];

    return c.json({
      success: true,
      message: `${targetUsername} has been promoted to ${rankNames[rank]} (Rank ${rank})`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Ban user
app.post("/make-server-b35a818f/admin/ban", async (c) => {
  try {
    const { adminUsername, targetUsername, reason, duration } =
      await c.req.json();

    // Check if user is admin
    if (!isAdmin(adminUsername)) {
      return c.json(
        { success: false, error: "Unauthorized" },
        403,
      );
    }

    // Check if user is protected from bans
    if (isProtectedUser(targetUsername)) {
      return c.json(
        {
          success: false,
          error: "This user is protected from bans",
        },
        403,
      );
    }

    // Check target user's rank and determine message
    const targetUser = await kv.get(`user:${targetUsername}`);
    const isUnderageViolation = reason && (
      reason.toLowerCase().includes('age') || 
      reason.toLowerCase().includes('underage') ||
      reason.toLowerCase().includes('12 or under')
    );
    
    const durationMs = parseDuration(duration || 'permanent');
    const isPermanent = durationMs === -1;
    
    let banMessage = '';
    
    if (isPermanent && !isUnderageViolation && targetUser?.rank === 5) {
      // High-rank user gets 1 day timeout instead of permanent ban
      banMessage = `User ${targetUsername} has been timed out for 1 day (Rank 5 protection)`;
    } else if (!isPermanent) {
      // Temporary timeout
      banMessage = `User ${targetUsername} has been timed out for ${duration}`;
    } else {
      // Permanent ban
      banMessage = `User ${targetUsername} has been permanently banned`;
    }

    await banUser(targetUsername, reason || "Banned by admin", duration);

    return c.json({
      success: true,
      message: banMessage,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Unban user
app.post("/make-server-b35a818f/admin/unban", async (c) => {
  try {
    const { adminUsername, targetUsername } =
      await c.req.json();

    // Check if user is admin
    if (!isAdmin(adminUsername)) {
      return c.json(
        { success: false, error: "Unauthorized" },
        403,
      );
    }

    const userData = await kv.get(`user:${targetUsername}`);
    if (userData) {
      userData.banned = false;
      userData.banReason = null;
      userData.bannedAt = null;
      // Also clear timeout
      userData.timedOut = false;
      userData.timeoutReason = null;
      userData.timeoutStartedAt = null;
      userData.timeoutEndsAt = null;
      userData.timeoutDuration = null;
      await kv.set(`user:${targetUsername}`, userData);
    }

    return c.json({
      success: true,
      message: `User ${targetUsername} has been unbanned`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: IP Ban user
app.post("/make-server-b35a818f/admin/ipban", async (c) => {
  try {
    const { adminUsername, targetUsername, reason } =
      await c.req.json();

    // Check if user is admin
    if (!isAdmin(adminUsername)) {
      return c.json(
        { success: false, error: "Unauthorized" },
        403,
      );
    }

    // Check if user is protected from bans
    if (isProtectedUser(targetUsername)) {
      return c.json(
        {
          success: false,
          error: "This user is protected from bans",
        },
        403,
      );
    }

    // Get target user's IP address
    const userData = await kv.get(`user:${targetUsername}`);
    if (!userData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    const ipAddress = userData.ipAddress || "unknown";

    // Ban the user account
    await banUser(
      targetUsername,
      reason || "IP banned by admin",
    );

    // Ban the IP address
    const ipBanData = {
      ip: ipAddress,
      bannedUsername: targetUsername,
      reason: reason || "IP banned by admin",
      bannedBy: adminUsername,
      bannedAt: new Date().toISOString(),
    };

    await kv.set(`ipban:${ipAddress}`, ipBanData);

    return c.json({
      success: true,
      message: `User ${targetUsername} and IP ${ipAddress} have been permanently banned`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Remove IP Ban
app.post("/make-server-b35a818f/admin/unban-ip", async (c) => {
  try {
    const { adminUsername, ipAddress } = await c.req.json();

    // Check if user is admin
    if (!isAdmin(adminUsername)) {
      return c.json(
        { success: false, error: "Unauthorized" },
        403,
      );
    }

    await kv.del(`ipban:${ipAddress}`);

    return c.json({
      success: true,
      message: `IP ban removed for ${ipAddress}`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Get all IP bans
app.get(
  "/make-server-b35a818f/admin/ipbans/:username",
  async (c) => {
    try {
      const username = c.req.param("username");

      // Check if user is admin
      if (!isAdmin(username)) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const ipBans = await kv.getByPrefix("ipban:");

      return c.json({ success: true, ipBans: ipBans || [] });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// USER PROFILE
// Update user profile (nickname and profile picture)
app.post("/make-server-b35a818f/profile/update", async (c) => {
  try {
    const {
      username,
      nickname,
      profilePicture,
      banner,
      aboutMe,
      status,
      customStatus,
    } = await c.req.json();

    const userData = await kv.get(`user:${username}`);
    if (!userData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    // Update profile data
    if (nickname !== undefined) {
      userData.nickname = nickname;
    }
    if (profilePicture !== undefined) {
      userData.profilePicture = profilePicture;
    }
    if (banner !== undefined) {
      userData.banner = banner;
    }
    if (aboutMe !== undefined) {
      userData.aboutMe = aboutMe;
    }
    if (status !== undefined) {
      userData.status = status;
    }
    if (customStatus !== undefined) {
      userData.customStatus = customStatus;
    }

    await kv.set(`user:${username}`, userData);

    return c.json({
      success: true,
      profile: {
        nickname: userData.nickname,
        profilePicture: userData.profilePicture,
        banner: userData.banner,
        aboutMe: userData.aboutMe,
        status: userData.status,
        customStatus: userData.customStatus,
      },
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get user profile
app.get(
  "/make-server-b35a818f/profile/:username",
  async (c) => {
    try {
      const username = c.req.param("username");

      const userData = await kv.get(`user:${username}`);
      if (!userData) {
        return c.json(
          { success: false, error: "User not found" },
          404,
        );
      }

      return c.json({
        success: true,
        profile: {
          username: userData.username,
          nickname: userData.nickname || userData.username,
          profilePicture: userData.profilePicture || null,
          banner: userData.banner || null,
          aboutMe: userData.aboutMe || null,
          status: userData.status || "online",
          customStatus: userData.customStatus || null,
          rank: userData.rank || 0,
        },
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// SERVER SYSTEM
// Create a server
app.post("/make-server-b35a818f/server/create", async (c) => {
  try {
    const { userId, username, serverName } = await c.req.json();

    let serverCode = generateRoomCode();
    let attempts = 0;

    // Ensure uniqueness
    while (attempts < 10) {
      const existing = await kv.get(`server:${serverCode}`);
      if (!existing) break;
      serverCode = generateRoomCode();
      attempts++;
    }

    const serverData = {
      code: serverCode,
      name: serverName,
      ownerId: userId,
      ownerUsername: username,
      createdAt: new Date().toISOString(),
      members: [
        {
          userId,
          username,
          joinedAt: new Date().toISOString(),
        },
      ],
      channels: [
        { id: "general", name: "general", type: "text" },
      ],
    };

    await kv.set(`server:${serverCode}`, serverData);

    // Add server to user's server list
    const userServers = (await kv.get(
      `userservers:${userId}`,
    )) || { servers: [] };
    userServers.servers.push({
      code: serverCode,
      name: serverName,
      joinedAt: new Date().toISOString(),
    });
    await kv.set(`userservers:${userId}`, userServers);

    return c.json({ success: true, server: serverData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Join a server
app.post("/make-server-b35a818f/server/join", async (c) => {
  try {
    const { userId, username, serverCode } = await c.req.json();

    const serverData = await kv.get(`server:${serverCode}`);
    if (!serverData) {
      return c.json(
        { success: false, error: "Server not found" },
        404,
      );
    }

    // Check if already a member
    if (
      !serverData.members.some((m: any) => m.userId === userId)
    ) {
      serverData.members.push({
        userId,
        username,
        joinedAt: new Date().toISOString(),
      });
      await kv.set(`server:${serverCode}`, serverData);
    }

    // Add server to user's server list
    const userServers = (await kv.get(
      `userservers:${userId}`,
    )) || { servers: [] };
    if (
      !userServers.servers.some(
        (s: any) => s.code === serverCode,
      )
    ) {
      userServers.servers.push({
        code: serverCode,
        name: serverData.name,
        joinedAt: new Date().toISOString(),
      });
      await kv.set(`userservers:${userId}`, userServers);
    }

    return c.json({ success: true, server: serverData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get user's servers
app.get(
  "/make-server-b35a818f/server/list/:userId",
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const userServers = (await kv.get(
        `userservers:${userId}`,
      )) || { servers: [] };

      return c.json({
        success: true,
        servers: userServers.servers || [],
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Get server details
app.get("/make-server-b35a818f/server/:code", async (c) => {
  try {
    const code = c.req.param("code");
    const serverData = await kv.get(`server:${code}`);

    if (!serverData) {
      return c.json(
        { success: false, error: "Server not found" },
        404,
      );
    }

    return c.json({ success: true, server: serverData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Send message in server channel
app.post(
  "/make-server-b35a818f/server/message/send",
  async (c) => {
    try {
      const { serverCode, channelId, userId, username, text, imageUrl } =
        await c.req.json();

      // STRICT MODERATION (only if text exists)
      if (text && containsUnderageDisclosure(text)) {
        await banUser(
          username,
          "Disclosed age 12 or under in server - violates terms of service",
        );
        return c.json(
          {
            success: false,
            error:
              "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
            banned: true,
          },
          403,
        );
      }

      if (text && containsInappropriateContent(text)) {
        await banUser(
          username,
          "Sent inappropriate content in server - violates terms of service",
        );
        return c.json(
          {
            success: false,
            error:
              "Your account has been permanently banned for violating our terms of service. SAFECORD is only for users 13 years and older.",
            banned: true,
          },
          403,
        );
      }

      const message: any = {
        id: crypto.randomUUID(),
        userId,
        username,
        text: text || '',
        timestamp: new Date().toISOString(),
      };

      if (imageUrl) {
        message.imageUrl = imageUrl;
      }

      // Store message
      const messageKey = `servermsg:${serverCode}:${channelId}`;
      const channelMessages = (await kv.get(messageKey)) || {
        messages: [],
      };
      channelMessages.messages.push(message);

      // Keep only last 100 messages
      if (channelMessages.messages.length > 100) {
        channelMessages.messages =
          channelMessages.messages.slice(-100);
      }

      await kv.set(messageKey, channelMessages);

      return c.json({ success: true, message });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Get messages from server channel
app.get(
  "/make-server-b35a818f/server/:serverCode/:channelId/messages",
  async (c) => {
    try {
      const serverCode = c.req.param("serverCode");
      const channelId = c.req.param("channelId");

      const messageKey = `servermsg:${serverCode}:${channelId}`;
      const channelMessages = (await kv.get(messageKey)) || {
        messages: [],
      };

      return c.json({
        success: true,
        messages: channelMessages.messages || [],
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// CALL SYSTEM
// Initiate a call to a friend
app.post("/make-server-b35a818f/call/initiate", async (c) => {
  try {
    const { callerId, callerUsername, receiverId, roomCode } =
      await c.req.json();

    const callData = {
      callId: crypto.randomUUID(),
      callerId,
      callerUsername,
      receiverId,
      roomCode,
      status: "ringing",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`call:${receiverId}:incoming`, callData);

    return c.json({ success: true, call: callData });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Get incoming calls for a user
app.get(
  "/make-server-b35a818f/call/incoming/:userId",
  async (c) => {
    try {
      const userId = c.req.param("userId");

      const callData = await kv.get(`call:${userId}:incoming`);

      if (callData) {
        // Check if call is still valid (less than 60 seconds old)
        const callAge =
          Date.now() - new Date(callData.createdAt).getTime();
        if (callAge > 60000) {
          await kv.del(`call:${userId}:incoming`);
          return c.json({ success: true, call: null });
        }

        return c.json({ success: true, call: callData });
      }

      return c.json({ success: true, call: null });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to check incoming calls",
        },
        500,
      );
    }
  },
);

// Accept a call
app.post("/make-server-b35a818f/call/accept", async (c) => {
  try {
    const { userId } = await c.req.json();

    await kv.del(`call:${userId}:incoming`);

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Decline/end a call
app.post("/make-server-b35a818f/call/decline", async (c) => {
  try {
    const { userId } = await c.req.json();

    await kv.del(`call:${userId}:incoming`);

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Terminate user (Owner and Co-Owner only)
app.post("/make-server-b35a818f/admin/terminate", async (c) => {
  try {
    const { adminUsername, targetUsername, reason } =
      await c.req.json();

    const adminRole = getAdminRole(adminUsername);

    // Only Owner (rank 3) and Co-Owner (rank 2) can terminate
    if (!adminRole || adminRole.rank < 2) {
      return c.json(
        {
          success: false,
          error:
            "Unauthorized. Only Owner and Co-Owner can terminate accounts.",
        },
        403,
      );
    }

    // Check if user is protected from bans/termination
    if (isProtectedUser(targetUsername)) {
      return c.json(
        {
          success: false,
          error:
            "This user is protected from bans and termination",
        },
        403,
      );
    }

    // Check if admin can manage this user
    if (!canManageUser(adminUsername, targetUsername)) {
      return c.json(
        {
          success: false,
          error:
            "Cannot terminate this user. They have equal or higher rank.",
        },
        403,
      );
    }

    const userData = await kv.get(`user:${targetUsername}`);
    if (!userData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    // Set user as terminated
    userData.terminated = true;
    userData.terminatedReason = reason;
    userData.terminatedBy = adminUsername;
    userData.terminatedAt = new Date().toISOString();
    userData.banned = true;
    userData.banReason = `Account terminated: ${reason}`;
    userData.bannedAt = new Date().toISOString();

    await kv.set(`user:${targetUsername}`, userData);

    return c.json({
      success: true,
      message: `User ${targetUsername} has been permanently terminated`,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Unterminate user (Owner only)
app.post(
  "/make-server-b35a818f/admin/unterminate",
  async (c) => {
    try {
      const { adminUsername, targetUsername } =
        await c.req.json();

      const adminRole = getAdminRole(adminUsername);

      // Only Owner (rank 3) can unterminate
      if (!adminRole || adminRole.rank < 3) {
        return c.json(
          {
            success: false,
            error:
              "Unauthorized. Only Owner can unterminate accounts.",
          },
          403,
        );
      }

      const userData = await kv.get(`user:${targetUsername}`);
      if (!userData) {
        return c.json(
          { success: false, error: "User not found" },
          404,
        );
      }

      // Remove termination
      userData.terminated = false;
      userData.terminatedReason = undefined;
      userData.terminatedBy = undefined;
      userData.terminatedAt = undefined;
      userData.banned = false;
      userData.banReason = undefined;
      userData.bannedAt = undefined;

      await kv.set(`user:${targetUsername}`, userData);

      return c.json({
        success: true,
        message: `User ${targetUsername} has been unterminated`,
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Publish Update (Owner and Co-Owner only)
app.post(
  "/make-server-b35a818f/admin/publish-update",
  async (c) => {
    try {
      const { adminUsername } = await c.req.json();

      const adminRole = getAdminRole(adminUsername);

      // Only Owner (rank 3) and Co-Owner (rank 2) can publish updates
      if (!adminRole || adminRole.rank < 2) {
        return c.json(
          {
            success: false,
            error:
              "Unauthorized. Only Owner and Co-Owner can publish updates.",
          },
          403,
        );
      }

      // Get the pending update from KV storage (if exists)
      const pendingUpdate = await kv.get("pending_update");

      if (!pendingUpdate) {
        return c.json(
          {
            success: false,
            error: "No pending update to publish",
          },
          404,
        );
      }

      // Move pending update to published
      await kv.set("published_update", {
        ...pendingUpdate,
        publishedBy: adminUsername,
        publishedAt: new Date().toISOString(),
        status: "published",
      });

      // Clear pending update
      await kv.delete("pending_update");

      return c.json({
        success: true,
        message: `Update published successfully by ${adminUsername}. All users can now access the new version.`,
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Submit Code Update (Admins and above)
app.post(
  "/make-server-b35a818f/admin/submit-code",
  async (c) => {
    try {
      const { adminUsername, description } = await c.req.json();

      // Check if user is admin (hardcoded) or has admin rank
      const adminRole = getAdminRole(adminUsername);
      const userData = await kv.get(`user:${adminUsername}`);
      const userHasAdminRank = userData && userData.rank && userData.rank >= 1;
      
      if (!adminRole && !userHasAdminRank) {
        return c.json(
          {
            success: false,
            error: "Unauthorized. Only admins can submit code updates.",
          },
          403,
        );
      }

      if (!description || description.trim().length === 0) {
        return c.json(
          {
            success: false,
            error: "Update description is required",
          },
          400,
        );
      }

      // Create code update
      const updateId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const codeUpdate = {
        id: updateId,
        description: description.trim(),
        submittedBy: adminUsername,
        submittedAt: new Date().toISOString(),
        approvals: [],
        status: "pending",
      };

      await kv.set(`code_update:${updateId}`, codeUpdate);

      return c.json({
        success: true,
        message: `Code update submitted successfully. Waiting for tester approvals.`,
        updateId: updateId,
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Approve Code Update (Testers - Rank 4)
app.post(
  "/make-server-b35a818f/admin/approve-code",
  async (c) => {
    try {
      const { adminUsername, updateId } = await c.req.json();

      // Check if user is a tester (rank 4)
      const userData = await kv.get(`user:${adminUsername}`);
      const isTester = userData && userData.rank === 4;
      
      if (!isTester) {
        return c.json(
          {
            success: false,
            error: "Unauthorized. Only testers (Rank 4) can approve code updates.",
          },
          403,
        );
      }

      // Get the code update
      const codeUpdate = await kv.get(`code_update:${updateId}`);
      if (!codeUpdate) {
        return c.json(
          { success: false, error: "Code update not found" },
          404,
        );
      }

      // Check if already approved by this tester
      if (codeUpdate.approvals.includes(adminUsername)) {
        return c.json(
          {
            success: false,
            error: "You have already approved this update",
          },
          400,
        );
      }

      // Add approval
      codeUpdate.approvals.push(adminUsername);
      await kv.set(`code_update:${updateId}`, codeUpdate);

      // Check if we have 4 approvals - auto publish
      if (codeUpdate.approvals.length >= 4) {
        codeUpdate.status = "published";
        codeUpdate.publishedAt = new Date().toISOString();
        codeUpdate.publishedBy = "Auto-published (4 tester approvals)";
        await kv.set(`code_update:${updateId}`, codeUpdate);
        
        // Also set as the current published update
        await kv.set("published_update", codeUpdate);

        return c.json({
          success: true,
          message: `Code update auto-published! (${codeUpdate.approvals.length}/4 approvals reached)`,
          autoPublished: true,
        });
      }

      return c.json({
        success: true,
        message: `Code update approved (${codeUpdate.approvals.length}/4 approvals)`,
        approvalCount: codeUpdate.approvals.length,
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Get Code Updates
app.get(
  "/make-server-b35a818f/admin/code-updates/:username",
  async (c) => {
    try {
      const username = c.req.param("username");

      // Check if user is admin (hardcoded) or has admin rank
      const isHardcodedAdmin = isAdmin(username);
      const userData = await kv.get(`user:${username}`);
      const hasAdminRank = userData && userData.rank && userData.rank >= 1;
      
      if (!isHardcodedAdmin && !hasAdminRank) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const codeUpdates = (await kv.getByPrefix("code_update:")) || [];

      // Sort by submission date, newest first
      const sortedUpdates = codeUpdates.sort((a: any, b: any) => {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });

      return c.json({ success: true, updates: sortedUpdates });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Get ban appeals
app.get(
  "/make-server-b35a818f/admin/appeals/:username",
  async (c) => {
    try {
      const username = c.req.param("username");

      // Check if user is admin (hardcoded) or has admin rank (including rank 4 testers)
      const isHardcodedAdmin = isAdmin(username);
      const userData = await kv.get(`user:${username}`);
      const hasAdminRank = userData && userData.rank && userData.rank >= 1;
      
      if (!isHardcodedAdmin && !hasAdminRank) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const appeals = (await kv.getByPrefix("appeal:")) || [];

      return c.json({ success: true, appeals: appeals });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Approve appeal
app.post(
  "/make-server-b35a818f/admin/approve-appeal",
  async (c) => {
    try {
      const { adminUsername, appealId } = await c.req.json();

      if (!isAdmin(adminUsername)) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const appeal = await kv.get(`appeal:${appealId}`);
      if (!appeal) {
        return c.json(
          { success: false, error: "Appeal not found" },
          404,
        );
      }

      // Unban the user
      const userData = await kv.get(`user:${appeal.username}`);
      if (userData) {
        userData.banned = false;
        userData.banReason = null;
        userData.bannedAt = null;
        await kv.set(`user:${appeal.username}`, userData);
      }

      // Update appeal status
      appeal.status = "approved";
      appeal.reviewedBy = adminUsername;
      appeal.reviewedAt = new Date().toISOString();
      await kv.set(`appeal:${appealId}`, appeal);

      return c.json({
        success: true,
        message: "Appeal approved",
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Reject appeal
app.post(
  "/make-server-b35a818f/admin/reject-appeal",
  async (c) => {
    try {
      const { adminUsername, appealId } = await c.req.json();

      if (!isAdmin(adminUsername)) {
        return c.json(
          { success: false, error: "Unauthorized" },
          403,
        );
      }

      const appeal = await kv.get(`appeal:${appealId}`);
      if (!appeal) {
        return c.json(
          { success: false, error: "Appeal not found" },
          404,
        );
      }

      // Update appeal status
      appeal.status = "rejected";
      appeal.reviewedBy = adminUsername;
      appeal.reviewedAt = new Date().toISOString();
      await kv.set(`appeal:${appealId}`, appeal);

      return c.json({
        success: true,
        message: "Appeal rejected",
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Admin: Create user (Owner only)
app.post(
  "/make-server-b35a818f/admin/create-user",
  async (c) => {
    try {
      const { adminUsername, newUsername, newPassword } =
        await c.req.json();

      const adminRole = getAdminRole(adminUsername);

      // Only Owner (rank 3) can create users
      if (!adminRole || adminRole.rank < 3) {
        return c.json(
          {
            success: false,
            error:
              "Unauthorized. Only the Owner can create custom accounts.",
          },
          403,
        );
      }

      // Check if username already exists
      const existingUser = await kv.get(`user:${newUsername}`);
      if (existingUser) {
        return c.json(
          { success: false, error: "Username already exists" },
          400,
        );
      }

      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userData = {
        userId,
        username: newUsername,
        password: newPassword,
        deviceInfo: {
          createdBy: adminUsername,
          type: "admin-created",
        },
        ageConfirmed: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        banned: false,
        ipAddress: "admin-created",
      };

      await kv.set(`user:${newUsername}`, userData);

      return c.json({
        success: true,
        user: { userId, username: newUsername },
      });
    } catch (error) {
      return c.json(
        { success: false, error: String(error) },
        500,
      );
    }
  },
);

// Submit ban appeal
app.post("/make-server-b35a818f/appeal/submit", async (c) => {
  try {
    const {
      userId,
      username,
      appealMessage,
      banReason,
      bannedAt,
    } = await c.req.json();

    const appealId = crypto.randomUUID();
    const appeal = {
      id: appealId,
      userId,
      username,
      appealMessage,
      banReason,
      bannedAt,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`appeal:${appealId}`, appeal);

    return c.json({
      success: true,
      message: "Appeal submitted successfully",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Update user security (username/password)
app.post("/make-server-b35a818f/security/update", async (c) => {
  try {
    const {
      username,
      currentPassword,
      newUsername,
      newPassword,
    } = await c.req.json();

    // Get user data
    const userData = await kv.get(`user:${username}`);
    if (!userData) {
      return c.json(
        { success: false, error: "User not found" },
        404,
      );
    }

    // Verify current password
    if (userData.password !== currentPassword) {
      return c.json(
        {
          success: false,
          error: "Current password is incorrect",
        },
        401,
      );
    }

    // Check if new username is taken (if changing username)
    if (newUsername && newUsername !== username) {
      const existingUser = await kv.get(`user:${newUsername}`);
      if (existingUser) {
        return c.json(
          { success: false, error: "Username already taken" },
          400,
        );
      }

      // Update username
      userData.username = newUsername;

      // Delete old username entry and create new one
      await kv.del(`user:${username}`);
      await kv.set(`user:${newUsername}`, userData);
    }

    // Update password if provided
    if (newPassword) {
      userData.password = newPassword;
      await kv.set(`user:${newUsername || username}`, userData);
    }

    return c.json({
      success: true,
      user: {
        userId: userData.userId,
        username: newUsername || username,
      },
      message: "Security settings updated successfully",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Access Source Code (Rank 5 only)
app.post("/make-server-b35a818f/admin/code", async (c) => {
  try {
    const { username, filepath } = await c.req.json();

    // Check if user has Rank 5 (Developer)
    const userData = await kv.get(`user:${username}`);
    const hasRank5 = userData && userData.rank === 5;
    
    if (!hasRank5) {
      return c.json(
        {
          success: false,
          error: "Unauthorized. Only Rank 5 (Developer) users can access source code.",
        },
        403,
      );
    }

    // Define available source code files
    const sourceFiles = [
      "/App.tsx",
      "/components/HomePage.tsx",
      "/components/ServerView.tsx",
      "/components/CallRoom.tsx",
      "/components/LoginPage.tsx",
      "/components/FriendsView.tsx",
      "/components/AdminPanel.tsx",
      "/components/ProfileSettings.tsx",
      "/components/IncomingCallModal.tsx",
      "/components/UserProfileCard.tsx",
      "/components/NitroFeatures.tsx",
      "/components/Soundboard.tsx",
      "/components/BanAppealForm.tsx",
      "/components/SafetyBanner.tsx",
      "/components/UpdatesManager.tsx",
      "/components/MessageNotification.tsx",
      "/supabase/functions/server/index.tsx",
      "/styles/globals.css",
    ];

    // If no filepath provided, return list of files
    if (!filepath) {
      return c.json({
        success: true,
        message: "Available source code files",
        files: sourceFiles,
        note: "Use /code <filepath> to view a specific file",
      });
    }

    // Validate filepath
    if (!sourceFiles.includes(filepath)) {
      return c.json(
        {
          success: false,
          error: `File not found. Available files: ${sourceFiles.join(", ")}`,
        },
        404,
      );
    }

    return c.json({
      success: true,
      message: `Displaying source code for: ${filepath}`,
      filepath,
      note: "This is a restricted endpoint. Only Rank 5 users can access this.",
      info: "In production, this would return the actual file contents. For security, file reading is disabled in this demo.",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Admin: Access Source Code (GET endpoint for Rank 5 only)
app.get("/make-server-b35a818f/code", async (c) => {
  try {
    const username = c.req.header('X-Username');
    
    if (!username) {
      return c.json(
        {
          success: false,
          error: "Username header required",
        },
        400,
      );
    }

    // Check if user has Rank 5 (Developer)
    const userData = await kv.get(`user:${username}`);
    const hasRank5 = userData && userData.rank === 5;
    
    if (!hasRank5) {
      return c.json(
        {
          success: false,
          error: "Unauthorized. Only Rank 5 (Developer) users can access source code.",
        },
        403,
      );
    }

    // Define available source code files
    const sourceFiles = [
      "/App.tsx",
      "/components/CallRoom.tsx",
      "/components/ServerView.tsx",
      "/components/HomePage.tsx",
      "/components/LoginPage.tsx",
      "/components/FriendsView.tsx",
      "/components/AdminPanel.tsx",
      "/components/ProfileSettings.tsx",
      "/components/IncomingCallModal.tsx",
      "/components/UserProfileCard.tsx",
      "/components/NitroFeatures.tsx",
      "/components/Soundboard.tsx",
      "/components/BanAppealForm.tsx",
      "/components/SafetyBanner.tsx",
      "/components/UpdatesManager.tsx",
      "/components/MessageNotification.tsx",
      "/supabase/functions/server/index.tsx",
      "/styles/globals.css",
    ];

    return c.json({
      success: true,
      sourceCode: "Access granted to SAFECORD source code repository",
      message: "Developer access verified. You can view and edit all source files.",
      availableFiles: sourceFiles,
      permissions: [
        "View all source code files",
        "Edit and publish updates",
        "Access developer tools",
        "View banned user list",
        "Execute admin commands"
      ],
      note: "Use the admin panel's code editor to make changes and publish updates",
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

// Special initialization endpoint to assign Rank 5 to Mark 2.0
app.post("/make-server-b35a818f/init-rank5", async (c) => {
  try {
    const { secret } = await c.req.json();

    // Secret key check (in production, use a secure secret)
    if (secret !== "SAFECORD_INIT_2025") {
      return c.json(
        {
          success: false,
          error: "Invalid secret key",
        },
        403,
      );
    }

    // Give Mark 2.0 Rank 5
    const username = "Mark 2.0";
    const existingUser = await kv.get(`user:${username}`);

    if (existingUser) {
      existingUser.rank = 5;
      await kv.set(`user:${username}`, existingUser);
      // Also update by userId
      if (existingUser.userId) {
        await kv.set(`user_by_id:${existingUser.userId}`, existingUser);
      }
    } else {
      // Create user with Rank 5
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userData = {
        userId,
        username,
        rank: 5,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await kv.set(`user:${username}`, userData);
      await kv.set(`userId:${userId}`, username);
      await kv.set(`user_by_id:${userId}`, userData);
    }

    return c.json({
      success: true,
      message: `Rank 5 (Developer/Owner & Co-Owner) successfully assigned to ${username}`,
      user: username,
      rank: 5,
    });
  } catch (error) {
    return c.json(
      { success: false, error: String(error) },
      500,
    );
  }
});

Deno.serve(app.fetch);