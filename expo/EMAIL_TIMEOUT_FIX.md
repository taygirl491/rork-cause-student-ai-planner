# Email Service Timeout Fix

## Issue
Connection timeout (ETIMEDOUT) when trying to send emails via Gmail SMTP:
```
Error code: ETIMEDOUT
SMTP command: CONN
```

## Root Cause
Cloud platforms like Render often block or restrict outbound SMTP connections on ports 25, 465, and 587 to prevent spam.

## Solution Applied

### Updated SMTP Configuration
Changed from `service: 'gmail'` to explicit SMTP settings with:
- **Port 587** with STARTTLS (most reliable for cloud platforms)
- **Extended timeouts** (60 seconds) to handle slow connections
- **Connection pooling** for better performance
- **Rate limiting** to avoid Gmail throttling

### Changes Made
File: `backend/emailService.js`

```javascript
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    // Extended timeouts
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000,
    socketTimeout: 60000,
    // Connection pooling
    pool: true,
    maxConnections: 5,
    // TLS settings
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  });
};
```

## Testing

After deploying this change:

1. **Test locally first**:
   ```bash
   cd backend
   # Make sure .env has GMAIL_USER and GMAIL_APP_PASSWORD
   # Test the email service
   ```

2. **Deploy to Render** and monitor logs

3. **If still getting ETIMEDOUT**, Render may be blocking SMTP entirely

## Alternative Solutions (If SMTP is Blocked)

### Option 1: Use SendGrid (Recommended)
SendGrid has a free tier (100 emails/day) and works well on Render.

**Setup**:
1. Sign up at https://sendgrid.com
2. Get API key
3. Install: `npm install @sendgrid/mail`
4. Update code to use SendGrid API instead of SMTP

### Option 2: Use Mailgun
Similar to SendGrid, API-based email service.

### Option 3: Use Render's Email Add-on
Check if Render offers email service add-ons.

### Option 4: Use Gmail API (OAuth2)
More complex but bypasses SMTP entirely.

## Next Steps

1. ✅ Deploy the updated SMTP configuration
2. ✅ Test email sending on Render
3. ⚠️ If still timing out, consider switching to SendGrid (see Option 1 above)

## Monitoring

Watch for these log messages:
- ✅ `✓ Welcome email sent successfully!` - Email worked!
- ❌ `Error code: ETIMEDOUT` - Still blocked, need alternative solution
- ❌ `Error code: EAUTH` - Authentication issue, check credentials
- ❌ `Error code: ECONNREFUSED` - Port blocked, definitely need alternative

## SendGrid Migration (If Needed)

If SMTP continues to fail, here's a quick SendGrid setup:

```bash
npm install @sendgrid/mail
```

```javascript
// emailService.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendWelcomeEmail(to, name) {
  const msg = {
    to: to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Welcome to CauseAI Student Planner! 🎓',
    html: `<h1>Welcome ${name}!</h1>...`
  };
  
  await sgMail.send(msg);
}
```

This bypasses SMTP entirely and uses SendGrid's HTTP API.
