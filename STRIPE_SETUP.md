# 💳 Stripe Payment - $4.99/Month Subscription

## Overview
Your CauseAI app now has Stripe payment integration for a **$4.99/month Premium subscription**.

---

## 🎯 What Users Get

### Premium Monthly - $4.99/month
✅ Unlimited AI conversations  
✅ Advanced quiz generation  
✅ Document & image uploads  
✅ Cross-mode memory  
✅ Priority support  
✅ Ad-free experience  

**30-Day Money-Back Guarantee**

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Get Stripe Account
1. Sign up at [stripe.com](https://stripe.com)
2. Go to [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
3. Copy your **Secret key** (sk_test_...)
4. Copy your **Publishable key** (pk_test_...)

### Step 2: Add Environment Variables

**Backend (`backend/.env`):**
```env
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Frontend (root `.env`):**
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

### Step 3: Create Product in Stripe
1. Go to [dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Fill in:
   - **Name**: Premium Monthly
   - **Description**: Monthly subscription to CauseAI Premium
   - **Pricing model**: Standard pricing
   - **Price**: $4.99 USD
   - **Billing period**: Monthly
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_`)

### Step 4: Update Price ID
Open `utils/stripeService.ts` and update line 170:
```typescript
priceId: 'price_YOUR_ACTUAL_PRICE_ID_HERE', // Replace this!
```

### Step 5: Test It!
```bash
# Restart backend
cd backend
npm start

# Restart frontend (new terminal)
npx expo start -c
```

**Test card**: `4242 4242 4242 4242`  
**Expiry**: Any future date  
**CVC**: Any 3 digits  

---

## 📱 How to Use in Your App

### Navigate to Payment Screen
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/payment');
```

### Check if User is Premium
```typescript
import { getUserSubscriptions } from '@/utils/stripeService';

const subscriptions = await getUserSubscriptions(user.uid);
const isPremium = subscriptions.some(sub => sub.status === 'active');

if (isPremium) {
    // Show premium features
} else {
    // Show upgrade prompt
}
```

### Gate Premium Features
```typescript
// Example: Limit free users to 10 AI messages per day
const FREE_TIER_LIMIT = 10;

if (!isPremium && messageCount >= FREE_TIER_LIMIT) {
    Alert.alert(
        'Upgrade to Premium',
        'You've reached your daily limit. Upgrade for unlimited access!',
        [
            { text: 'Maybe Later', style: 'cancel' },
            { 
                text: 'Upgrade - $4.99/mo', 
                onPress: () => router.push('/payment') 
            }
        ]
    );
    return;
}

// Continue with premium feature...
```

---

## 🎨 Payment Screen Features

The payment screen (`app/payment.tsx`) includes:
- 🌟 Hero section with app branding
- 💎 Premium pricing card ($4.99/month)
- ✨ Feature list with checkmarks
- 💯 30-day money-back guarantee badge
- 💳 Stripe payment sheet integration
- 🔒 Secure payment messaging
- ⚡ "BEST VALUE" badge

---

## 🔧 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-subscription` | POST | Start $4.99/mo subscription |
| `/api/stripe/cancel-subscription` | POST | Cancel subscription |
| `/api/stripe/user-subscriptions/:userId` | GET | Get user's subscriptions |
| `/api/stripe/webhook` | POST | Handle Stripe events |

---

## 🧪 Testing

### Test Cards
```
✅ Success: 4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
💰 Insufficient: 4000 0000 0000 9995
🔐 3D Secure: 4000 0025 0000 3155
```

### Test Subscription Flow
1. Open app and navigate to `/payment`
2. Click "Subscribe Now"
3. Enter test card: `4242 4242 4242 4242`
4. Complete payment
5. Check Stripe Dashboard for subscription
6. Check Firestore for subscription record

---

## 🔒 Security

✅ All payments processed by Stripe (PCI compliant)  
✅ No card data stored on your servers  
✅ Webhook signature verification  
✅ User authentication on all endpoints  
✅ Environment variables for sensitive keys  

---

## 📊 Monitoring

### Stripe Dashboard
- View all subscriptions
- Track monthly recurring revenue (MRR)
- Monitor failed payments
- Manage customer subscriptions

### Firestore Database
- `users/{userId}` → Contains `stripeCustomerId`
- `subscriptions/{subscriptionId}` → Contains subscription details

---

## 🚨 Before Going Live

- [ ] Switch to live Stripe keys (remove `_test_`)
- [ ] Update webhook endpoint to production URL
- [ ] Test with real (small) transaction
- [ ] Add Terms of Service link
- [ ] Add Privacy Policy link
- [ ] Add Refund Policy
- [ ] Enable Stripe Radar (fraud protection)
- [ ] Set up email receipts in Stripe
- [ ] Test subscription cancellation
- [ ] Test webhook events

---

## 💡 Monetization Ideas

1. **Free Trial** - Offer 7-day free trial
2. **Usage Limits** - Free users get 10 AI messages/day
3. **Feature Gating** - Lock advanced features behind paywall
4. **Promo Codes** - Offer discount codes for marketing
5. **Annual Plan** - Add yearly option at $49.99/year (save $10)

---

## 🐛 Troubleshooting

### Payment not working?
- Check Stripe keys are correct in `.env`
- Verify price ID matches Stripe Dashboard
- Check console for error messages
- Ensure backend server is running

### Subscription not showing?
- Check webhook is configured
- Verify Firestore rules allow writes
- Check `subscriptions` collection in Firestore

### "No such customer" error?
- Customer is created automatically on first payment
- Check `users/{userId}` has `stripeCustomerId` field

---

## 📚 Files Created

**Backend:**
- `backend/stripeService.js` - Stripe SDK wrapper
- `backend/stripeRoutes.js` - API endpoints
- `backend/server.js` - Updated with routes

**Frontend:**
- `utils/stripeService.ts` - Payment service
- `contexts/StripeContext.tsx` - Stripe provider
- `app/payment.tsx` - Payment screen UI
- `app/_layout.tsx` - Updated with provider

**Documentation:**
- `STRIPE_SETUP.md` - This file
- `STRIPE_INTEGRATION_SUMMARY.md` - Quick reference

---

## 🎯 Next Steps

1. ✅ Get Stripe account and API keys
2. ✅ Add keys to environment variables
3. ✅ Create $4.99/month product in Stripe
4. ✅ Update price ID in code
5. ⏭️ Test with test cards
6. ⏭️ Add premium feature gating
7. ⏭️ Set up webhooks for production
8. ⏭️ Go live!

---

**Ready to start earning $4.99/month per premium user!** 🚀💰

Need help? Check the Stripe Dashboard logs or ask me!
