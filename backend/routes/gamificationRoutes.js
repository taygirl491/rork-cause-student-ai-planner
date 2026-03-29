const express = require('express');
const router = express.Router();
const gamificationService = require('../gamificationService');
const User = require('../models/User');

// Get user points and level
router.get('/stats/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            points: user.points || 0,
            level: user.level || 1,
            gamification: user.gamification || {}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Award points for feature usage or client-side events
router.post('/award', async (req, res) => {
    const { userId, points, activityType } = req.body;
    if (!userId || !points) {
        return res.status(400).json({ message: 'UserId and points are required' });
    }
    try {
        const result = await gamificationService.awardPoints(userId, points, activityType);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
