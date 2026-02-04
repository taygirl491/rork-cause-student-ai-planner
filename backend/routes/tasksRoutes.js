const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { updateStreak } = require('../streakService');

/**
 * GET /api/tasks/:userId
 * Get all tasks for a user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

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
            details: error.message,
        });
    }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
    try {
        const taskData = req.body;

        // Validate required fields
        if (!taskData.userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
            });
        }

        const task = await Task.create(taskData);

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('task-created', {
                userId: task.userId,
                task: {
                    ...task.toObject(),
                    id: task._id
                }
            });
        }

        res.json({
            success: true,
            task,
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create task',
            details: error.message,
        });
    }
});

/**
 * PUT /api/tasks/:taskId
 * Update a task
 */
router.put('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        const existingTask = await Task.findById(taskId);

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        const wasCompleted = existingTask.completed;

        const task = await Task.findByIdAndUpdate(
            taskId,
            updates,
            { new: true, runValidators: true }
        );

        // Emit WebSocket event
        // Trigger streak update if task is marked as completed
        if (updates.completed === true && !wasCompleted) {
            try {
                await updateStreak(task.userId);
            } catch (streakError) {
                console.error('Error updating streak after task completion:', streakError);
            }
        }

        res.json({
            success: true,
            task,
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update task',
            details: error.message,
        });
    }
});

/**
 * DELETE /api/tasks/:taskId
 * Delete a task
 */
router.delete('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('task-deleted', {
                userId: task.userId,
                taskId: task._id.toString()
            });
        }

        res.json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete task',
            details: error.message,
        });
    }
});

module.exports = router;
