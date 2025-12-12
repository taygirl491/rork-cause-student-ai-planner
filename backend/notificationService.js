const { Expo } = require("expo-server-sdk");
const { db } = require("./firebase");

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

        const tokens = [];
        const usersSnapshot = await db
            .collection("users")
            .where("email", "in", emails)
            .get();

        console.log(`[PushDebug] Found ${usersSnapshot.size} user docs for ${emails.length} emails`);

        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            console.log(`[PushDebug] User ${userData.email} has token: ${userData.pushToken ? 'YES' : 'NO'}`);
            if (userData.pushToken && Expo.isExpoPushToken(userData.pushToken)) {
                tokens.push(userData.pushToken);
            } else {
                console.log(`[PushDebug] Token invalid or missing for ${userData.email}: ${userData.pushToken}`);
            }
        });

        return tokens;
    } catch (error) {
        console.error("Error fetching tokens for emails:", error);
        // Fallback: fetch individually if "in" query fails (e.g. > 10 items)
        if (error.code === 3) {
            // invalid argument (e.g. too many items)
            console.log("Falling back to individual token fetch...");
            const tokens = [];
            for (const email of emails) {
                try {
                    const snapshot = await db
                        .collection("users")
                        .where("email", "==", email)
                        .get();
                    if (!snapshot.empty) {
                        const userData = snapshot.docs[0].data();
                        if (userData.pushToken && Expo.isExpoPushToken(userData.pushToken)) {
                            tokens.push(userData.pushToken);
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching token for ${email}:`, e);
                }
            }
            return tokens;
        }
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
async function sendPushNotifications(tokens, title, body, data = {}) {
    const messages = [];
    for (const token of tokens) {
        messages.push({
            to: token,
            sound: "alarm_clock_90867.wav",
            title,
            body,
            data,
        });
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
        // Firestore 'in' query supports up to 10 values.
        // If we have more, we need to batch or implementation logic above handles fallback roughly.
        // But typically detailed handling is better. For now we rely on the function which handles it.

        // We need to batch emails if there are many members, because 'in' operator limits to 10/30 depending on context
        // Our getTokensForEmails handles simple cases, but let's just loop if the list is huge?
        // Actually, let's keep it simple. If the group is huge, this might miss some unless we implement batching.
        // Let's implement simple batching here just in case.

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
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return;
        }

        const userData = userDoc.data();

        if (!userData?.pushToken || !Expo.isExpoPushToken(userData.pushToken)) {
            console.log('No valid push token for user:', userId);
            return;
        }

        await sendPushNotifications(
            [userData.pushToken],
            `Reminder: ${taskData.type.toUpperCase()}`,
            taskData.description,
            { taskId: taskData.id, type: 'task_reminder', className: taskData.className }
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
