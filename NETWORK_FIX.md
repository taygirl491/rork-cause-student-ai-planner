# Network Configuration Fix

## The Problem

`Network request failed` means your app can't reach the backend server.

## The Solution (Choose Based on Your Setup)

### 1️⃣ **Android Emulator** (Most Common)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

✅ `10.0.2.2` is a special alias that maps to your host machine's `localhost`

### 2️⃣ **iOS Simulator**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

✅ iOS Simulator shares network with your Mac

### 3️⃣ **Physical Android/iOS Device**

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

Replace `192.168.X.X` with your computer's IP address.

**Find your IP:**

- **Windows:** `ipconfig` → Look for "IPv4 Address"
- **Mac/Linux:** `ifconfig` → Look for "inet"

**Your computer's IPs:**

- `192.168.56.1`
- `192.168.6.1`
- `192.168.146.1`
- `172.20.10.3`

**Which one to use?**

- If on WiFi: Usually starts with `192.168.` or `10.`
- Try `172.20.10.3` first (looks like WiFi/mobile hotspot)

### 4️⃣ **Expo Go on Physical Device**

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

Same as #3 - use your computer's IP address

### 5️⃣ **Web Browser**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

✅ Works fine in web browsers

## Quick Fix Steps

### Step 1: Update `.env` file

Edit the `.env` file in your project root:

**For Android Emulator (Current Setup):**

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

**For Physical Device (If needed):**

```env
EXPO_PUBLIC_API_URL=http://172.20.10.3:3000
```

### Step 2: Restart Expo

```bash
# Stop the current Expo server (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Clear Cache (If still not working)

```bash
npm start -- --clear
```

## Verify Backend is Running

1. **Check backend is started:**

```bash
cd backend
npm start
```

Should see: `✓ Server running on port 3000`

2. **Test from your computer's browser:**

```
http://localhost:3000/health
```

Should return: `{"status":"OK",...}`

3. **Test from emulator/device:**

```
http://10.0.2.2:3000/health
```

(or use your IP for physical device)

## Troubleshooting

### Still getting "Network request failed"?

**1. Check Firewall:**

```powershell
# Allow Node.js through Windows Firewall
netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
```

**2. Try Different Port:**
Edit `backend/.env`:

```env
PORT=3001
```

Then update root `.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

**3. Verify Backend URL in App:**
Add this to test in your app:

```typescript
console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);
```

**4. Test with Postman/Browser:**
Try accessing:

- `http://10.0.2.2:3000/health` (from Android Emulator browser)
- `http://localhost:3000/health` (from your PC browser)

## Common Mistakes

❌ **Using `localhost` on Android Emulator**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000  # Won't work!
```

✅ **Use `10.0.2.2` instead**

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000  # Works!
```

❌ **Wrong IP for physical device**

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000  # Loopback won't work!
```

✅ **Use actual network IP**

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000  # Works!
```

## Production Note

When you deploy:

```env
EXPO_PUBLIC_API_URL=https://your-backend.com
```

---

**Current Configuration:** Android Emulator with `10.0.2.2:3000`

**Need to change?** Edit `.env` and restart Expo!
