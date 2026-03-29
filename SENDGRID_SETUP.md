# SendGrid Email Setup Guide

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Click **"Start for Free"**
3. Sign up with your email (minatoventuresinc@gmail.com)
4. Verify your email address
5. Complete the signup process

## Step 2: Create API Key

1. Log in to SendGrid Dashboard
2. Go to **Settings** → **API Keys** (left sidebar)
3. Click **"Create API Key"**
4. Name it: `CauseAI Backend`
5. Select **"Full Access"** (or at minimum "Mail Send" access)
6. Click **"Create & View"**
7. **IMPORTANT**: Copy the API key immediately (you won't see it again!)
   - It will look like: `SG.xxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

## Step 3: Verify Sender Identity

SendGrid requires sender verification to prevent spam:

1. In SendGrid Dashboard, go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   - **From Name**: CauseAI
   - **From Email Address**: minatoventuresinc@gmail.com
   - **Reply To**: minatoventuresinc@gmail.com
   - **Company Address**: Your address
   - **City**: Your city
   - **State**: Your state
   - **Zip Code**: Your zip
   - **Country**: United States
4. Click **"Create"**
5. Check your email (minatoventuresinc@gmail.com) for verification link
6. Click the verification link

## Step 4: Add Environment Variables to Render

1. Go to https://dashboard.render.com/
2. Select your backend service: **rork-cause-student-ai-planner**
3. Click **"Environment"** tab (left sidebar)
4. Click **"Add Environment Variable"**
5. Add these variables one by one:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<paste-your-sendgrid-api-key-here>
FROM_NAME=CauseAI
FROM_EMAIL=minatoventuresinc@gmail.com
APP_URL=https://causeai.app
```

**IMPORTANT**: 
- For `SMTP_USER`, literally type `apikey` (not your username)
- For `SMTP_PASS`, paste the actual API key you copied from SendGrid
- For `FROM_EMAIL`, use the exact email you verified in Step 3

## Step 5: Deploy Backend

After adding all environment variables:

1. Render will automatically redeploy your service
2. Wait for deployment to complete (check the "Logs" tab)
3. Look for the message: `SMTP server is ready to send emails (Pooling Enabled)`

## Step 6: Test Email Sending

Test by:
1. Creating a new study group in your app
2. Check if you receive a confirmation email
3. Have someone join your group
4. Check if members receive join notifications
5. Send a message in the group
6. Check if members receive message notifications

## Troubleshooting

### "SMTP connection error"
- Double-check your API key is correct
- Make sure `SMTP_USER` is exactly `apikey` (lowercase)
- Verify sender email is verified in SendGrid

### "Sender not verified"
- Go back to SendGrid → Settings → Sender Authentication
- Make sure your email shows as "Verified"
- Click the verification link in your email

### Emails not arriving
- Check SendGrid Dashboard → Activity
- Look for sent emails and delivery status
- Check spam folder
- Verify recipient email addresses are correct

## SendGrid Free Tier Limits

- **100 emails per day**
- **2,000 contacts**
- Perfect for your app's needs!

If you need more, you can upgrade later.

## Support

If you encounter issues:
- SendGrid Support: https://support.sendgrid.com/
- SendGrid Docs: https://docs.sendgrid.com/
