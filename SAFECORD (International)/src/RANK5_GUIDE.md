# SAFECORD Rank 5 Initialization Guide

## Quick Console Command

To give **Mark 2.0** Rank 5 (Owner/Co-Owner), open your browser console (F12) and run:

```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-b35a818f/init-rank5', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ secret: 'SAFECORD_INIT_2025' })
})
.then(res => res.json())
.then(data => console.log('✅ Result:', data))
.catch(err => console.error('❌ Error:', err));
```

**Replace:**
- `YOUR_PROJECT_ID` with your actual Supabase project ID
- `YOUR_ANON_KEY` with your actual Supabase anon key

---

## What Was Fixed

### 1. **Custom Duration Bans & Timeouts for All Users**
- ✅ **Custom duration support**: Seconds, minutes, hours, days, weeks, months, years
- ✅ **Format**: `30s`, `5m`, `2h`, `1d`, `1w`, `1mo`, `1y`
- ✅ **Rank 5 protection**: Owner/Co-Owner cannot get permanent bans (except underage)
- ✅ **Auto-expiry**: Timeouts automatically clear when duration ends
- ✅ **Permanent option**: Still available for serious violations
- ✅ **Underage violations**: Always result in permanent bans (required by law)

### 2. **Role Assignment Permissions**
- ✅ **Rank 5 (Owner/Co-Owner)** can assign any role including Rank 5
- ✅ **Rank 4 and below** cannot assign Rank 5
- ✅ **Co-Owners** can assign roles 1-4 but not Rank 5
- ✅ Only **Owners** (specifically "mrconferce2" or "Mark 2.0") can assign Rank 5

### 3. **Real-Time Rank Updates**
- ✅ User ranks are checked every **5 seconds**
- ✅ Pages automatically update when someone's rank changes
- ✅ No manual refresh needed
- ✅ Console logs rank changes for debugging

### 4. **Rank 5 Initialization**
- ✅ Backend endpoint `/init-rank5` created
- ✅ Secure with secret key: `SAFECORD_INIT_2025`
- ✅ Can be called via console or DevUtils component
- ✅ Properly saves rank to both `user:username` and `user_by_id:userId`

---

## How the Custom Timeout System Works

### For Any User (Rank 1-5):
```
Violation → Custom Duration Timeout → Auto-unban when time expires
Or
Violation → Permanent Ban → Must be manually unbanned or appeal
```

### For High-Rank Users (Rank 5):
```
Non-underage violation + permanent ban request → Converted to 1 day timeout
Non-underage violation + custom timeout → Uses custom timeout
Underage violation → Permanent Ban (required by law, no exceptions)
```

### Example Ban Call with Duration:
```javascript
// 5 minute timeout
banUser("username", "Spam", "5m");

// 1 hour timeout
banUser("username", "Minor violation", "1h");

// 1 day timeout
banUser("username", "Harassment", "1d");

// 1 week timeout
banUser("username", "Serious violation", "1w");

// 1 month timeout
banUser("username", "Major violation", "1mo");

// Permanent ban (or 1 day for Rank 5 if not underage)
banUser("username", "Extreme violation", "permanent");

// Underage = always permanent
banUser("username", "Disclosed age 12 or under", "permanent");
```

---

## Rank Structure

| Rank | Role | Color | Permissions |
|------|------|-------|-------------|
| 5 | Owner/Co-Owner | Yellow (Crown icon) | All permissions, assign any rank, timeout protection |
| 4 | Admin | Purple (Star icon) | Manage users, assign ranks 1-3 |
| 3 | Moderator | Blue (Shield icon) | Moderate content, kick users |
| 2 | Tester | Green | Access test features |
| 1 | Member | Gray | Basic access |

---

## Admin Panel Commands

### Rank Assignment:
```
/rank 5 username    - Owner/Co-Owner (Rank 5 only can assign this)
/rank 4 username    - Admin
/rank 3 username    - Moderator  
/rank 2 username    - Tester
/rank 1 username    - Member
```

### Ban Commands:
```
/ban username reason              - Will prompt for custom duration
/unban username                   - Remove ban/timeout
```

**Duration Examples:**
- `30s` - 30 seconds timeout
- `5m` - 5 minutes timeout
- `2h` - 2 hours timeout
- `1d` - 1 day timeout
- `1w` - 1 week timeout
- `1mo` - 1 month timeout
- `1y` - 1 year timeout
- `permanent` - Permanent ban (Rank 5 gets 1 day instead unless underage)

---

## Testing the System

1. **Give Mark 2.0 Rank 5** using the console command above
2. **Log in as Mark 2.0** 
3. **Open Admin Panel** (Heart icon in sidebar)
4. **Test rank assignment:**
   - Try `/rank 5 testuser` - should work
   - Try `/rank 4 testuser` - should work
5. **Test timeout:**
   - Try `/ban highrank spam` - should get 1 day timeout
   - Try `/ban highrank harassment 1week` - should get 1 week timeout
   - Try `/unban highrank` - should clear timeout

---

## Troubleshooting

### "Rank 5 doesn't work in console"
- Make sure you replaced `YOUR_PROJECT_ID` and `YOUR_ANON_KEY`
- Check browser console for error messages
- Verify the backend is deployed on Supabase

### "Rank doesn't update immediately"
- Wait up to 5 seconds for auto-refresh
- Check browser console for "Rank changed from X to Y" message
- Try logging out and back in

### "Still showing as Rank 0"
- Check that init-rank5 endpoint returned success
- Verify username is exactly "Mark 2.0" (case-sensitive)
- Check Supabase Functions logs for errors

---

## Security Notes

- ✨ **Secret Key**: `SAFECORD_INIT_2025` protects the init endpoint
- ✨ **Protected Users**: wolfattack199 and mark are hardcoded as protected
- ✨ **Underage Protection**: Always permanently bans regardless of rank
- ✨ **Auto-expiry**: Timeouts automatically clear when duration ends

---

## Support

For issues or questions, contact the SAFECORD development team.
