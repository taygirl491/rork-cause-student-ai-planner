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
    },
    school: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    code: {
        type: String,
        required: true,
        unique: true,
    },
    creatorId: {
        type: String, // Firebase UID
        required: true,
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    admins: [{
        type: String, // Array of Firebase UIDs (max 4)
    }],
    members: [{
        email: {
            type: String,
            required: true,
        },
        name: String,
        userId: String, // Firebase UID
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    pendingMembers: [{
        email: {
            type: String,
            required: true,
        },
        name: String,
        userId: String, // Firebase UID
        requestedAt: {
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
studyGroupSchema.index({ creatorId: 1 });
studyGroupSchema.index({ 'members.email': 1 });
studyGroupSchema.index({ code: 1 });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
