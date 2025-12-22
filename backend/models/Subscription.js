const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    _id: {
        type: String, // Stripe subscription ID
        required: true,
    },
    userId: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    customerId: {
        type: String, // Stripe customer ID
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
        required: true,
    },
    priceId: {
        type: String,
        required: true,
    },
    currentPeriodStart: {
        type: Date,
        required: true,
    },
    currentPeriodEnd: {
        type: Date,
        required: true,
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Indexes
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ customerId: 1 });
subscriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
