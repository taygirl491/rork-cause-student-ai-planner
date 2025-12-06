# Email Notifications Setup - Quick Start

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 3: Get SendGrid API Key (FREE)

1. **Sign up**: https://sendgrid.com/free/
2. **Verify email**: Check your inbox and verify your sender address
3. **Create API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "CauseAI Notifications"
   - Permissions: "Restricted Access" → Check "Mail Send"
   - Copy the API key (you'll only see it once!)

### Step 4: Configure Firebase

```bash
# From project root directory
firebase functions:config:set sendgrid.api_key="YOUR_API_KEY_HERE"
firebase functions:config:set sendgrid.from_email="your-verified-email@domain.com"
```

### Step 5: Deploy

```bash
firebase deploy --only functions
```

That's it! ✅

## 📧 What Happens Now?

### When someone joins a group:

- All existing members get an email notification
- Email includes: who joined, group name, class, school

### When someone sends a message:

- All group members (except sender) get an email
- Email includes: sender, message content, attachment count

### When a group is deleted:

- All messages are automatically cleaned up
- No orphaned data in Firestore

## 🧪 Testing

### Test locally:

```bash
cd functions
npm run serve
```

### Test in production:

1. Create a study group in the app
2. Have another user join
3. Check emails! 📬

## 💰 Costs

### SendGrid FREE Tier:

- ✅ 100 emails/day forever
- ✅ No credit card required
- ✅ Perfect for education

### Firebase Functions FREE Tier:

- ✅ 2M invocations/month
- ✅ Should handle hundreds of study groups
- ✅ Set up billing alerts just in case

## 🔍 Monitoring

### View logs:

```bash
firebase functions:log
```

### Check SendGrid dashboard:

- https://app.sendgrid.com/statistics
- See delivery rates, opens, bounces

## ❓ Troubleshooting

### "API key not configured"

```bash
# Check current config
firebase functions:config:get

# Reset if needed
firebase functions:config:set sendgrid.api_key="YOUR_KEY"
```

### Emails not arriving

1. Check spam folder
2. Verify sender email in SendGrid
3. Check Firebase function logs
4. Check SendGrid activity feed

### Function not deploying

```bash
# Make sure you're in the right project
firebase use --add

# Deploy with verbose logging
firebase deploy --only functions --debug
```

## 🎯 Next Steps

1. **Customize emails**: Edit `functions/index.js` templates
2. **Add unsubscribe**: Add user preferences in Firestore
3. **Email digest**: Send daily/weekly summaries instead of real-time
4. **Push notifications**: Add FCM for in-app notifications too

## 📚 Resources

- [SendGrid Docs](https://docs.sendgrid.com/)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices/)

---

Need help? Check `functions/README.md` for detailed documentation.
