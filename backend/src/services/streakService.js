const User = require('../models/User');

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(todayStr) {
    const [y, m, d] = todayStr.split('-').map(Number);
    // Build a UTC date at noon so DST shifts can never flip the day
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format using UTC (fallback only).
 * Prefer the client-provided local date when available.
 */
function getServerToday() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Validate a client-provided YYYY-MM-DD date.
 *
 * Rejects malformed input and dates more than 2 calendar days away from the
 * server's UTC "today" (which is enough margin for any timezone — max offset
 * worldwide is UTC+14 / UTC-12). This blocks abuse where a user sets their
 * device clock far in the future to artificially inflate streaks.
 */
function resolveToday(clientToday) {
    const serverToday = getServerToday();
    if (typeof clientToday !== 'string') return serverToday;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clientToday)) return serverToday;

    const [y, m, d] = clientToday.split('-').map(Number);
    const clientDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    if (isNaN(clientDate.getTime())) return serverToday;

    const serverDate = new Date(serverToday + 'T12:00:00Z');
    const diffDays = Math.abs(
        (clientDate.getTime() - serverDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 2) return serverToday;

    return clientToday;
}

/**
 * Update user's streak when they open the app
 * @param {string} userId
 * @param {string} [clientToday] YYYY-MM-DD in the user's local timezone
 */
async function updateStreak(userId, clientToday) {
    try {
        let user = await User.findById(userId);

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

        const today = resolveToday(clientToday);
        const yesterday = getYesterday(today);

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

        if (lastDate === today) {
            return {
                success: true,
                streak: {
                    current: streakData.current,
                    longest: streakData.longest,
                    totalTasksCompleted: streakData.totalTasksCompleted,
                    lastCompletionDate: streakData.lastCompletionDate,
                },
                increased: false,
                milestone: false,
            };
        } else if (lastDate === yesterday) {
            streakData.current++;
            streakData.lastCompletionDate = today;
            increased = true;
            pointsToAward = 5;

            if (streakData.current > (streakData.longest || 0)) {
                streakData.longest = streakData.current;
            }

            const milestones = [3, 7, 14, 30, 50, 100];
            if (milestones.includes(streakData.current)) {
                milestone = streakData.current;
                pointsToAward += 10;
            }
        } else {
            streakData.current = 1;
            streakData.lastCompletionDate = today;
            increased = true;
            pointsToAward = 2;
        }

        user.streak = streakData;

        if (pointsToAward > 0) {
            try {
                const gamificationService = require('./gamificationService');
                await gamificationService.awardPoints(userId, pointsToAward, 'streak', user);
            } catch (gpError) {
                console.error("Error awarding streak points:", gpError);
            }
        }

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

/**
 * @param {string} userId
 * @param {string} [clientToday] YYYY-MM-DD in the user's local timezone
 */
async function getStreakData(userId, clientToday) {
    try {
        let user = await User.findById(userId);

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

        const today = resolveToday(clientToday);
        const yesterday = getYesterday(today);
        const lastDate = streakData.lastCompletionDate;

        if (!lastDate) {
            streakData.current = 0;
        }
        else if (lastDate !== today && lastDate !== yesterday) {
            streakData.current = 0;
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
