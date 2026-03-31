const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

/**
 * GET /api/notes/:userId
 * Get all notes for a user — only the authenticated user's own notes
 */
router.get('/:userId', verifyFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.uid !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const notes = await Note.find({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            notes,
        });
    } catch (error) {
        console.error('Error getting notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notes',
        });
    }
});

/**
 * POST /api/notes
 * Create a new note — userId is taken from the verified token, never the body
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const noteData = { ...req.body, userId: req.user.uid };

        const note = await Note.create(noteData);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${note.userId}`).emit('note-created', {
                userId: note.userId,
                note: { ...note.toObject(), id: note._id }
            });
        }

        res.json({ success: true, note });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ success: false, error: 'Failed to create note' });
    }
});

/**
 * PUT /api/notes/:noteId
 * Update a note — only the owner can update
 */
router.put('/:noteId', verifyFirebaseToken, async (req, res) => {
    try {
        const { noteId } = req.params;
        const updates = req.body;

        const existingNote = await Note.findById(noteId);

        if (!existingNote) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        if (existingNote.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        // Prevent userId from being changed via update
        delete updates.userId;

        const note = await Note.findByIdAndUpdate(
            noteId,
            updates,
            { new: true, runValidators: true }
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${note.userId}`).emit('note-updated', {
                userId: note.userId,
                note: { ...note.toObject(), id: note._id }
            });
        }

        res.json({ success: true, note });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ success: false, error: 'Failed to update note' });
    }
});

/**
 * DELETE /api/notes/:noteId
 * Delete a note — only the owner can delete
 */
router.delete('/:noteId', verifyFirebaseToken, async (req, res) => {
    try {
        const { noteId } = req.params;

        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        if (note.userId !== req.user.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        await Note.findByIdAndDelete(noteId);

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${note.userId}`).emit('note-deleted', {
                userId: note.userId,
                noteId: note._id.toString()
            });
        }

        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ success: false, error: 'Failed to delete note' });
    }
});

module.exports = router;
