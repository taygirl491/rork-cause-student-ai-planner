const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    createdBy: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    admins: [{
        type: String, // Array of Firebase UIDs (max 4)
    }],
    members: [{
        type: String, // Array of Firebase UIDs (approved members)
    }],
    pendingMembers: [{
        email: String,
        name: String,
        userId: String, // Firebase UID
        requestedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    inviteCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    isPrivate: {
        type: Boolean,
        default: false, // Public by default
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
    _id: false,
});


// Indexes
studyGroupSchema.index({ members: 1 });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
