import React from 'react';
import { StripeProvider as StripeProviderNative } from '@stripe/stripe-react-native';

interface StripeProviderProps {
    children: React.ReactElement;
}

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

export default function StripeProvider({ children }: StripeProviderProps) {
    return (
        <StripeProviderNative
            publishableKey={STRIPE_PUBLISHABLE_KEY}
            merchantIdentifier="merchant.com.causeai" // Replace with your merchant ID for Apple Pay
        >
            {children}
        </StripeProviderNative>
    );
}
