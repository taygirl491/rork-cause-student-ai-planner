# Firebase Cloud Functions - Email Notifications

This directory contains Firebase Cloud Functions for sending email notifications in the CauseAI Study Groups feature.

## Features

- ✉️ **New Member Notifications**: Alerts existing members when someone joins their study group
- 💬 **New Message Notifications**: Notifies group members when new messages are posted
- 🧹 **Automatic Cleanup**: Removes orphaned messages when a study group is deleted

## Setup Instructions

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Functions (if not already done)

```bash
firebase init functions
```

Select:

- Use an existing project (select your CauseAI project)
- JavaScript
- Install dependencies

### 4. Install Dependencies

```bash
cd functions
npm install
```

### 5. Set up SendGrid

#### Get SendGrid API Key:

1. Sign up for a free SendGrid account at https://sendgrid.com
2. Verify your sender email address
3. Create an API key with "Mail Send" permissions

#### Configure Firebase:

```bash
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
```

**Note**: Replace `YOUR_SENDGRID_API_KEY` with your actual API key and use a verified sender email.

### 6. Deploy Functions

```bash
firebase deploy --only functions
```

Or deploy specific functions:

```bash
firebase deploy --only functions:notifyGroupMembersOnJoin
firebase deploy --only functions:notifyGroupMembersOnMessage
firebase deploy --only functions:cleanupGroupMessages
```

## Testing Locally

### Start Firebase Emulator:

```bash
cd functions
npm run serve
```

### Test Functions:

```bash
npm run shell
```

## Functions Reference

### `notifyGroupMembersOnJoin`

- **Trigger**: When a study group document is updated
- **Action**: Detects new members and sends email notifications to existing members
- **Email Recipients**: All existing group members (excludes new joiners)

### `notifyGroupMembersOnMessage`

- **Trigger**: When a new message is created in a group's messages subcollection
- **Action**: Sends email notification with message content
- **Email Recipients**: All group members except the message sender

### `cleanupGroupMessages`

- **Trigger**: When a study group is deleted
- **Action**: Removes all messages in the group's subcollection
- **No emails sent**

## Email Templates

All emails are styled with:

- Responsive HTML design
- Plain text fallback
- Professional CauseAI branding
- Clear call-to-action

## Cost Considerations

### SendGrid Free Tier:

- 100 emails/day forever free
- Perfect for small to medium study groups

### Firebase Functions:

- 2M invocations/month free
- 400,000 GB-seconds/month free
- Should be sufficient for most educational use cases

## Monitoring

### View Function Logs:

```bash
firebase functions:log
```

### View specific function:

```bash
firebase functions:log --only notifyGroupMembersOnMessage
```

### Firebase Console:

- Go to Firebase Console → Functions
- View execution logs, errors, and usage

## Troubleshooting

### "SendGrid API key not configured"

- Run: `firebase functions:config:get` to verify configuration
- Re-set the API key if missing

### Emails not sending

- Check SendGrid dashboard for blocked/bounced emails
- Verify sender email is verified in SendGrid
- Check Firebase Functions logs for errors

### Function not triggering

- Ensure functions are deployed: `firebase deploy --only functions`
- Check Firestore security rules allow the operations
- View logs for any execution errors

## Alternative Email Services

If you prefer not to use SendGrid, you can replace `@sendgrid/mail` with:

- **Nodemailer** (SMTP): Any email provider
- **AWS SES**: Amazon Simple Email Service
- **Mailgun**: Alternative transactional email service
- **Resend**: Modern email API

## Security Best Practices

1. ✅ Never commit API keys to version control
2. ✅ Use Firebase Functions Config for secrets
3. ✅ Validate email addresses before sending
4. ✅ Rate limit to prevent spam (built into SendGrid)
5. ✅ Include unsubscribe options for compliance

## Production Checklist

- [ ] SendGrid account verified and API key set
- [ ] Sender email verified in SendGrid
- [ ] Functions deployed to Firebase
- [ ] Test email delivery in production
- [ ] Monitor function execution and costs
- [ ] Set up billing alerts in Firebase Console
