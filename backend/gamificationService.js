const User = require('./models/User');

const LEVEL_THRESHOLDS = {
    1: 150,
    2: 500,
    3: 750,
    4: 1000,
    5: 2000,
    6: 3000,
    7: 4000,
    8: 5000,
    9: 6000,
    10: 7000
};

/**
 * Calculate level based on points
 * @param {number} points 
 * @returns {number} Current level
 */
function calculateLevel(points) {
    let currentLevel = 1;
    for (let level = 1; level <= 10; level++) {
        if (points >= LEVEL_THRESHOLDS[level]) {
            currentLevel = level + 1;
        } else {
            break;
        }
    }
    // Final check: Never exceed max level 10
    return Math.min(currentLevel, 10);
}

/**
 * Award points to a user and check for level up
 * @param {string} userId 
 * @param {number} pointsToAdd 
 * @param {string} activityType - 'task', 'streak', 'goal', 'habit', 'feature'
 * @returns {Promise<Object>} Updated points and level
 */
async function awardPoints(userId, pointsToAdd, activityType) {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.points = (user.points || 0) + pointsToAdd;

        // Update activity counts
        if (activityType && user.gamification) {
            if (activityType === 'habit') user.gamification.habitsCompleted++;
            if (activityType === 'feature') user.gamification.featuresUsed++;
            if (activityType === 'goal') user.gamification.goalsCompleted++;
        }

        const newLevel = calculateLevel(user.points);
        const leveledUp = newLevel > (user.level || 1);
        user.level = newLevel;

        await user.save();

        return {
            points: user.points,
            level: user.level,
            leveledUp,
            pointsAdded: pointsToAdd
        };
    } catch (error) {
        console.error('Error awarding points:', error);
        throw error;
    }
}

module.exports = {
    awardPoints,
    calculateLevel,
    LEVEL_THRESHOLDS
};
