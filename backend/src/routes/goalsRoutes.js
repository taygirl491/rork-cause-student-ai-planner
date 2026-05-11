const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

/**
 * GET /api/goals/:userId
 * Get all goals for a user — only the authenticated user's own goals
 */
router.get('/:userId', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const goals = await Goal.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            goals,
        });
    } catch (error) {
        console.error('Error getting goals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get goals',
        });
    }
});

/**
 * POST /api/goals
 * Create a new goal — userId is taken from the verified token, never the body
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const goalData = { ...req.body, userId: req.user.uid };

        const goal = await Goal.create(goalData);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${goal.userId}`).emit('goal-created', {
                userId: goal.userId,
                goal: { ...goal.toObject(), id: goal._id }
            });
        }

        res.json({ success: true, goal });
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ success: false, error: 'Failed to create goal' });
    }
});

/**
 * PUT /api/goals/:goalId
 * Update a goal — only the owner can update
 */
router.put('/:goalId', verifyFirebaseToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        const updates = req.body;

        const existingGoal = await Goal.findById(goalId);

        if (!existingGoal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }

        if (existingGoal.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const wasCompleted = existingGoal.completed;

        // Prevent userId from being changed via update
        delete updates.userId;

        const goal = await Goal.findByIdAndUpdate(
            goalId,
            updates,
            { new: true, runValidators: true }
        );

        // Award points for goal completion
        if (updates.completed === true && !wasCompleted) {
            try {
                const gamificationService = require('../services/gamificationService');
                await gamificationService.awardPoints(goal.userId, 10, 'goal');
            } catch (err) {
                console.error('Error awarding points for goal:', err);
            }
        }

        // Award points for habit completion
        if (updates.habits && Array.isArray(updates.habits)) {
            const completedHabitsCount = updates.habits.filter(h => h.completed).length;
            const previousCompletedHabitsCount = existingGoal.habits.filter(h => h.completed).length;

            if (completedHabitsCount > previousCompletedHabitsCount) {
                try {
                    const gamificationService = require('../services/gamificationService');
                    await gamificationService.awardPoints(goal.userId, (completedHabitsCount - previousCompletedHabitsCount), 'habit');
                } catch (err) {
                    console.error('Error awarding points for habits:', err);
                }
            }
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${goal.userId}`).emit('goal-updated', {
                userId: goal.userId,
                goal: { ...goal.toObject(), id: goal._id }
            });
        }

        res.json({ success: true, goal });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ success: false, error: 'Failed to update goal' });
    }
});

/**
 * DELETE /api/goals/:goalId
 * Delete a goal — only the owner can delete
 */
router.delete('/:goalId', verifyFirebaseToken, async (req, res) => {
    try {
        const { goalId } = req.params;

        const goal = await Goal.findById(goalId);

        if (!goal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }

        if (goal.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        await Goal.findByIdAndDelete(goalId);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${goal.userId}`).emit('goal-deleted', {
                userId: goal.userId,
                goalId: goal._id.toString()
            });
        }

        res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ success: false, error: 'Failed to delete goal' });
    }
});

module.exports = router;
