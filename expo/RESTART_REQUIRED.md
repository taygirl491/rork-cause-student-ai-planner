# ⚠️ RESTART REQUIRED

## Changes Made:

- ✅ Fixed syntax error in `apiService.ts`
- ✅ Changed API URL from `10.0.2.2:3000` to `192.168.146.1:3000`
- ✅ Backend is running and accessible

## 🔄 ACTION REQUIRED:

### 1. Restart Expo Development Server

Stop the current Expo server (press `Ctrl+C` in the terminal) and restart:

```bash
npm start
```

**Why?** Environment variables (`.env` file) are only loaded when the app starts.

### 2. Reload the App

- Press `r` in the Expo terminal, OR
- Shake your device and tap "Reload", OR
- Press `Ctrl+R` in the Android emulator

### 3. Test Again

Send a message in a study group and you should see:

```
✓ Message created in Firestore
[API] Calling http://192.168.146.1:3000/api/notify/new-message
[API] Message response status: 200
✓ Email notification sent successfully
```

---

## 🔍 Why 10.0.2.2 Didn't Work?

`10.0.2.2` is a special Android emulator address that should map to `localhost`, but it can fail due to:

- Windows networking/firewall issues
- Hyper-V or WSL2 interference
- VirtualBox/VMware network adapters

**Solution:** Use your computer's actual IP address (`192.168.146.1`) instead.

---

## 🎯 Quick Checklist:

- [ ] Backend server running (`npm start` in `backend/` folder)
- [ ] Expo server **restarted** (not just reloaded)
- [ ] App reloaded on device/emulator
- [ ] Send a test message

---

**If it still doesn't work after restart, check:**

1. Backend terminal shows incoming requests: `[2025-12-04...] POST /api/notify/new-message`
2. Windows Firewall isn't blocking (you may need to run as admin to add the rule)
