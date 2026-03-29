# 🔧 Enabling Stripe Payments - EAS Build Required

## ⚠️ Important: Why Payments Don't Work in Expo Go

The Stripe React Native SDK requires **native code** that isn't available in Expo Go. To enable payments, you need to create a **development build** using EAS Build.

---

## ✅ Current Status

✅ **Backend is ready** - All Stripe API endpoints are working  
✅ **Payment UI is ready** - Beautiful payment screen at `/payment`  
✅ **Pricing configured** - $4.99/month subscription  
⏸️ **Stripe SDK disabled** - Temporarily removed to fix the error  

---

## 🚀 How to Enable Payments (2 Options)

### **Option 1: Build with EAS (Recommended)**

This creates a custom development build with Stripe SDK included.

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure EAS
```bash
eas build:configure
```

#### Step 4: Build Development Version
```bash
# For Android
eas build --profile development --platform android

# For iOS (requires Apple Developer account)
eas build --profile development --platform ios
```

#### Step 5: Install the Build
- Download the APK/IPA from the EAS dashboard
- Install on your device
- Payments will now work!

#### Step 6: Re-enable Stripe Provider
Once you have the development build, uncomment these lines in `app/_layout.tsx`:

```typescript
import StripeProvider from "@/contexts/StripeContext";

// Wrap RootLayoutNav with StripeProvider:
<StripeProvider>
  <RootLayoutNav />
</StripeProvider>
```

---

### **Option 2: Use Web Payments (Alternative)**

If you don't want to use EAS Build, you can implement web-based payments:

1. Create a web checkout page
2. Redirect users to Stripe Checkout
3. Handle webhooks for subscription status

This is simpler but less integrated.

---

## 📱 Current Payment Screen

The payment screen at `/payment` currently shows:
- ✅ Beautiful pricing UI
- ✅ Feature list
- ✅ $4.99/month pricing
- ℹ️ Notice about EAS Build requirement
- ℹ️ Link to EAS Build documentation

Users can view the pricing but will see a message explaining that payment requires a development build.

---

## 🎯 Recommended Workflow

### For Development:
1. Continue developing with Expo Go
2. Payment screen shows pricing info
3. Backend is ready and tested

### When Ready for Payments:
1. Run `eas build --profile development`
2. Install the development build
3. Re-enable StripeProvider
4. Test payments with test cards

### For Production:
1. Run `eas build --profile production`
2. Submit to App Store / Play Store
3. Users can subscribe!

---

## 💰 Backend is Ready!

Your backend already has full Stripe integration:

✅ `/api/stripe/create-subscription` - Create subscription  
✅ `/api/stripe/cancel-subscription` - Cancel subscription  
✅ `/api/stripe/user-subscriptions/:userId` - Get subscriptions  
✅ `/api/stripe/webhook` - Handle Stripe events  

All you need is the development build to enable the frontend!

---

## 🧪 Testing Without EAS Build

You can still test the backend:

```bash
# Test creating a subscription (using curl or Postman)
curl -X POST http://localhost:3000/api/stripe/create-subscription \
  -H "x-api-key: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "priceId": "price_your_stripe_price_id"
  }'
```

---

## 📚 Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Stripe React Native**: https://stripe.com/docs/payments/accept-a-payment?platform=react-native
- **Development Builds**: https://docs.expo.dev/develop/development-builds/introduction/

---

## 🎯 Quick Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for Android
eas build --profile development --platform android

# Build for iOS
eas build --profile development --platform ios
```

---

## ✅ When Payments Are Enabled

Once you have a development build:

1. **Re-enable StripeProvider** in `app/_layout.tsx`
2. **Test with test card**: `4242 4242 4242 4242`
3. **Check Stripe Dashboard** for subscriptions
4. **Verify Firestore** for subscription records

---

## 💡 Alternative: Web-Only Approach

If you want to avoid EAS Build entirely, you can:

1. Remove the payment screen from the app
2. Direct users to a web page for payment
3. Use Stripe Checkout (hosted by Stripe)
4. Sync subscription status via webhooks

This is simpler but less integrated into the app experience.

---

**The backend is ready! Just need EAS Build to enable the frontend.** 🚀

Let me know if you want help setting up EAS Build or if you prefer the web-only approach!
