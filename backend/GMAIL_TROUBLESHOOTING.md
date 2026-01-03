# Gmail SMTP Troubleshooting for Render

## Current Issue
Connection timeout when connecting to Gmail SMTP from Render servers.

## Solutions Tried

### Solution 1: Explicit SMTP Configuration ✅ CURRENT
Instead of using `service: 'gmail'`, we're now using explicit SMTP settings:

```javascript
host: 'smtp.gmail.com',
port: 587,  // STARTTLS
secure: false,
```

**Why this helps:**
- More control over connection settings
- Port 587 is less likely to be blocked than 465
- STARTTLS is more compatible with cloud servers

### Solution 2: Alternative Ports (If 587 Fails)

If port 587 still times out, try these alternatives:

#### Option A: Port 465 (SSL/TLS)
```javascript
host: 'smtp.gmail.com',
port: 465,
secure: true,  // Use SSL
```

#### Option B: Port 25 (Fallback)
```javascript
host: 'smtp.gmail.com',
port: 25,
secure: false,
```

**Note:** Port 25 is often blocked by cloud providers, but worth trying.

### Solution 3: Verify Gmail Settings

1. **Check App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Verify the password is still valid
   - Generate a new one if needed

2. **Check Gmail Account Settings:**
   - Go to https://myaccount.google.com/security
   - Ensure "Less secure app access" is OFF (we're using app passwords)
   - Ensure 2-Step Verification is ON

3. **Check for Account Restrictions:**
   - Gmail might be blocking the IP temporarily
   - Try sending from a different Gmail account

### Solution 4: Use Gmail API Instead of SMTP

If SMTP continues to fail, we can switch to Gmail API:
- More reliable for cloud servers
- Requires OAuth2 setup
- More complex but bypasses SMTP blocks

### Solution 5: Network Debugging

Add to Render environment variables:
```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This disables TLS certificate validation (already in code).

## Testing Steps

1. **Deploy current changes** (using port 587)
2. **Check Render logs** for connection details
3. **If still fails**, try port 465
4. **If still fails**, try Gmail API

## Current Configuration

```env
GMAIL_USER=minatoventuresinc@gmail.com
GMAIL_APP_PASSWORD=wsfesfnjxmnhffks
```

Port: **587** (STARTTLS)
Timeout: **60 seconds**
TLS: **Relaxed** (accepts self-signed certs)
