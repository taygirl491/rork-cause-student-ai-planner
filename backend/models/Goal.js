const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    dueDate: {
        type: String,
        default: '',
    },
    completed: {
        type: Boolean,
        default: false,
    },
    habits: [{
        id: String,
        title: String,
        completed: Boolean,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

// Indexes
goalSchema.index({ userId: 1 });
goalSchema.index({ completed: 1 });

module.exports = mongoose.model('Goal', goalSchema);
