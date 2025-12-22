const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    userId: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    section: {
        type: String,
        default: '',
    },
    daysOfWeek: {
        type: [String], // Array of days
        default: [],
    },
    time: {
        type: String,
        default: '',
    },
    professor: {
        type: String,
        default: '',
    },
    startDate: {
        type: String,
        default: '',
    },
    endDate: {
        type: String,
        default: '',
    },
    color: {
        type: String,
        default: '#6366F1',
    },
    calendarEventId: {
        type: String,
        default: null,
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString(),
    },
}, {
    timestamps: false,
});

// Indexes
classSchema.index({ userId: 1 });

module.exports = mongoose.model('Class', classSchema);
