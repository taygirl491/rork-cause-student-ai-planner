const { db } = require("./firebase");

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(todayStr) {
    const today = new Date(todayStr);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Update user's streak when they complete a task
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated streak data
 */
async function updateStreak(userId) {
    try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error("User not found");
        }

        const userData = userDoc.data();
        const today = getToday();
        const yesterday = getYesterday(today);

        // Initialize streak data if it doesn't exist
        let streakData = userData.streak || {
            current: 0,
            longest: 0,
            lastCompletionDate: null,
            totalTasksCompleted: 0,
            streakFreezes: 0,
        };

        const lastDate = streakData.lastCompletionDate;
        let increased = false;
        let milestone = false;

        // Check if already completed today
        if (lastDate === today) {
            // Just increment total tasks, don't change streak
            streakData.totalTasksCompleted++;
        } else if (lastDate === yesterday) {
            // Streak continues!
            streakData.current++;
            streakData.totalTasksCompleted++;
            streakData.lastCompletionDate = today;
            increased = true;

            // Update longest streak if needed
            if (streakData.current > streakData.longest) {
                streakData.longest = streakData.current;
            }

            // Check for milestones
            const milestones = [3, 7, 14, 30, 50, 100];
            if (milestones.includes(streakData.current)) {
                milestone = streakData.current;
            }
        } else {
            // Streak broken or first task ever
            streakData.current = 1;
            streakData.totalTasksCompleted++;
            streakData.lastCompletionDate = today;
            increased = true;
        }

        // Update Firestore
        await userRef.update({ streak: streakData });

        return {
            success: true,
            streak: {
                current: streakData.current,
                longest: streakData.longest,
                totalTasksCompleted: streakData.totalTasksCompleted,
            },
            increased,
            milestone,
        };
    } catch (error) {
        console.error("Error updating streak:", error);
        throw error;
    }
}

/**
 * Get user's current streak data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Streak data
 */
async function getStreakData(userId) {
    try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error("User not found");
        }

        const userData = userDoc.data();
        const streakData = userData.streak || {
            current: 0,
            longest: 0,
            lastCompletionDate: null,
            totalTasksCompleted: 0,
            streakFreezes: 0,
        };

        return {
            success: true,
            streak: streakData,
        };
    } catch (error) {
        console.error("Error getting streak data:", error);
        throw error;
    }
}

module.exports = {
    updateStreak,
    getStreakData,
};
