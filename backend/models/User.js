const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: {
        type: String, // Use Firebase UID as _id
        required: true,
    },
    email: {
        type: String,
        required: false, // Changed to false to allow streak service to create users
        unique: true,
        lowercase: true,
        trim: true,
        sparse: true, // Allow multiple null values for unique index
    },
    name: {
        type: String,
        trim: true,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    streak: {
        current: {
            type: Number,
            default: 0,
        },
        longest: {
            type: Number,
            default: 0,
        },
        lastCompletionDate: {
            type: String, // YYYY-MM-DD format
            default: null,
        },
        totalTasksCompleted: {
            type: Number,
            default: 0,
        },
        streakFreezes: {
            type: Number,
            default: 0,
        },
    },
    stripeCustomerId: {
        type: String,
        default: null,
    },
    subscriptionStatus: {
        type: String,
        enum: ['none', 'active', 'canceled', 'past_due'],
        default: 'none',
    },
    subscriptionId: {
        type: String,
        default: null,
    },
    expoPushToken: {
        type: String,
        default: null,
    },
    points: {
        type: Number,
        default: 0,
    },
    level: {
        type: Number,
        default: 1,
    },
    gamification: {
        habitsCompleted: { type: Number, default: 0 },
        featuresUsed: { type: Number, default: 0 },
        goalsCompleted: { type: Number, default: 0 },
    },
    purpose: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    tier: {
        type: String,
        enum: ['free', 'standard', 'premium', 'unlimited'],
        default: 'free',
    }
}, {
    timestamps: false,
    _id: false,
});

// Indexes
// Indexes handled by schema definitions
// userSchema.index({ email: 1 });
// userSchema.index({ stripeCustomerId: 1 });

module.exports = mongoose.model('User', userSchema);
