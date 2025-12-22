const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: String, // Firebase UID
        required: true,
        index: true,
    },
    title: {
        type: String,
        trim: true,
        default: '', // Not required - Firebase might not have this
    },
    description: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        enum: ['task', 'event', 'exam', 'paper', 'appointment', 'homework'],
        default: 'task',
    },
    className: {
        type: String,
        default: '',
    },
    dueDate: {
        type: String, // Store as string (YYYY-MM-DD)
        default: '',
    },
    dueTime: {
        type: String, // Store as string (HH:MM)
        default: '',
    },
    completed: {
        type: Boolean,
        default: false,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    reminder: {
        type: String,
        enum: ['1h', '2h', '1d', '2d', 'custom'],
        default: '1d',
    },
    customReminderDate: {
        type: String, // ISO date string
        default: null,
    },
    alarmEnabled: {
        type: Boolean,
        default: false,
    },
    calendarEventId: {
        type: String,
        default: null,
    },
    createdAt: {
        type: String, // ISO date string
        default: () => new Date().toISOString(),
    },
}, {
    timestamps: false, // Don't auto-add timestamps
});

// Indexes
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });

module.exports = mongoose.model('Task', taskSchema);
