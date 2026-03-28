require('dotenv').config();
const Stripe = require('stripe');

// Make Stripe optional - only initialize if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
    })
    : null;

if (!stripe) {
    console.log('⚠️  Stripe not configured - payment features disabled');
}

/**
 * Create a payment intent for one-time payments
 * @param {number} amount - Amount in cents (e.g., 1000 = $10.00)
 * @param {string} currency - Currency code (e.g., 'usd')
 * @param {string} customerId - Optional Stripe customer ID
 * @param {object} metadata - Optional metadata
 * @returns {Promise<object>} Payment intent with client secret
 */
async function createPaymentIntent(amount, currency = 'usd', customerId = null, metadata = {}) {
    try {
        const paymentIntentData = {
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        };

        if (customerId) {
            paymentIntentData.customer = customerId;
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw new Error(`Failed to create payment intent: ${error.message}`);
    }
}

/**
 * Create an ephemeral key for a Stripe customer
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<object>} Ephemeral key
 */
async function createEphemeralKey(customerId) {
    try {
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: '2023-10-16' } // Match with your Stripe library version or a stable one
        );
        return ephemeralKey;
    } catch (error) {
        console.error('Error creating ephemeral key:', error);
        throw new Error(`Failed to create ephemeral key: ${error.message}`);
    }
}

/**
 * Create or retrieve a Stripe customer
 * @param {string} email - Customer email
 * @param {string} userId - Your app's user ID
 * @param {string} name - Customer name
 * @returns {Promise<object>} Stripe customer
 */
async function createOrGetCustomer(email, userId, name = null) {
    try {
        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
            email: email,
            limit: 1,
        });

        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0];
        }

        // Create new customer
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                userId,
            },
        });

        return customer;
    } catch (error) {
        console.error('Error creating/getting customer:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
    }
}

/**
 * Create a subscription for recurring payments
 * @param {string} customerId - Stripe customer ID
 * @param {string} priceId - Stripe price ID
 * @param {object} metadata - Optional metadata
 * @returns {Promise<object>} Subscription with client secret
 */
