# FCM Service Account Key Upload Instructions

## Quick Steps

You have the FCM service account key file: `causeai-firebase-adminsdk-fbsvc-95239ff23e.json`

### Option 1: EAS Dashboard (Easiest)

1. Go to: https://expo.dev/accounts/eluwaiz/projects/cause-student-ai-planner/credentials
2. Find the **Android** section
3. Look for **FCM v1 service account key**
4. Click **Add a service account key** or **Upload**
5. Select the file: `causeai-firebase-adminsdk-fbsvc-95239ff23e.json`
6. Save

### Option 2: EAS CLI (Interactive)

Run this command and follow the prompts:

```bash
eas credentials
```

Then select:
- Platform: **Android**
- Build profile: **production** (or **preview** if you're testing)
- Option: **Google Service Account**
- Action: **Manage your Google Service Account Key for Push Notifications (FCM V1)**
- Choose: **Set up a Google Service Account Key for Push Notifications (FCM V1)**
- Select: **Upload a new service account key**
- Choose file: `causeai-firebase-adminsdk-fbsvc-95239ff23e.json`

## After Upload

Once uploaded, rebuild your app with:
```bash
eas build --profile preview --platform android
```

The new build will include the FCM credentials and push notifications will work!
