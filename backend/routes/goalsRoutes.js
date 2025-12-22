const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');

/**
 * GET /api/goals/:userId
 * Get all goals for a user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

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
            details: error.message,
        });
    }
});

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/', async (req, res) => {
    try {
        const goalData = req.body;

        if (!goalData.userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
            });
        }

        const goal = await Goal.create(goalData);

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('goal-created', {
                userId: goal.userId,
                goal: {
                    ...goal.toObject(),
                    id: goal._id
                }
            });
        }

        res.json({
            success: true,
            goal,
        });
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create goal',
            details: error.message,
        });
    }
});

/**
 * PUT /api/goals/:goalId
 * Update a goal
 */
router.put('/:goalId', async (req, res) => {
    try {
        const { goalId } = req.params;
        const updates = req.body;

        const goal = await Goal.findByIdAndUpdate(
            goalId,
            updates,
            { new: true, runValidators: true }
        );

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('goal-updated', {
                userId: goal.userId,
                goal: {
                    ...goal.toObject(),
                    id: goal._id
                }
            });
        }

        res.json({
            success: true,
            goal,
        });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update goal',
            details: error.message,
        });
    }
});

/**
 * DELETE /api/goals/:goalId
 * Delete a goal
 */
router.delete('/:goalId', async (req, res) => {
    try {
        const { goalId } = req.params;

        const goal = await Goal.findByIdAndDelete(goalId);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('goal-deleted', {
                userId: goal.userId,
                goalId: goal._id.toString()
            });
        }

        res.json({
            success: true,
            message: 'Goal deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete goal',
            details: error.message,
        });
    }
});

module.exports = router;
