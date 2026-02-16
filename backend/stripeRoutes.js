const express = require('express');
const router = express.Router();
const {
    createPaymentIntent,
    createOrGetCustomer,
    createSubscription,
    cancelSubscription,
    getPaymentMethods,
    getPaymentIntent,
    getSubscription,
    createEphemeralKey,
} = require('./stripeService');
const User = require('./models/User');
const Subscription = require('./models/Subscription');

/**
 * POST /api/stripe/create-payment-intent
 * Create a payment intent for one-time payment
 */
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'usd', userId, metadata = {} } = req.body;

        if (!amount || !userId) {
            return res.status(400).json({
                error: 'Missing required fields: amount, userId',
            });
        }

        // Get or create user in MongoDB
        let user = await User.findById(userId);

        if (!user) {
            console.log(`[Stripe] User ${userId} not found in MongoDB, creating...`);
            // Create user with minimal data
            user = await User.create({
                _id: userId,
                email: '',
                streak: {
                    current: 0,
                    longest: 0,
                    lastCompletionDate: null,
                    totalTasksCompleted: 0,
                    streakFreezes: 0,
                },
            });
        }

        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await createOrGetCustomer(
                user.email || `${userId}@temp.com`,
                userId,
                user.name || null
            );
            customerId = customer.id;

            // Save customer ID to MongoDB
            user.stripeCustomerId = customerId;
            await user.save();
        }

        // Create payment intent
        const { clientSecret, paymentIntentId } = await createPaymentIntent(
            amount,
            currency,
            customerId,
            { ...metadata, userId }
        );

        res.json({
            success: true,
            clientSecret,
            paymentIntentId,
            customerId,
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            details: error.message,
        });
    }
});

/**
 * POST /api/stripe/create-subscription
 * Create a subscription for recurring payments
 */
router.post('/create-subscription', async (req, res) => {
    try {
        const { priceId, userId, metadata = {} } = req.body;

        if (!priceId || !userId) {
            return res.status(400).json({
                error: 'Missing required fields: priceId, userId',
            });
        }

        // Get or create user in MongoDB
        let user = await User.findById(userId);

        if (!user) {
            console.log(`[Stripe] User ${userId} not found in MongoDB, creating...`);
            // Create user with minimal data - email will be added when we create Stripe customer
            user = await User.create({
                _id: userId,
                email: '', // Will be updated if we have it
                streak: {
                    current: 0,
                    longest: 0,
                    lastCompletionDate: null,
                    totalTasksCompleted: 0,
                    streakFreezes: 0,
                },
            });
        }

        let customerId = user.stripeCustomerId;

        if (!customerId) {
            // Ensure we have a semi-valid email to satisfy Stripe requirements
            const customerEmail = (user.email && user.email.includes('@'))
                ? user.email
                : `${userId}@firebase.temp`;

            console.log(`[Stripe] Creating customer for user ${userId} with email: ${customerEmail}`);

            const customer = await createOrGetCustomer(
                customerEmail,
                userId,
                user.name || null
            );
            customerId = customer.id;

            // Save customer ID to MongoDB
            user.stripeCustomerId = customerId;
            await user.save();
        }

        // Create subscription
        const { subscriptionId, clientSecret } = await createSubscription(
            customerId,
            priceId,
            { ...metadata, userId }
        );

        // Save subscription to MongoDB
        await Subscription.create({
            _id: subscriptionId,
            userId,
            customerId,
            priceId,
            status: 'incomplete',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
            createdAt: new Date(),
        });

        // Create ephemeral key for the customer
        const ephemeralKey = await createEphemeralKey(customerId);

        res.json({
            success: true,
            clientSecret,
            subscriptionId,
            customerId,
            ephemeralKey: ephemeralKey.secret,
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            error: 'Failed to create subscription',
            details: error.message,
        });
    }
});

/**
 * POST /api/stripe/cancel-subscription
 * Cancel a subscription
 */
