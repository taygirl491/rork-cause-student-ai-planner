const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * POST /api/users/push-token
 * Update user's Expo push token
 */
router.post('/push-token', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, token'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { expoPushToken: token },
            { new: true, upsert: true } // Create if doesn't exist (though usually it should)
        );

        console.log(`[PushToken] Updated token for user ${user.email} (${userId}): ${token.substring(0, 10)}...`);

        res.json({
            success: true,
            message: 'Push token updated successfully',
            user
        });
    } catch (error) {
        console.error('Error updating push token:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update push token',
            details: error.message
        });
    }
});

/**
 * GET /api/users/:userId/purpose
 * Get user's purpose statement
 */
router.get('/:userId/purpose', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            purpose: user.purpose || null
        });
    } catch (error) {
        console.error('Error fetching purpose statement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purpose statement',
            details: error.message
        });
    }
});

/**
 * PATCH /api/users/purpose
 * Update user's purpose statement (survey answers)
 */
router.patch('/purpose', async (req, res) => {
    try {
        const { userId, purpose } = req.body;

        if (!userId || !purpose) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, purpose'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { purpose },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log(`[Purpose] Updated purpose statement for user ${userId}`);

        res.json({
            success: true,
            message: 'Purpose statement updated successfully',
            purpose: user.purpose
        });
    } catch (error) {
        console.error('Error updating purpose statement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update purpose statement',
            details: error.message
        });
    }
});

module.exports = router;
