const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

/**
 * GET /api/classes/:userId
 * Get all classes for a user — only the authenticated user's own classes
 */
router.get('/:userId', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

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
        });
    }
});

/**
 * POST /api/classes
 * Create a new class — userId is taken from the verified token, never the body
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const classData = { ...req.body, userId: req.user.uid };

        const newClass = await Class.create(classData);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${newClass.userId}`).emit('class-created', {
                userId: newClass.userId,
                class: { ...newClass.toObject(), id: newClass._id }
            });
        }

        res.json({ success: true, class: newClass });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ success: false, error: 'Failed to create class' });
    }
});

/**
 * PUT /api/classes/:classId
 * Update a class — only the owner can update
 */
router.put('/:classId', verifyFirebaseToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const updates = req.body;

        const existingClass = await Class.findById(classId);

        if (!existingClass) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        if (existingClass.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        // Prevent userId from being changed via update
        delete updates.userId;

        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            updates,
            { new: true, runValidators: true }
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${updatedClass.userId}`).emit('class-updated', {
                userId: updatedClass.userId,
                class: { ...updatedClass.toObject(), id: updatedClass._id }
            });
        }

        res.json({ success: true, class: updatedClass });
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ success: false, error: 'Failed to update class' });
    }
});

/**
 * DELETE /api/classes/:classId
 * Delete a class — only the owner can delete
 */
router.delete('/:classId', verifyFirebaseToken, async (req, res) => {
    try {
        const { classId } = req.params;

        const existingClass = await Class.findById(classId);

        if (!existingClass) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        if (existingClass.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        await Class.findByIdAndDelete(classId);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${existingClass.userId}`).emit('class-deleted', {
                userId: existingClass.userId,
                classId: existingClass._id.toString()
            });
        }

        res.json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ success: false, error: 'Failed to delete class' });
    }
});

module.exports = router;
