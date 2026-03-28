import apiService from './apiService';

export interface PaymentIntent {
    clientSecret: string;
    paymentIntentId: string;
    customerId: string;
}

export interface Subscription {
    clientSecret: string;
    subscriptionId: string;
    customerId: string;
}

/**
 * Create a payment intent for one-time payment
 * @param amount - Amount in cents (e.g., 1000 = $10.00)
 * @param userId - User ID
 * @param currency - Currency code (default: 'usd')
 * @param metadata - Optional metadata
 */
export async function createPaymentIntent(
    amount: number,
    userId: string,
    currency: string = 'usd',
    metadata: Record<string, any> = {}
): Promise<PaymentIntent> {
    try {
        const response = await apiService.post('/api/stripe/create-payment-intent', {
            amount,
            userId,
            currency,
            metadata,
        });

        if (response.success) {
            return {
                clientSecret: response.clientSecret,
                paymentIntentId: response.paymentIntentId,
                customerId: response.customerId,
            };
        } else {
            throw new Error(response.error || 'Failed to create payment intent');
        }
    } catch (error: any) {
        console.error('Payment Intent Error:', error);
        throw new Error(error.message || 'Failed to create payment intent');
    }
}

/**
 * Create a subscription
 * @param priceId - Stripe price ID
 * @param userId - User ID
 * @param metadata - Optional metadata
 */
export async function createSubscription(
    priceId: string,
    userId: string,
    metadata: Record<string, any> = {}
): Promise<Subscription> {
    try {
        const response = await apiService.post('/api/stripe/create-subscription', {
            priceId,
            userId,
            metadata,
        });

        if (response.success) {
            return {
                clientSecret: response.clientSecret,
                subscriptionId: response.subscriptionId,
                customerId: response.customerId,
            };
        } else {
            throw new Error(response.error || 'Failed to create subscription');
        }
    } catch (error: any) {
        console.error('Subscription Error:', error);
        throw new Error(error.message || 'Failed to create subscription');
    }
}

/**
 * Cancel a subscription
 * @param subscriptionId - Subscription ID
 * @param userId - User ID
 */
export async function cancelSubscription(
    subscriptionId: string,
    userId: string
): Promise<void> {
    try {
        const response = await apiService.post('/api/stripe/cancel-subscription', {
            subscriptionId,
            userId,
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to cancel subscription');
        }
    } catch (error: any) {
        console.error('Cancel Subscription Error:', error);
        throw new Error(error.message || 'Failed to cancel subscription');
    }
}

/**
 * Get user's payment methods
 * @param userId - User ID
 */
export async function getPaymentMethods(userId: string): Promise<any[]> {
    try {
        const response = await apiService.get(`/api/stripe/payment-methods/${userId}`);

        if (response.success) {
            return response.paymentMethods || [];
        } else {
            throw new Error(response.error || 'Failed to get payment methods');
        }
    } catch (error: any) {
        console.error('Get Payment Methods Error:', error);
        throw new Error(error.message || 'Failed to get payment methods');
    }
}

/**
 * Get user's subscriptions
 * @param userId - User ID
 */
export async function getUserSubscriptions(userId: string): Promise<any[]> {
    try {
        const response = await apiService.get(`/api/stripe/user-subscriptions/${userId}`);

        if (response.success) {
            return response.subscriptions || [];
        } else {
            throw new Error(response.error || 'Failed to get subscriptions');
        }
    } catch (error: any) {
        console.error('Get Subscriptions Error:', error);
        throw new Error(error.message || 'Failed to get subscriptions');
    }
}

/**
 * Get subscription details
 * @param subscriptionId - Subscription ID
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
    try {
        const response = await apiService.get(`/api/stripe/subscription/${subscriptionId}`);

        if (response.success) {
            return response.subscription;
        } else {
            throw new Error(response.error || 'Failed to get subscription');
        }
    } catch (error: any) {
        console.error('Get Subscription Error:', error);
        throw new Error(error.message || 'Failed to get subscription');
    }
}

// Pricing tiers
export const PRICING_TIERS = {
    STANDARD_MONTHLY: {
        name: 'Standard Monthly',
        price: 500, // $5 in cents
        priceId: 'price_1ShIc8P0t2AuYFqK2waTumLy',
        interval: 'month',
        features: [
            'Tasks, Calendar, Classes',
            'Study Groups & Causes',
            'Notes & Goals',
            '150 AI inquiries/month',
        ],
    },
    STANDARD_YEARLY: {
        name: 'Standard Yearly',
        price: 3500, // $35 in cents
        priceId: 'price_1Sl6k0P0t2AuYFqKrlQXkYUq',
        interval: 'year',
        features: [
            'Tasks, Calendar, Classes',
            'Study Groups & Causes',
            'Notes & Goals',
            '150 AI inquiries/month',
            'Save $25/year',
        ],
    },
    PREMIUM_MONTHLY: {
        name: 'Premium Monthly',
        price: 1000, // $10 in cents
        priceId: 'price_1Sl6opP0t2AuYFqKRMdGp5kO',
        interval: 'month',
        features: [
            'Everything in Standard',
            'Sync Syllabus with Calendar',
            '400 AI inquiries/month',
        ],
    },
    PREMIUM_YEARLY: {
        name: 'Premium Yearly',
        price: 7000, // $70 in cents
        priceId: 'price_1Sl6piP0t2AuYFqKnKhrNQRg',
        interval: 'year',
        features: [
            'Everything in Standard',
            'Sync Syllabus with Calendar',
            '400 AI inquiries/month',
            'Save $50/year',
        ],
    },
    UNLIMITED_MONTHLY: {
        name: 'Unlimited Monthly',
        price: 2000, // $20 in cents
        priceId: 'price_1Sl6rWP0t2AuYFqKshMpasoI',
        interval: 'month',
        features: [
            'Everything in Premium',
            'Unlimited AI inquiries',
            'Priority support',
        ],
    },
    UNLIMITED_YEARLY: {
        name: 'Unlimited Yearly',
        price: 14000, // $140 in cents
        priceId: 'price_1Sl6sFP0t2AuYFqK2JYnhp6N',
        interval: 'year',
        features: [
            'Everything in Premium',
            'Unlimited AI inquiries',
            'Priority support',
            'Save $100/year',
        ],
    },
};

