const express = require("express");
const router = express.Router();
const { updateStreak, getStreakData } = require('../services/streakService');

/**
 * POST /api/streak/update
 * Update user's streak when they complete a task
 */
router.post("/update", async (req, res) => {
    try {
        const { userId, clientToday } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        const result = await updateStreak(userId, clientToday);
        res.json(result);
    } catch (error) {
        console.error("Error updating streak:", error);
        res.status(500).json({
            error: "Failed to update streak",
            details: error.message,
        });
    }
});

/**
 * GET /api/streak/:userId
 * Get user's current streak data
 */
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { clientToday } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        const result = await getStreakData(userId, clientToday);
        res.json(result);
    } catch (error) {
        console.error("Error getting streak data:", error);
        res.status(500).json({
            error: "Failed to get streak data",
            details: error.message,
        });
    }
});

module.exports = router;
