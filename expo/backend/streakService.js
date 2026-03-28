const User = require('./models/User');

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
 * Update user's streak when they open the app
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated streak data
 */
async function updateStreak(userId) {
    try {
        let user = await User.findById(userId);

        // If user doesn't exist, create them
        if (!user) {
            user = await User.create({
                _id: userId,
                streak: {
                    current: 0,
                    longest: 0,
                    lastCompletionDate: null,
                    totalTasksCompleted: 0,
                    streakFreezes: 0,
                }
            });
        }

        const today = getToday();
        const yesterday = getYesterday(today);

        // Initialize streak data if it doesn't exist
        const streakData = user.streak || {
            current: 0,
            longest: 0,
            lastCompletionDate: null,
            totalTasksCompleted: 0,
            streakFreezes: 0,
        };

        const lastDate = streakData.lastCompletionDate;
        let increased = false;
        let milestone = false;
        let pointsToAward = 0;

        // Check if already checked in today
        if (lastDate === today) {
            // Already checked in today, no change
            return {
                success: true,
                streak: {
                    current: streakData.current,
                    longest: streakData.longest,
                    totalTasksCompleted: streakData.totalTasksCompleted,
                },
                increased: false,
                milestone: false,
            };
        } else if (lastDate === yesterday) {
            // Streak continues!
            streakData.current++;
            streakData.lastCompletionDate = today;
            increased = true;
            pointsToAward = 5; // 5 points for maintaining streak

            // Update longest streak if needed
            if (streakData.current > (streakData.longest || 0)) {
                streakData.longest = streakData.current;
            }

            // Check for milestones
            const milestones = [3, 7, 14, 30, 50, 100];
            if (milestones.includes(streakData.current)) {
                milestone = streakData.current;
                pointsToAward += 10;
            }
        } else {
            // Streak broken or first check-in ever
            streakData.current = 1;
            streakData.lastCompletionDate = today;
            increased = true;
            pointsToAward = 2; // 2 points for starting/restarting streak
        }

        // Apply streak data to user object
        user.streak = streakData;

        // Award points if any - pass user instance to avoid double save
        if (pointsToAward > 0) {
            try {
                const gamificationService = require('./gamificationService');
                await gamificationService.awardPoints(userId, pointsToAward, 'streak', user);
            } catch (gpError) {
                console.error("Error awarding streak points:", gpError);
                // Continue anyway, streak is more important than points
            }
        }

        // Single Mongo update for everything
        await user.save();

        return {
            success: true,
            streak: {
                current: streakData.current,
                longest: streakData.longest,
                totalTasksCompleted: streakData.totalTasksCompleted,
                lastCompletionDate: streakData.lastCompletionDate
            },
            increased,
            milestone,
        };
    } catch (error) {
        console.error("Error updating streak:", error);
        throw error;
    }
}

async function getStreakData(userId) {
    try {
        let user = await User.findById(userId);

        // If user doesn't exist, create them with default streak data
        if (!user) {
            user = await User.create({
                _id: userId,
                streak: {
                    current: 0,
                    longest: 0,
                    lastCompletionDate: null,
                    totalTasksCompleted: 0,
                    streakFreezes: 0,
                }
            });
        }

        let streakData = user.streak || {
            current: 0,
            longest: 0,
            lastCompletionDate: null,
            totalTasksCompleted: 0,
            streakFreezes: 0,
        };

        // Validate streak - reset if user missed a day
        const today = getToday();
        const yesterday = getYesterday(today);
        const lastDate = streakData.lastCompletionDate;

        // If user has never checked in, ensure streak is 0
        if (!lastDate) {
            streakData.current = 0;
        }
        // If last completion was before yesterday, streak is broken
        else if (lastDate !== today && lastDate !== yesterday) {
            streakData.current = 0;
            // Update MongoDB to reflect broken streak
            user.streak = streakData;
            await user.save();
        }

        return {
            success: true,
            streak: {
                current: streakData.current || 0,
                longest: streakData.longest || 0,
                totalTasksCompleted: streakData.totalTasksCompleted || 0,
                lastCompletionDate: streakData.lastCompletionDate || null,
                streakFreezes: streakData.streakFreezes || 0,
                points: user.points || 0,
                level: user.level || 1
            },
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
