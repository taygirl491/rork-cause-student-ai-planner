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

module.exports = router;
