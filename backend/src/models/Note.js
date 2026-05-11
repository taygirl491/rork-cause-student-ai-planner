const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
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
    content: {
        type: String,
        default: '',
    },
    className: {
        type: String,
        default: '',
    },
    classId: {
        type: String,
        default: null,
    },
    tags: [{
        type: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

// Indexes
// noteSchema.index({ userId: 1 });
noteSchema.index({ classId: 1 });

module.exports = mongoose.model('Note', noteSchema);
