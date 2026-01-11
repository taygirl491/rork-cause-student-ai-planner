const { Expo } = require("expo-server-sdk");
const User = require('./models/User');

// Initialize Expo SDK
const expo = new Expo();

/**
 * Get push tokens for a list of emails
 * @param {string[]} emails - List of user emails
 * @returns {Promise<string[]>} - List of push tokens
 */
async function getTokensForEmails(emails) {
    try {
        if (!emails || emails.length === 0) return [];

        // Normalize emails to lowercase
        const normalizedEmails = emails.map(e => e.toLowerCase());

        console.log('[PushDebug] Looking for emails:', normalizedEmails);

        const tokens = [];
        const users = await User.find({ email: { $in: normalizedEmails } });

        console.log(`[PushDebug] DB Query Result: Found ${users.length} users`);
        if (users.length > 0) {
            console.log('[PushDebug] Found users:', users.map(u => `${u.email} (Token: ${u.expoPushToken ? 'Yes' : 'No'})`));
        } else {
            console.log('[PushDebug] WARNING: No users found in DB for these emails!');
        }

        users.forEach((user) => {
            if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
                tokens.push(user.expoPushToken);
            }
        });

        return tokens;
    } catch (error) {
        console.error("Error fetching tokens for emails:", error);
        return [];
    }
}

/**
 * Send push notifications
 * @param {string[]} tokens - List of expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Extra data
 */
async function sendPushNotifications(tokens, title, body, data = {}, options = {}) {
    const { sound = 'default', channelId = 'default' } = options;
    const messages = [];
    for (const token of tokens) {
        const message = {
            to: token,
            sound: sound,
            title,
            body,
            data,
        };

        if (channelId && channelId !== 'default') {
            message.channelId = channelId;
        }

        messages.push(message);
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("Ticket chunk:", ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error("Error sending push notifications chunk:", error);
        }
    }

    return tickets;
}

/**
 * Send notification for new group member
 */
async function sendJoinNotification(groupData, newMembers, existingMembers) {
    try {
        const existingMemberEmails = existingMembers.map((m) => m.email);

        const tokens = [];
        // Process in batches of 10
        const chunkSize = 10;
        for (let i = 0; i < existingMemberEmails.length; i += chunkSize) {
            const chunk = existingMemberEmails.slice(i, i + chunkSize);
            const chunkTokens = await getTokensForEmails(chunk);
            tokens.push(...chunkTokens);
        }

        if (tokens.length === 0) {
            console.log("No push tokens found for existing members");
            return;
        }

        const newMemberNames = newMembers
            .map((m) => m.name || m.email)
            .join(", ");

        await sendPushNotifications(
            tokens,
            `New Member in ${groupData.name}`,
            `${newMemberNames} just joined the group!`,
            { groupId: groupData.id, type: "group_join" }
        );

        console.log(`Sent push notifications to ${tokens.length} members`);
    } catch (error) {
        console.error("Error sending join push notification:", error);
    }
}

/**
 * Send notification for new message
 */
async function sendMessageNotification(groupData, message, recipients) {
    try {
        const recipientEmails = recipients.map((m) => m.email);

        const tokens = [];
        const chunkSize = 10;
        for (let i = 0; i < recipientEmails.length; i += chunkSize) {
            const chunk = recipientEmails.slice(i, i + chunkSize);
            const chunkTokens = await getTokensForEmails(chunk);
            tokens.push(...chunkTokens);
        }

        if (tokens.length === 0) {
            console.log("No push tokens found for recipients");
            return;
        }

        const senderName = message.senderName || message.senderEmail;

        await sendPushNotifications(
            tokens,
            `New Message in ${groupData.name}`,
            `${senderName}: ${message.message}`,
            { groupId: groupData.id, messageId: message.id, type: "new_message" }
        );

        console.log(`Sent push notifications to ${tokens.length} members`);
    } catch (error) {
        console.error("Error sending message push notification:", error);
    }
}

/**
 * Send notification for task reminder
 */
async function sendTaskReminder(userId, taskData) {
    try {
        const user = await User.findById(userId);

        if (!user) {
            console.log('User not found:', userId);
            return;
        }

        if (!user.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
            console.log('No valid push token for user:', userId);
            return;
        }

        await sendPushNotifications(
            [user.expoPushToken],
            `Reminder: ${taskData.type.toUpperCase()}`,
            taskData.description,
            { taskId: taskData.id, type: 'task_reminder', className: taskData.className },
            { sound: 'alarm_clock_90867.wav', channelId: 'task-reminders-v3' }
        );

        console.log('Sent task reminder to user:', userId);
    } catch (error) {
        console.error('Error sending task reminder:', error);
    }
}

module.exports = {
    sendJoinNotification,
    sendMessageNotification,
    sendTaskReminder,
};
