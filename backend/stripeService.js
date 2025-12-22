require('dotenv').config();
const Stripe = require('stripe');

// Make Stripe optional - only initialize if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
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
async function createSubscription(customerId, priceId, metadata = {}) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata,
        });

        return {
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
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
    stripe, // Export stripe instance for advanced usage
};
