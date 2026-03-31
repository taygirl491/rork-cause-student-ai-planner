const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

/**
 * POST /api/users/push-token
 * Update user's Expo push token — userId forced from token
 */
router.post('/push-token', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: token'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { expoPushToken: token },
            { new: true, upsert: true }
        );

        console.log(`[PushToken] Updated token for user (${userId}): ${token.substring(0, 10)}...`);

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
        });
    }
});

/**
 * POST /api/users/register
 * Register or update user details (name, email) — userId forced from token
 */
router.post('/register', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: email'
            });
        }

        const updateData = { email };
        if (name) updateData.name = name;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, upsert: true }
        );

        console.log(`[Register] Registered/Updated user: ${email} (${userId})`);

        res.json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user',
        });
    }
});

/**
 * GET /api/users/:userId
 * Get a single user by ID — only the authenticated user can get their own data
 */
router.get('/:userId', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
});

/**
 * GET /api/users/:userId/purpose
 * Get user's purpose statement — only the authenticated user can get their own
 */
router.get('/:userId/purpose', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

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
        });
    }
});

/**
 * PATCH /api/users/purpose
 * Update user's purpose statement — userId forced from token
 */
router.patch('/purpose', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { purpose } = req.body;

        if (!purpose) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: purpose'
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
        });
    }
});

module.exports = router;