router.post('/cancel-subscription', async (req, res) => {
    try {
        const { subscriptionId, userId } = req.body;

        if (!subscriptionId || !userId) {
            return res.status(400).json({
                error: 'Missing required fields: subscriptionId, userId',
            });
        }

        // Verify subscription belongs to user
        const sub = await Subscription.findById(subscriptionId);
        if (!sub || sub.userId !== userId) {
            return res.status(403).json({
                error: 'Unauthorized',
            });
        }

        // Cancel subscription
        const subscription = await cancelSubscription(subscriptionId);

        // Update MongoDB
        sub.status = 'canceled';
        sub.cancelAtPeriodEnd = true;
        await sub.save();

        res.json({
            success: true,
            subscription,
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            details: error.message,
        });
    }
});

/**
 * GET /api/stripe/payment-methods/:userId
 * Get user's payment methods
 */
router.get('/payment-methods/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        const customerId = user?.stripeCustomerId;

        if (!customerId) {
            return res.json({
                success: true,
                paymentMethods: [],
            });
        }

        const paymentMethods = await getPaymentMethods(customerId);

        res.json({
            success: true,
            paymentMethods,
        });
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({
            error: 'Failed to get payment methods',
            details: error.message,
        });
    }
});

/**
 * GET /api/stripe/subscription/:subscriptionId
 * Get subscription details
 */
router.get('/subscription/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        const subscription = await getSubscription(subscriptionId);

        res.json({
            success: true,
            subscription,
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        res.status(500).json({
            error: 'Failed to get subscription',
            details: error.message,
        });
    }
});

/**
 * GET /api/stripe/user-subscriptions/:userId
 * Get all subscriptions for a user
 */
router.get('/user-subscriptions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const subscriptions = await Subscription.find({ userId });

        res.json({
            success: true,
            subscriptions,
        });
    } catch (error) {
        console.error('Error getting user subscriptions:', error);
        res.status(500).json({
            error: 'Failed to get user subscriptions',
            details: error.message,
        });
    }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        const stripe = require('./stripeService').stripe;
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('PaymentIntent succeeded:', paymentIntent.id);
                // Update your database
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('PaymentIntent failed:', failedPayment.id);
                // Handle failed payment
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                const priceId = subscription.items.data[0]?.price?.id;

                // Map Price ID to tier
                let tier = 'free';
                const standardPrices = ['price_1ShIc8P0t2AuYFqK2waTumLy', 'price_1Sl6k0P0t2AuYFqKrlQXkYUq'];
                const premiumPrices = ['price_1Sl6opP0t2AuYFqKRMdGp5kO', 'price_1Sl6piP0t2AuYFqKnKhrNQRg'];
                const unlimitedPrices = ['price_1Sl6rWP0t2AuYFqKshMpasoI', 'price_1Sl6sFP0t2AuYFqK2JYnhp6N'];

                if (standardPrices.includes(priceId)) tier = 'standard';
                else if (premiumPrices.includes(priceId)) tier = 'premium';
                else if (unlimitedPrices.includes(priceId)) tier = 'unlimited';

                // Update Subscription in MongoDB
                const updatedSub = await Subscription.findByIdAndUpdate(
                    subscription.id,
                    {
                        _id: subscription.id,
                        customerId: subscription.customer,
                        status: subscription.status,
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        priceId: priceId,
                    },
                    { upsert: true, new: true }
                );

                // Update User Tier in MongoDB
                if (updatedSub && tier !== 'free') {
                    await User.findOneAndUpdate(
                        { stripeCustomerId: subscription.customer },
                        { tier: tier, subscriptionStatus: subscription.status }
                    );
                    console.log(`[Stripe Webhook] Updated user tier to ${tier} for customer ${subscription.customer}`);
                }
                break;

            case 'customer.subscription.deleted':
                const deletedSub = event.data.object;
                await Subscription.findByIdAndUpdate(deletedSub.id, {
                    status: 'canceled',
                    cancelAtPeriodEnd: true,
                });

                // Reset user tier to free
                await User.findOneAndUpdate(
                    { stripeCustomerId: deletedSub.customer },
                    { tier: 'free', subscriptionStatus: 'none' }
                );
                console.log(`[Stripe Webhook] Reset user tier to free for customer ${deletedSub.customer}`);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

module.exports = router;
