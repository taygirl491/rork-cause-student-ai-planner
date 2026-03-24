import React from 'react';
import { StripeProvider as StripeProviderNative } from '@stripe/stripe-react-native';

interface StripeProviderProps {
    children: React.ReactElement;
}

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
const STRIPE_MERCHANT_ID = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID || 'merchant.com.causeai';

export default function StripeProvider({ children }: StripeProviderProps) {
    return (
        <StripeProviderNative
            publishableKey={STRIPE_PUBLISHABLE_KEY}
            merchantIdentifier={STRIPE_MERCHANT_ID}
        >
            {children}
        </StripeProviderNative>
    );
}
