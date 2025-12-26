# Render Environment Variables - Current vs Required

## ❌ Current Configuration (Causing Timeouts)

Based on the error logs, Render is still using:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

This is why you're getting `Connection timeout` errors.

## ✅ Required Configuration

You need to change to:
```env
SMTP_PORT=587
SMTP_SECURE=false
```

## How to Update on Render

### Option 1: Via Dashboard (Recommended)

1. **Go to**: https://dashboard.render.com/
2. **Select**: Your backend service (rork-cause-student-ai-planner)
3. **Click**: "Environment" in the left sidebar
4. **Find and Edit**:
   - `SMTP_PORT`: Change `465` to `587`
   - `SMTP_SECURE`: Change `true` to `false`
5. **Click**: "Save Changes" button at the bottom
6. **Wait**: Render will auto-redeploy (~2 minutes)

### Option 2: Via Render CLI

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Update environment variables
render env set SMTP_PORT=587
render env set SMTP_SECURE=false
```

## Verification

After updating, check the Render logs. You should see:

**Success:**
```
✓ SMTP server is ready to send emails (Pooling Enabled)
```

**Still failing (if you see this, use SendGrid instead):**
```
SMTP connection error: Error: Connection timeout
```

## Alternative: Use SendGrid (Recommended)

If Gmail port 587 still doesn't work on Render, switch to SendGrid:

1. **Sign up**: https://sendgrid.com/ (free tier: 100 emails/day)
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Update Render environment variables**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=<your-sendgrid-api-key>
   FROM_EMAIL=noreply@causeai.com
   FROM_NAME=CauseAI Study Groups
   ```

SendGrid is more reliable for production and designed for cloud platforms like Render.
