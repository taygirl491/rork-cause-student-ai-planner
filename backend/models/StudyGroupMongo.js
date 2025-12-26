const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    className: {
        type: String,
        required: true,
        trim: true,
    },
    school: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
    },
    creatorId: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    members: [{
        email: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            default: '',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

// Indexes
// studyGroupSchema.index({ creatorId: 1 });
studyGroupSchema.index({ 'members.email': 1 });

module.exports = mongoose.model('StudyGroupMongo', studyGroupSchema);
