# Fix Windows Firewall for Android Emulator

## The Problem

Your Android emulator can't connect to the local backend because Windows Firewall is blocking port 3000.

**Evidence**: Backend shows no incoming requests even though frontend is trying to connect.

## Quick Fix Options

### Option 1: Add Firewall Rule (Requires Admin)

**Run PowerShell as Administrator** and execute:

```powershell
New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Option 2: Temporarily Disable Firewall (Quick Test)

1. Open Windows Security
2. Go to "Firewall & network protection"
3. Click on your active network (Private/Public)
4. Turn off "Windows Defender Firewall"
5. Test the broadcast email
6. **Turn firewall back on after testing**

### Option 3: Use Physical Android Device

Instead of emulator:

1. Connect Android phone to same WiFi as your computer
2. Find your computer's IP address:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.1.100`)

3. Update `utils/apiService.ts`:
   ```typescript
   const DEV_API_URL = Platform.OS === 'android' 
       ? 'http://192.168.1.100:3000'  // Your computer's IP
       : 'http://localhost:3000';
   ```

4. Reload app and test

### Option 4: Test on iOS Simulator (If you have Mac)

iOS simulator uses `localhost` directly, no firewall issues.

### Option 5: Just Use Production with Mailgun

Skip local testing and implement Mailgun for production (Option 2 from earlier).

## Recommended: Option 1 (Firewall Rule)

This is the cleanest solution. Here's how:

1. **Right-click PowerShell** → **Run as Administrator**
2. **Paste this command**:
   ```powershell
   New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
3. **Press Enter**
4. **Restart the app** (press `r` in Expo terminal)
5. **Test broadcast email**

## Verify It's Working

After adding firewall rule, you should see in backend logs:
```
[TIMESTAMP] POST /api/admin/broadcast-email
Starting broadcast to 5 users...
```

If you still see nothing, the firewall rule didn't work - try Option 2 or 3.

## Why This Happens

- Android emulator uses `10.0.2.2` to reach host machine
- Windows Firewall sees this as external connection
- Blocks it by default for security
- Need to explicitly allow port 3000

---

**Which option do you want to try?**
