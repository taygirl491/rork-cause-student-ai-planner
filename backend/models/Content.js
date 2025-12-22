const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: 'videos', // Single document for video configuration
    },
    homeVideoId: {
        type: String,
        default: null,
    },
    causesVideo1Id: {
        type: String,
        default: null,
    },
    causesVideo2Id: {
        type: String,
        default: null,
    },
    causesVideo3Id: {
        type: String,
        default: null,
    },
    causesVideo4Id: {
        type: String,
        default: null,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: String, // Admin email
        default: null,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Content', contentSchema);
