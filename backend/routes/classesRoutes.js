const express = require('express');
const router = express.Router();
const Class = require('../models/Class');

/**
 * GET /api/classes/:userId
 * Get all classes for a user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const classes = await Class.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            classes,
        });
    } catch (error) {
        console.error('Error getting classes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get classes',
            details: error.message,
        });
    }
});

/**
 * POST /api/classes
 * Create a new class
 */
router.post('/', async (req, res) => {
    try {
        const classData = req.body;

        if (!classData.userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
            });
        }

        const newClass = await Class.create(classData);

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('class-created', {
                userId: newClass.userId,
                class: {
                    ...newClass.toObject(),
                    id: newClass._id
                }
            });
        }

        res.json({
            success: true,
            class: newClass,
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create class',
            details: error.message,
        });
    }
});

/**
 * PUT /api/classes/:classId
 * Update a class
 */
router.put('/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const updates = req.body;

        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedClass) {
            return res.status(404).json({
                success: false,
                error: 'Class not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('class-updated', {
                userId: updatedClass.userId,
                class: {
                    ...updatedClass.toObject(),
                    id: updatedClass._id
                }
            });
        }

        res.json({
            success: true,
            class: updatedClass,
        });
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update class',
            details: error.message,
        });
    }
});

/**
 * DELETE /api/classes/:classId
 * Delete a class
 */
router.delete('/:classId', async (req, res) => {
    try {
        const { classId } = req.params;

        const deletedClass = await Class.findByIdAndDelete(classId);

        if (!deletedClass) {
            return res.status(404).json({
                success: false,
                error: 'Class not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('class-deleted', {
                userId: deletedClass.userId,
                classId: deletedClass._id.toString()
            });
        }

        res.json({
            success: true,
            message: 'Class deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete class',
            details: error.message,
        });
    }
});

module.exports = router;
