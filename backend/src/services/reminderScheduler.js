const cron = require('node-cron');
const { db } = require('../config/firebase');
const { sendTaskReminder } = require('./notificationService');

/**
 * Calculate reminder time based on task due date and reminder setting
 */
function calculateReminderTime(task) {
    if (!task.dueDate || !task.reminder) return null;

    // Parse YYYY-MM-DD as local midnight, not UTC midnight
    const [y, mo, d] = task.dueDate.split('-').map(Number);
    const dueDate = new Date(y, mo - 1, d, 0, 0, 0, 0);

    // If task has a specific time, use it
    if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
        // Default to 9 AM if no time specified
        dueDate.setHours(9, 0, 0, 0);
    }

    let reminderDate = new Date(dueDate);

    switch (task.reminder) {
        case '1h':
            reminderDate.setHours(reminderDate.getHours() - 1);
            break;
        case '2h':
            reminderDate.setHours(reminderDate.getHours() - 2);
            break;
        case '1d':
            reminderDate.setDate(reminderDate.getDate() - 1);
            break;
        case '2d':
            reminderDate.setDate(reminderDate.getDate() - 2);
            break;
        case 'custom':
            if (task.customReminderDate) {
                // Handle both legacy UTC ISO strings and new local datetime strings
                const isUTC = /Z|[+-]\d{2}:?\d{2}$/.test(task.customReminderDate);
                const dtMatch = task.customReminderDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                if (isUTC) {
                    reminderDate = new Date(task.customReminderDate);
                } else if (dtMatch) {
                    const [, cy, cm, cd, ch, cmin] = dtMatch.map(Number);
                    reminderDate = new Date(cy, cm - 1, cd, ch, cmin, 0, 0);
                } else {
                    return null;
                }
            } else {
                return null;
            }
            break;
        default:
            return null;
    }

    return reminderDate;
}

/**
 * Check for tasks that need reminders sent
 * Runs every 5 minutes
 */
async function checkTaskReminders() {
    console.log('[ReminderScheduler] Checking for task reminders...');

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

    try {
        // Get all active tasks (not completed)
        const tasksSnapshot = await db
            .collection('tasks')
            .where('completed', '==', false)
            .get();

        let remindersSent = 0;

        for (const doc of tasksSnapshot.docs) {
            const task = { id: doc.id, ...doc.data() };

            // Skip if no reminder set
            if (!task.reminder) continue;

            const reminderTime = calculateReminderTime(task);

            // Skip if no valid reminder time
            if (!reminderTime) continue;

            // Check if reminder time is within the next 5 minutes
            if (reminderTime >= now && reminderTime <= fiveMinutesFromNow) {
                console.log(`[ReminderScheduler] Sending reminder for task ${task.id} to user ${task.userId}`);
                await sendTaskReminder(task.userId, task);
                remindersSent++;

                // Mark reminder as sent (optional: add a field to track this)
                // await db.collection('tasks').doc(task.id).update({ reminderSent: true });
            }
        }

        if (remindersSent > 0) {
            console.log(`[ReminderScheduler] Sent ${remindersSent} reminder(s)`);
        }
    } catch (error) {
        console.error('[ReminderScheduler] Error checking reminders:', error);
    }
}

/**
 * Start the reminder scheduler
 * Runs every 5 minutes using cron pattern
 */
function startReminderScheduler() {
    console.log('[ReminderScheduler] Starting task reminder scheduler...');

    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        checkTaskReminders();
    });

    console.log('[ReminderScheduler] Scheduler started - checking every 5 minutes');
}

module.exports = {
    startReminderScheduler,
    checkTaskReminders,
};
