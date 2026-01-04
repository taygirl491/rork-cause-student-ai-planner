# Email Service and Database Fixes - Deployment Guide

## Summary of Changes

### 1. Database Migration Script ✅
**File**: `backend/migrations/fix-email-index.js`

Fixes the MongoDB duplicate key error by:
- Dropping the old non-sparse `email_1` index
- Creating a new sparse unique index that allows multiple `null` values
- Testing the fix by creating multiple users without emails
- Verifying the index is correctly configured

### 2. Email Service Diagnostics ✅
**File**: `backend/emailService.js`

Added comprehensive diagnostics:
- `checkEmailConfig()` - Validates environment variables on startup
- `verifyEmailService()` - Tests Gmail connection
- Enhanced error logging with detailed SMTP error information
- Configuration status logging

### 3. Server Endpoint Improvements ✅
**File**: `backend/server.js`

Updated `/api/auth/welcome-email` endpoint to:
- Properly await email sending (no more fire-and-forget)
- Return detailed error responses
- Include helpful debugging hints
- Log all email attempts

---

## Deployment Steps

### Step 1: Run Database Migration (CRITICAL)

The migration MUST be run before deploying the new code to fix the duplicate key error.

#### Option A: Run Locally (Recommended)
```bash
cd backend
node migrations/fix-email-index.js
```

#### Option B: Run on Render
1. SSH into your Render instance or use Render Shell
2. Navigate to backend directory
3. Run: `node migrations/fix-email-index.js`

**Expected Output**:
```
🔧 Starting email index migration...
📡 Connecting to MongoDB...
✓ Connected to MongoDB

📋 Checking existing indexes...
🗑️  Dropping old email_1 index...
✓ Dropped old email_1 index

🔨 Creating new sparse unique index on email...
✓ Created new sparse unique index

🔍 Verifying new index...
✓ Index verification successful!

🧪 Testing: Creating users with null email...
✓ Created first user with null email
✓ Created second user with null email
✓ Cleaned up test users

✅ Migration completed successfully!
```

### Step 2: Verify Email Credentials on Render

1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to "Environment" tab
4. Verify these variables are set:
   - `GMAIL_USER`: Your Gmail address (e.g., `your-email@gmail.com`)
   - `GMAIL_APP_PASSWORD`: Your Gmail app-specific password

**Important**: `GMAIL_APP_PASSWORD` must be an **App Password**, not your regular Gmail password.

#### How to Create Gmail App Password:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords"
4. Generate a new app password for "Mail"
5. Copy the 16-character password
6. Set it as `GMAIL_APP_PASSWORD` in Render

### Step 3: Deploy Updated Code

```bash
# Commit changes
git add .
git commit -m "Fix: Email service diagnostics and database index migration"
git push origin main
```

Render will automatically deploy the new code.

### Step 4: Verify Deployment

#### Check Email Configuration
Watch the Render logs when the server starts. You should see:
```
📧 Email Service Configuration:
  GMAIL_USER: ✓ Set (you***)
  GMAIL_APP_PASSWORD: ✓ Set
```

If you see `✗ NOT SET`, the environment variables are missing.

#### Test Welcome Email
1. Create a new user account in your app
2. Check Render logs for:
```
📧 Welcome email request for: user@example.com
📧 Attempting to send welcome email to: user@example.com
📤 Sending email...
✓ Welcome email sent successfully!
  Message ID: <some-id>
  Recipient: user@example.com
```

3. Check the user's email inbox for the welcome email

#### Test Streak Service
1. Complete a task to trigger streak update
2. Check logs - should NOT see duplicate key errors
3. Verify user was created/updated in MongoDB

---

## Troubleshooting

### Issue: Migration fails with "email_1 index not found"
**Solution**: This is fine! It means the index was already dropped or never existed. The migration will create the new sparse index.

### Issue: "Email service not configured" error
**Cause**: Missing `GMAIL_USER` or `GMAIL_APP_PASSWORD` environment variables

**Solution**:
1. Check Render environment variables
2. Make sure both are set
3. Restart the service after adding them

### Issue: "Invalid login" or "Authentication failed"
**Cause**: Using regular Gmail password instead of App Password

**Solution**:
1. Generate a new Gmail App Password (see Step 2 above)
2. Update `GMAIL_APP_PASSWORD` in Render
3. Restart the service

### Issue: Emails not being received
**Possible Causes**:
1. Check spam folder
2. Verify Gmail account is not locked/suspended
3. Check Render logs for SMTP errors
4. Verify the recipient email is correct

**Debugging**:
```bash
# Check detailed error logs in Render
# Look for lines starting with ✗
```

### Issue: Still getting duplicate key errors
**Cause**: Migration wasn't run or failed

**Solution**:
1. Re-run the migration script
2. Check MongoDB directly to verify index configuration:
```javascript
db.users.getIndexes()
// Should show email_1 with sparse: true
```

---

## Verification Checklist

- [ ] Migration script ran successfully
- [ ] Email environment variables are set on Render
- [ ] Code deployed to Render
- [ ] Server logs show email configuration is valid
- [ ] Welcome email is sent when creating new account
- [ ] Welcome email is received in inbox
- [ ] Streak service works without duplicate key errors
- [ ] Multiple users can be created without emails

---

## Rollback Plan

If something goes wrong:

1. **Database**: The migration is safe and can be re-run. The sparse index is backwards compatible.

2. **Code**: Revert to previous commit:
```bash
git revert HEAD
git push origin main
```

3. **Email Service**: If emails stop working, check:
   - Environment variables are still set
   - Gmail account is not locked
   - App password is still valid

---

## Next Steps After Deployment

1. Monitor Render logs for the first few hours
2. Test user signup flow end-to-end
3. Verify no duplicate key errors in logs
4. Check that welcome emails are being delivered
5. If all looks good, mark deployment as successful ✅

---

## Support

If you encounter issues not covered here:
1. Check Render logs for detailed error messages
2. Verify MongoDB connection is working
3. Test Gmail credentials manually
4. Check that migration completed successfully
