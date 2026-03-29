const express = require("express");
const router = express.Router();
const { updateStreak, getStreakData } = require("./streakService");

/**
 * POST /api/streak/update
 * Update user's streak when they complete a task
 */
router.post("/update", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        const result = await updateStreak(userId);
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

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        const result = await getStreakData(userId);
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
