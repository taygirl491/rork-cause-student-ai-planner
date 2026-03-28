# Gmail Setup Instructions for Nodemailer

## Step 1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "How you sign in to Google", enable **2-Step Verification** (if not already enabled)
4. After enabling 2-Step Verification, go back to Security
5. Under "How you sign in to Google", click on **App passwords**
6. Select app: **Mail**
7. Select device: **Other (Custom name)**
8. Enter name: **CauseAI Student Planner**
9. Click **Generate**
10. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

## Step 2: Add to .env File

Open `backend/.env` and add these two lines:

```env
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**IMPORTANT:** 
- Replace `your-gmail-address@gmail.com` with your actual Gmail address
- Replace `abcdefghijklmnop` with the 16-character app password (remove spaces!)
- The app password should be 16 characters WITHOUT spaces

## Step 3: Example .env Configuration

```env
# MongoDB
MONGODB_URI=your_mongodb_uri_here

# Gmail Configuration (NEW)
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Other existing variables...
```

## Step 4: Restart Backend Server

After adding the variables to `.env`, restart your backend server:

```bash
cd backend
npm start
```

## Testing

The email service will automatically verify the connection when the server starts. You should see:

```
SMTP server is ready to send emails
```

If you see an error, check that:
1. Your Gmail address is correct
2. Your app password has no spaces
3. 2-Step Verification is enabled on your Google account

## Available Email Functions

The new service includes:
- `sendWelcomeEmail(to, name)` - Welcome new users
- `sendPasswordResetEmail(to, resetLink)` - Password reset emails
- `sendBroadcastEmail(recipients, subject, message)` - Broadcast to multiple users
- `sendTestEmail(to)` - Test email functionality

## Troubleshooting

**Error: "Invalid login"**
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled

**Error: "Connection timeout"**
- Check your internet connection
- Gmail might be temporarily blocking the connection - wait a few minutes and try again

**Emails going to spam**
- This is normal for new senders
- Recipients should mark your emails as "Not Spam"
- After a few emails, Gmail will learn your sending pattern
