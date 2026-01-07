# SAFECORD Custom Ban Duration System

## ✨ New Features

### 1. **Custom Duration Support**
Admins can now specify exact ban/timeout durations using a simple format:

| Format | Meaning | Example |
|--------|---------|---------|
| `30s` | 30 seconds | Quick warning timeout |
| `5m` | 5 minutes | Minor violation |
| `1h` | 1 hour | Moderate violation |
| `2h` | 2 hours | Repeated violation |
| `1d` | 1 day | Serious violation |
| `3d` | 3 days | Major violation |
| `1w` | 1 week | Very serious violation |
| `2w` | 2 weeks | Extreme violation |
| `1mo` | 1 month | Nearly permanent |
| `6mo` | 6 months | Long-term timeout |
| `1y` | 1 year | Extremely long timeout |
| `permanent` | Permanent ban | No auto-unban |

### 2. **Rank 5 Protection**
- **Owner/Co-Owner (Rank 5)** users are protected from permanent bans
- If someone tries to permanently ban a Rank 5 user, it automatically converts to a **1 day timeout**
- **Exception**: Underage violations (age 12 or under) always result in permanent ban, even for Rank 5

### 3. **Auto-Expiry System**
- All timeouts automatically expire when the duration ends
- Users can log in immediately after timeout expires
- No manual intervention needed

### 4. **Fixed DM Scrolling**
- Messages in DMs now scroll properly
- Can see all messages in conversation
- Auto-scrolls to bottom on new messages

---

## 🎯 How to Use

### **As an Admin:**

1. **Open Admin Panel** (Heart icon in sidebar)
2. **Find the user** you want to ban
3. **Click "Ban" button**
4. **Enter ban reason** when prompted
5. **Enter duration** when prompted (or leave empty for permanent)

**Example Workflow:**
```
Admin clicks "Ban" on user "baduser123"
→ Prompt: "Enter ban reason:" 
→ Admin types: "Spam"
→ Prompt: "Enter ban duration:" (shows examples)
→ Admin types: "1h"
→ Result: "User baduser123 has been timed out for 1h"
```

---

## 🔧 Duration Format Examples

### **Quick Timeouts:**
- `10s` - 10 second timeout (testing)
- `30s` - 30 second timeout (very minor)
- `1m` - 1 minute timeout (warning)
- `5m` - 5 minute timeout (light warning)
- `15m` - 15 minute timeout (moderate warning)

### **Short Timeouts:**
- `30m` - 30 minute timeout
- `1h` - 1 hour timeout (common for spam)
- `2h` - 2 hour timeout
- `6h` - 6 hour timeout
- `12h` - 12 hour timeout

### **Medium Timeouts:**
- `1d` - 1 day timeout (serious violations)
- `2d` - 2 day timeout
- `3d` - 3 day timeout
- `1w` - 1 week timeout (very serious)
- `2w` - 2 week timeout

### **Long Timeouts:**
- `1mo` - 1 month timeout (extreme violations)
- `3mo` - 3 month timeout
- `6mo` - 6 month timeout
- `1y` - 1 year timeout (nearly permanent)

### **Permanent Ban:**
- `permanent` - Never auto-unbans (except Rank 5 → 1d)
- Leave empty - Same as permanent

---

## 🛡️ Rank 5 Special Rules

### **What happens when you ban Rank 5:**

| Admin Action | Result |
|--------------|--------|
| Ban with `5m` duration | ✅ 5 minute timeout |
| Ban with `1d` duration | ✅ 1 day timeout |
| Ban with `permanent` | ⚠️ Converts to 1 day timeout |
| Ban for underage | ❌ Permanent ban (no protection) |

**Example:**
```javascript
// Admin tries to permanently ban Rank 5 user
banUser("Mark 2.0", "Spam", "permanent");

// System converts to:
timeout("Mark 2.0", "Spam", "1d"); // 1 day protection

// But underage violations are permanent:
banUser("Mark 2.0", "Age 11", "permanent");
// Result: Permanent ban (no exceptions for underage)
```

---

## 📱 User Experience

### **When Timed Out:**
Users will see on login:
```
Your account is temporarily timed out.
Reason: Spam
Time remaining: 5 minutes
```

### **When Permanently Banned:**
Users will see:
```
Your account has been permanently banned.
Reason: Violation of terms of service
You may submit a ban appeal.
```

### **Time Format:**
- Shows in most relevant unit (seconds, minutes, hours, days, months, years)
- Updates dynamically
- Auto-logs in when timeout expires

---

## 🔄 Backend Implementation

### **Duration Parser:**
```javascript
parseDuration("5m")  → 300000 ms (5 minutes)
parseDuration("1d")  → 86400000 ms (1 day)
parseDuration("1w")  → 604800000 ms (1 week)
parseDuration("permanent") → -1 (no expiry)
```

### **Ban Function:**
```javascript
banUser(username, reason, duration)

// Examples:
banUser("spammer", "Spam", "5m")      // 5 min timeout
banUser("toxic", "Harassment", "1d")   // 1 day timeout
banUser("child", "Age 11", "permanent") // Permanent ban
```

### **Timeout Check (on login):**
```javascript
if (user.timedOut) {
  const now = Date.now();
  const timeoutEnd = new Date(user.timeoutEndsAt).getTime();
  
  if (now >= timeoutEnd) {
    // Timeout expired - auto unban
    clearTimeout(user);
    allowLogin();
  } else {
    // Still timed out
    showTimeRemaining();
  }
}
```

---

## 📊 Database Structure

### **User Object:**
```typescript
interface User {
  // ... other fields
  
  // Permanent Ban
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  
  // Temporary Timeout
  timedOut?: boolean;
  timeoutReason?: string;
  timeoutStartedAt?: string;
  timeoutEndsAt?: string;
  timeoutDuration?: string; // "5m", "1d", etc.
  
  // Rank
  rank: number; // 5 = Owner/Co-Owner
}
```

---

## 🎮 Console Commands

### **Give Rank 5:**
```javascript
giveRank5ToMark20()
```

### **Manual Ban (Backend):**
```javascript
await fetch('https://PROJECT.supabase.co/functions/v1/make-server-b35a818f/admin/ban', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    adminUsername: 'admin',
    targetUsername: 'baduser',
    reason: 'Spam',
    duration: '1h'
  })
}).then(r => r.json()).then(console.log);
```

---

## 🚨 Important Notes

1. **Underage violations**: Always permanent ban, no exceptions
2. **Rank 5 protection**: Only applies to non-underage violations
3. **Auto-expiry**: Happens on login check, not in background
4. **Invalid formats**: Treated as permanent ban
5. **Case insensitive**: `1D`, `1d`, `1Day` all invalid (use `1d`)

---

## ✅ Testing the System

### **Test Cases:**

1. **30 second timeout:**
   - Ban user with `30s`
   - Wait 30 seconds
   - User can log in

2. **Rank 5 protection:**
   - Ban Rank 5 with `permanent`
   - Check: Converted to `1d` timeout
   - Underage reason → Permanent

3. **Invalid format:**
   - Enter `5 minutes` → Treated as permanent
   - Enter `5min` → Treated as permanent
   - Only `5m` works

4. **DM scrolling:**
   - Send 20+ messages
   - All messages visible
   - Scrollbar works

---

## 📞 Support

For questions or issues, contact the SAFECORD development team.

**Last Updated**: January 5, 2026
