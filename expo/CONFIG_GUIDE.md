# 🔐 Configuration Guide

## 1. SMTP_USER & SMTP_PASS (Gmail)

### SMTP_USER:
**What it is:** Your Gmail email address  
**Example:** `johndoe@gmail.com`

### SMTP_PASS:
**What it is:** A special app-specific password (NOT your regular Gmail password)

**How to get it:**

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Under "Signing in to Google", click "2-Step Verification"
   - Follow the setup process

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Type: "CauseAI Backend"
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

**Example in .env:**
```env
SMTP_USER=johndoe@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**Note:** You can include or remove spaces - both work:
- `abcd efgh ijkl mnop` ✅
- `abcdefghijklmnop` ✅

---

## 2. APP_URL

**What it is:** The URL users will use to open your app from emails

### During Development:
```env
APP_URL=exp://localhost:8081
```

### For Production:
```env
APP_URL=https://yourapp.com
# or
APP_URL=myapp://
```

**Why it matters:** Emails have an "Open CauseAI" button that uses this URL

---

## 3. API_SECRET

**What it is:** A secure random string to protect your backend API

### Generate it:

**Option 1 - PowerShell (Windows):**
```powershell
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2 - Generate Online:**
- Go to: https://www.random.org/strings/?num=1&len=64&digits=on&loweralpha=on&unique=on&format=plain
- Copy the generated string

**Option 3 - Manual:**
Use any random 32+ character string:
```
f4e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9
```

**Example in .env:**
```env
API_SECRET=f4e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9
```

**⚠️ IMPORTANT:** Use the **SAME** value in both:
- `backend/.env` (API_SECRET)
- Root `.env` (EXPO_PUBLIC_API_KEY)

---

## 📝 Complete Example

**backend/.env:**
```env
PORT=3000
NODE_ENV=development

FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=johndoe@gmail.com
SMTP_PASS=abcdefghijklmnop

FROM_EMAIL=johndoe@gmail.com
FROM_NAME=CauseAI Study Groups

APP_URL=exp://localhost:8081

API_SECRET=f4e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9
```

**Root .env:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_KEY=f4e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9
```

---

## ✅ Quick Checklist

- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] API_SECRET generated and copied to both .env files
- [ ] FROM_EMAIL set to your Gmail
- [ ] APP_URL set correctly
- [ ] Firebase service account key downloaded

---

## 🔍 Troubleshooting

### "Invalid login" error:
- Make sure you're using an **app password**, not your regular Gmail password
- Check that 2FA is enabled on your Google account

### "Unauthorized" in app:
- Verify API_SECRET in `backend/.env` matches EXPO_PUBLIC_API_KEY in root `.env`
- Make sure both are set correctly

### Can't generate app password:
- 2FA must be enabled first
- May need to wait a few minutes after enabling 2FA
- Try a different browser if the option doesn't appear

---

## 🆘 Need Help?

Run this to test your SMTP configuration:
```bash
cd backend
npm run test-email
```

(Coming soon - add this to package.json if needed)
