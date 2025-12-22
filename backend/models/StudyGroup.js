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
    members: [{
        type: String, // Array of Firebase UIDs
    }],
    inviteCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
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
