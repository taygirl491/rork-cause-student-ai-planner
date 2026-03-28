# Backend Email Service - Quick Setup Guide

## 🚀 Quick Start

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

1. **Copy the example file:**

```bash
cp .env.example .env
```

2. **Edit `.env` with your settings:**

#### For Gmail (Free & Easy):

```env
# Server
PORT=3000

# Firebase (get from Firebase Console)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password

# Email Settings
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=CauseAI Study Groups
APP_URL=exp://localhost:19000

# Security (generate a random string)
API_SECRET=your-random-secret-key-here
```

#### Getting Gmail App Password:

1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Create new app password for "Mail"
5. Copy the 16-character password to `SMTP_PASS`

### Step 3: Get Firebase Service Account Key

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Save as `serviceAccountKey.json` in the `backend/` folder

### Step 4: Configure React Native App

1. **Create `.env` in project root:**

```bash
cd ..
cp .env.example .env
```

2. **Edit `.env`:**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_KEY=your-random-secret-key-here
```

**Important**: Use the SAME `API_SECRET` value in both backend and frontend!

### Step 5: Start the Backend

```bash
cd backend
npm start
```

You should see:

```
✓ SMTP server is ready to send emails
✓ Server running on port 3000
```

### Step 6: Test the Backend

```bash
curl http://localhost:3000/health
```

Should return:

```json
{
	"status": "OK",
	"timestamp": "2025-12-04...",
	"service": "CauseAI Email Service"
}
```

### Step 7: Run Your React Native App

```bash
cd ..
npm start
```

## ✅ Verification

1. **Create a study group** in the app
2. **Have another user join** the group
3. **Check the backend logs** - you should see:
   ```
   ✓ Sent 1 join notifications for group [Group Name]
   ```
4. **Check your email inbox** - existing members should receive join notification
5. **Send a message** in the group
6. **Check emails** - members should receive message notification

## 📧 Email Features

### Join Notification:

- Sent to: All existing group members
- When: Someone new joins
- Contains: New member email, group details

### Message Notification:

- Sent to: All group members except sender
- When: New message posted
- Contains: Sender, message preview, attachment count

## 🔧 Alternative SMTP Providers

### SendGrid (100 emails/day free):

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Outlook/Hotmail:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Custom SMTP:

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

## 🚀 Production Deployment

### Option 1: Render.com (Free)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repo, select `backend` folder
4. Add environment variables
5. Deploy!

### Option 2: Railway.app (Free $5 credit)

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
```

### Option 3: Heroku

```bash
heroku create your-app-name
cd backend
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

### Update App Environment:

```env
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
```

## 🔍 Troubleshooting

### "SMTP connection error"

- Check username/password
- For Gmail: Use app password, not regular password
- Check firewall/antivirus

### "Unauthorized" error in app

- Verify `API_SECRET` matches in both `.env` files
- Check `x-api-key` header is being sent

### Emails not received

- Check spam folder
- Verify SMTP credentials
- Check backend logs for errors
- Test with different email provider

### "Cannot find module 'dotenv'"

```bash
cd backend
npm install
```

## 📊 Monitoring

### View Backend Logs:

```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Test Email Endpoints:

**Join Notification:**

```bash
curl -X POST http://localhost:3000/api/notify/group-join \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{"groupId":"test-group-id","newMemberEmails":["new@example.com"]}'
```

**Message Notification:**

```bash
curl -X POST http://localhost:3000/api/notify/group-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{"groupId":"test-group-id","messageId":"test-message-id"}'
```

## 🎯 Next Steps

- [ ] Deploy backend to production
- [ ] Set up custom domain for emails
- [ ] Add email preferences (daily digest, mute, etc.)
- [ ] Add push notifications alongside emails
- [ ] Monitor email delivery rates

## 💡 Tips

- **Development**: Use your personal Gmail for testing
- **Production**: Use SendGrid or dedicated SMTP service
- **Security**: Never commit `.env` files to git
- **Performance**: Backend can handle 100+ groups easily
- **Scaling**: Add Redis for rate limiting if needed

---

Need help? Check the backend logs or open an issue!
