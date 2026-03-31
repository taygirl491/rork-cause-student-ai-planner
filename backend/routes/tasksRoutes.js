const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const { updateStreak } = require('../streakService');

/**
 * GET /api/tasks/:userId
 * Get all tasks for a user — only the authenticated user's own tasks
 */
router.get('/:userId', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const tasks = await Task.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            tasks,
        });
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tasks',
        });
    }
});

/**
 * POST /api/tasks
 * Create a new task — userId is taken from the verified token, never the body
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const taskData = { ...req.body, userId: req.user.uid };

        const task = await Task.create(taskData);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${task.userId}`).emit('task-created', {
                userId: task.userId,
                task: { ...task.toObject(), id: task._id }
            });
        }

        res.json({ success: true, task });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, error: 'Failed to create task' });
    }
});

/**
 * PUT /api/tasks/:taskId
 * Update a task — only the owner can update
 */
router.put('/:taskId', verifyFirebaseToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        const existingTask = await Task.findById(taskId);

        if (!existingTask) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        if (existingTask.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const wasCompleted = existingTask.completed;

        // Prevent userId from being changed via update
        delete updates.userId;

        const task = await Task.findByIdAndUpdate(
            taskId,
            updates,
            { new: true, runValidators: true }
        );

        if (updates.completed === true && !wasCompleted) {
            try {
                const gamificationService = require('../gamificationService');
                const pointsMap = { 'low': 5, 'medium': 10, 'high': 20 };
                const points = pointsMap[task.priority] || 10;
                await gamificationService.awardPoints(task.userId, points, 'task');
            } catch (error) {
                console.error('Error awarding points for task completion:', error);
            }
        }

        res.json({ success: true, task });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ success: false, error: 'Failed to update task' });
    }
});

/**
 * DELETE /api/tasks/:taskId
 * Delete a task — only the owner can delete
 */
router.delete('/:taskId', verifyFirebaseToken, async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        if (task.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        await Task.findByIdAndDelete(taskId);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${task.userId}`).emit('task-deleted', {
                userId: task.userId,
                taskId: task._id.toString()
            });
        }

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
});

module.exports = router;