async function createSubscription(customerId, priceIdOrProductId, metadata = {}) {
    try {
        let priceId = priceIdOrProductId;

        // If a Product ID is provided (starts with 'prod_'), fetch its default price
        if (priceIdOrProductId && priceIdOrProductId.startsWith('prod_')) {
            console.log(`[Stripe] Resolving price for product: ${priceIdOrProductId}`);
            const prices = await stripe.prices.list({
                product: priceIdOrProductId,
                active: true,
                limit: 1,
            });

            if (prices.data.length === 0) {
                throw new Error(`No active price found for product ${priceIdOrProductId}`);
            }
            priceId = prices.data[0].id;
            console.log(`[Stripe] Resolved price ID: ${priceId}`);
        }

        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            collection_method: 'charge_automatically', // Explicitly force automatic charging
            payment_settings: {
                save_default_payment_method: 'on_subscription',
                payment_method_types: ['card'], // Explicitly request card to nudge PI generation
            },
            expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
            metadata,
        });

        console.log(`[Stripe] Subscription created: ${subscription.id}, Status: ${subscription.status}`);

        // Robust handling of latest_invoice with retries
        let clientSecret = null;
        let invoice = subscription.latest_invoice;

        if (invoice) {
            const invoiceId = typeof invoice === 'string' ? invoice : invoice.id;
            console.log(`[Stripe] Resolving Payment Intent for Invoice: ${invoiceId}`);

            // Increased retry loop (up to 5 times with 1.5s delay)
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    const fullInvoice = await stripe.invoices.retrieve(invoiceId, {
                        expand: ['payment_intent']
                    });

                    console.log(`[Stripe] Invoice ${invoiceId} Attempt ${attempt}: status=${fullInvoice.status}, pi=${!!fullInvoice.payment_intent}, amount_due=${fullInvoice.amount_due}`);
                    console.log(`[Stripe] Collection Method: ${fullInvoice.collection_method}, Auto-pay: ${fullInvoice.auto_advance}`);

                    if (fullInvoice.payment_intent) {
                        clientSecret = typeof fullInvoice.payment_intent === 'object'
                            ? fullInvoice.payment_intent.client_secret
                            : (await stripe.paymentIntents.retrieve(fullInvoice.payment_intent)).client_secret;

                        if (clientSecret) {
                            console.log(`[Stripe] Success: Found client_secret via PI (${clientSecret.substring(0, 10)}...)`);
                            break;
                        }
                    }

                    if (fullInvoice.paid || fullInvoice.amount_due === 0) {
                        console.log(`[Stripe] Invoice already paid or $0. Checking for setup_intent fallback...`);
                        break;
                    }

                    if (attempt < 5) {
                        console.log(`[Stripe] PI not ready. Keys: ${Object.keys(fullInvoice).filter(k => k.includes('payment')).join(', ')}`);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                } catch (err) {
                    console.error(`[Stripe] Error retrieving invoice ${invoiceId} (Attempt ${attempt}):`, err);
                }
            }
        }

        // Fallback 1: Check for pending_setup_intent (used for 0-amount or trial subscriptions)
        if (!clientSecret && subscription.pending_setup_intent) {
            console.log('[Stripe] Checking pending_setup_intent...');
            const setupIntent = subscription.pending_setup_intent;
            clientSecret = typeof setupIntent === 'object'
                ? setupIntent.client_secret
                : (await stripe.setupIntents.retrieve(setupIntent)).client_secret;
        }

        // Fallback 2: If the invoice is OPEN but has no PI, create a SetupIntent for the customer
        // This allows PaymentSheet to collect a card, which will then trigger payment for the open invoice
        if (!clientSecret && invoice) {
            const invoiceId = typeof invoice === 'string' ? invoice : invoice.id;
            console.warn(`[Stripe] Still no client_secret for invoice ${invoiceId}. Creating fallback SetupIntent.`);
            try {
                const setupIntent = await stripe.setupIntents.create({
                    customer: customerId,
                    usage: 'off_session',
                    metadata: {
                        subscription_id: subscription.id,
                        invoice_id: invoiceId,
                        user_id: metadata.userId
                    },
                    payment_method_types: ['card'],
                });
                clientSecret = setupIntent.client_secret;
                console.log(`[Stripe] Created fallback SetupIntent: ${setupIntent.id}`);
            } catch (siError) {
                console.error('[Stripe] Failed to create fallback SetupIntent:', siError);
            }
        }

        if (!clientSecret) {
            console.error(`[Stripe] CRITICAL: Failed to resolve client_secret for subscription ${subscription.id}`);
            // Log a bit more about the subscription to help debug
            console.log(`[Stripe] Subscription Final State: status=${subscription.status}, coll_method=${subscription.collection_method}`);
            throw new Error('Stripe failed to provide a payment secret. Please check your Stripe dashboard for subscription ' + subscription.id);
        }

        console.log(`[Stripe] Resolved clientSecret: ${clientSecret ? clientSecret.substring(0, 10) + '...' : 'NULL'}`);

        return {
            subscriptionId: subscription.id,
            clientSecret: clientSecret,
            customerId: customerId,
        };
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw new Error(`Failed to create subscription: ${error.message}`);
    }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>} Cancelled subscription
 */
async function cancelSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.cancel(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
}

/**
 * Get customer's payment methods
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<array>} List of payment methods
 */
async function getPaymentMethods(customerId) {
    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return paymentMethods.data;
    } catch (error) {
        console.error('Error getting payment methods:', error);
        throw new Error(`Failed to get payment methods: ${error.message}`);
    }
}

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<object>} Payment intent
 */
async function getPaymentIntent(paymentIntentId) {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
}

/**
 * Retrieve a subscription
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<object>} Subscription
 */
async function getSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error retrieving subscription:', error);
        throw new Error(`Failed to retrieve subscription: ${error.message}`);
    }
}

/**
 * Create a product (for subscriptions)
 * @param {string} name - Product name
 * @param {string} description - Product description
 * @returns {Promise<object>} Product
 */
async function createProduct(name, description) {
    try {
        const product = await stripe.products.create({
            name,
            description,
        });
        return product;
    } catch (error) {
        console.error('Error creating product:', error);
        throw new Error(`Failed to create product: ${error.message}`);
    }
}

/**
 * Create a price for a product
 * @param {string} productId - Product ID
 * @param {number} unitAmount - Amount in cents
 * @param {string} currency - Currency code
 * @param {string} interval - Billing interval ('month', 'year', etc.)
 * @returns {Promise<object>} Price
 */
async function createPrice(productId, unitAmount, currency = 'usd', interval = 'month') {
    try {
        const price = await stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency,
            recurring: { interval },
        });
        return price;
    } catch (error) {
        console.error('Error creating price:', error);
        throw new Error(`Failed to create price: ${error.message}`);
    }
}

module.exports = {
    createPaymentIntent,
    createOrGetCustomer,
    createSubscription,
    cancelSubscription,
    getPaymentMethods,
    getPaymentIntent,
    getSubscription,
    createProduct,
    createPrice,
    createEphemeralKey,
    stripe, // Export stripe instance for advanced usage
};
