const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

/**
 * GET /api/notes/:userId
 * Get all notes for a user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

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
            details: error.message,
        });
    }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', async (req, res) => {
    try {
        const noteData = req.body;

        if (!noteData.userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
            });
        }

        const note = await Note.create(noteData);

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('note-created', {
                userId: note.userId,
                note: {
                    ...note.toObject(),
                    id: note._id
                }
            });
        }

        res.json({
            success: true,
            note,
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create note',
            details: error.message,
        });
    }
});

/**
 * PUT /api/notes/:noteId
 * Update a note
 */
router.put('/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const updates = req.body;

        const note = await Note.findByIdAndUpdate(
            noteId,
            updates,
            { new: true, runValidators: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                error: 'Note not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('note-updated', {
                userId: note.userId,
                note: {
                    ...note.toObject(),
                    id: note._id
                }
            });
        }

        res.json({
            success: true,
            note,
        });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update note',
            details: error.message,
        });
    }
});

/**
 * DELETE /api/notes/:noteId
 * Delete a note
 */
router.delete('/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;

        const note = await Note.findByIdAndDelete(noteId);

        if (!note) {
            return res.status(404).json({
                success: false,
                error: 'Note not found',
            });
        }

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('note-deleted', {
                userId: note.userId,
                noteId: note._id.toString()
            });
        }

        res.json({
            success: true,
            message: 'Note deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete note',
            details: error.message,
        });
    }
});

module.exports = router;
