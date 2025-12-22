const mongoose = require('mongoose');

const studyGroupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyGroupMongo',
        required: true,
        index: true,
    },
    senderEmail: {
        type: String,
        required: true,
    },
    senderName: {
        type: String,
        default: '',
    },
    message: {
        type: String,
        required: true,
    },
    attachments: [{
        name: {
            type: String,
            required: true,
        },
        uri: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: 'file',
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
studyGroupMessageSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('StudyGroupMessageMongo', studyGroupMessageSchema);
