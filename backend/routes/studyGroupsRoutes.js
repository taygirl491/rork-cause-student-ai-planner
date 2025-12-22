const express = require('express');
const router = express.Router();
const StudyGroup = require('../models/StudyGroupMongo');
const StudyGroupMessage = require('../models/StudyGroupMessageMongo');

/**
 * GET /api/study-groups/:userId
 * Get all study groups for a user (where they are a member or creator)
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required',
            });
        }

        // Find groups where user is creator or member
        const groups = await StudyGroup.find({
            $or: [
                { creatorId: userId },
                { 'members.email': email }
            ]
        }).sort({ createdAt: -1 });

        // Fetch messages for each group
        const groupsWithMessages = await Promise.all(
            groups.map(async (group) => {
                const messages = await StudyGroupMessage.find({ groupId: group._id })
                    .sort({ createdAt: 1 });

                return {
                    ...group.toObject(),
                    messages: messages.map(msg => ({
                        id: msg._id,
                        senderEmail: msg.senderEmail,
                        senderName: msg.senderName,
                        message: msg.message,
                        attachments: msg.attachments || [],
                        createdAt: msg.createdAt,
                    }))
                };
            })
        );

        res.json({
            success: true,
            groups: groupsWithMessages,
        });
    } catch (error) {
        console.error('Error getting study groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get study groups',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups
 * Create a new study group
 */
router.post('/', async (req, res) => {
    try {
        const { name, className, school, description, creatorId, creatorEmail, creatorName } = req.body;

        if (!name || !className || !school || !creatorId || !creatorEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Generate unique code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        const group = await StudyGroup.create({
            name,
            className,
            school,
            description: description || '',
            code,
            creatorId,
            members: [{
                email: creatorEmail,
                name: creatorName || '',
                joinedAt: new Date(),
            }],
        });

        // Emit WebSocket event for group creation
        const io = req.app.get('io');
        io.emit('group-created', {
            group: {
                ...group.toObject(),
                id: group._id
            }
        });

        res.json({
            success: true,
            group,
        });
    } catch (error) {
        console.error('Error creating study group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create study group',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/join
 * Join a study group by code
 */
router.post('/join', async (req, res) => {
    try {
        const { code, email, name } = req.body;

        if (!code || !email) {
            return res.status(400).json({
                success: false,
                error: 'Code and email are required',
            });
        }

        const group = await StudyGroup.findOne({ code: code.toUpperCase() });

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if user is the creator
        if (group.creatorId && group.members.some(m => m.email === email && group.creatorId === group.creatorId)) {
            // More reliable: check if email matches the first member (creator)
            const creatorEmail = group.members[0]?.email;
            if (creatorEmail === email) {
                return res.status(400).json({
                    success: false,
                    error: 'You are the creator of this group',
                });
            }
        }

        // Check if already a member
        const isMember = group.members.some(m => m.email === email);

        if (isMember) {
            // User is already a member, return success with the group
            return res.json({
                success: true,
                group,
                message: 'You are already a member of this group',
            });
        }

        // Add new member
        group.members.push({
            email,
            name: name || '',
            joinedAt: new Date(),
        });
        await group.save();

        // Emit WebSocket event to group room
        const io = req.app.get('io');
        io.to(`group-${group._id}`).emit('member-joined', {
            groupId: group._id.toString(),
            members: group.members,
            newMember: { email, name }
        });

        res.json({
            success: true,
            group,
        });
    } catch (error) {
        console.error('Error joining study group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join study group',
            details: error.message,
        });
    }
});

/**
 * DELETE /api/study-groups/:groupId
 * Delete a study group
 */
router.delete('/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findByIdAndDelete(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Also delete all messages for this group
        await StudyGroupMessage.deleteMany({ groupId });

        // Emit WebSocket event to group room
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('group-deleted', {
            groupId: groupId
        });

        res.json({
            success: true,
            message: 'Group deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting study group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete study group',
            details: error.message,
        });
    }
});

/**
 * GET /api/study-groups/:groupId/messages
 * Get all messages for a study group
 */
router.get('/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;

        const messages = await StudyGroupMessage.find({ groupId })
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/:groupId/messages
 * Send a message to a study group
 */
router.post('/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { senderEmail, senderName, message, attachments } = req.body;

        if (!senderEmail || !message) {
            return res.status(400).json({
                success: false,
                error: 'Sender email and message are required',
            });
        }

        const newMessage = await StudyGroupMessage.create({
            groupId,
            senderEmail,
            senderName: senderName || '',
            message,
            attachments: attachments || [],
        });

        // Emit WebSocket event to group room
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('new-message', {
            groupId: groupId,
            message: {
                id: newMessage._id,
                senderEmail: newMessage.senderEmail,
                senderName: newMessage.senderName,
                message: newMessage.message,
                attachments: newMessage.attachments || [],
                createdAt: newMessage.createdAt,
            }
        });

        res.json({
            success: true,
            message: newMessage,
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
            details: error.message,
        });
    }
});

module.exports = router;
