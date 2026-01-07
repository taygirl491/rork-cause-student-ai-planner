const express = require('express');
const router = express.Router();
const StudyGroup = require('../models/StudyGroupMongo');
const StudyGroupMessage = require('../models/StudyGroupMessageMongo');
const notificationService = require('../notificationService');
const User = require('../models/User');

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

                const groupObj = group.toObject();

                // Hide invite code for private groups where user is not the creator
                if (groupObj.isPrivate && groupObj.creatorId !== userId) {
                    delete groupObj.code;
                }

                return {
                    ...groupObj,
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
        const { name, className, school, description, creatorId, creatorEmail, creatorName, isPrivate } = req.body;

        if (!name || !className || !school || !creatorId || !creatorEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Generate unique code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        console.log('[DEBUG] About to create group with creatorId:', creatorId);
        console.log('[DEBUG] Schema has admins field:', 'admins' in StudyGroup.schema.paths);
        console.log('[DEBUG] Schema paths:', Object.keys(StudyGroup.schema.paths));

        const group = await StudyGroup.create({
            name,
            className,
            school,
            description: description || '',
            code,
            creatorId,
            isPrivate: isPrivate || false,
            admins: [creatorId], // Creator is first admin
            members: [{
                email: creatorEmail,
                name: creatorName || '',
                userId: creatorId,
                joinedAt: new Date(),
            }],
            pendingMembers: [], // Initialize empty pending members array
        });

        console.log('[DEBUG] Group created with admins:', group.admins);
        console.log('[DEBUG] Full group object:', JSON.stringify(group.toObject(), null, 2));

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
 * Request to join a study group (creates pending request)
 */
router.post('/join', async (req, res) => {
    try {
        const { code, email, name, userId } = req.body;

        if (!code || !email || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Code, email, and userId are required',
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
        if (group.creatorId === userId) {
            return res.status(400).json({
                success: false,
                error: 'You are the creator of this group',
            });
        }

        // Check if already a member
        const isMember = group.members.some(m => m.email === email);

        if (isMember) {
            return res.json({
                success: true,
                group,
                message: 'You are already a member of this group',
            });
        }

        // Check if already has a pending request
        const hasPendingRequest = group.pendingMembers.some(p => p.email === email);

        if (hasPendingRequest) {
            return res.json({
                success: true,
                message: 'Your request to join is pending approval',
                status: 'pending',
            });
        }

        // Add to pending members
        group.pendingMembers.push({
            email,
            name: name || '',
            userId,
            requestedAt: new Date(),
        });
        await group.save();

        // Emit WebSocket event to admins
        const io = req.app.get('io');
        io.to(`group-${group._id}`).emit('pending-request', {
            groupId: group._id.toString(),
            pendingMember: { email, name, userId },
        });

        res.json({
            success: true,
            message: 'Join request sent. Waiting for admin approval.',
            status: 'pending',
        });
    } catch (error) {
        console.error('Error requesting to join study group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to request join',
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

        // Send push notification to other members
        try {
            const group = await StudyGroup.findById(groupId);
            if (group) {
                const recipients = group.members.filter(m => m.email !== senderEmail);
                if (recipients.length > 0) {
                    notificationService.sendMessageNotification(group, {
                        ...newMessage.toObject(),
                        id: newMessage._id
                    }, recipients);
                }
            }
        } catch (notifError) {
            console.error('Error triggering push notification:', notifError);
            // Don't fail the request if notification fails
        }

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

/**
 * POST /api/study-groups/:groupId/approve-member
 * Approve a pending member (admin only)
 */
router.post('/:groupId/approve-member', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email, adminUserId } = req.body;

        if (!email || !adminUserId) {
            return res.status(400).json({
                success: false,
                error: 'Email and adminUserId are required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is an admin
        if (!group.admins.includes(adminUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can approve members',
            });
        }

        // Find pending member
        const pendingMemberIndex = group.pendingMembers.findIndex(p => p.email === email);

        if (pendingMemberIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Pending member not found',
            });
        }

        const pendingMember = group.pendingMembers[pendingMemberIndex];

        // Add to members
        group.members.push({
            email: pendingMember.email,
            name: pendingMember.name,
            userId: pendingMember.userId,
            joinedAt: new Date(),
        });

        // Remove from pending
        group.pendingMembers.splice(pendingMemberIndex, 1);
        await group.save();

        // Emit WebSocket events
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('member-approved', {
            groupId,
            member: { email: pendingMember.email, name: pendingMember.name },
        });

        res.json({
            success: true,
            message: 'Member approved successfully',
            group,
        });
    } catch (error) {
        console.error('Error approving member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve member',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/:groupId/reject-member
 * Reject a pending member (admin only)
 */
router.post('/:groupId/reject-member', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email, adminUserId } = req.body;

        if (!email || !adminUserId) {
            return res.status(400).json({
                success: false,
                error: 'Email and adminUserId are required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is an admin
        if (!group.admins.includes(adminUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can reject members',
            });
        }

        // Find and remove pending member
        const pendingMemberIndex = group.pendingMembers.findIndex(p => p.email === email);

        if (pendingMemberIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Pending member not found',
            });
        }

        group.pendingMembers.splice(pendingMemberIndex, 1);
        await group.save();

        // Emit WebSocket events
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('member-rejected', {
            groupId,
            email,
        });

        res.json({
            success: true,
            message: 'Member request rejected',
        });
    } catch (error) {
        console.error('Error rejecting member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject member',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/:groupId/kick-member
 * Kick a member from the group (admin only, can't kick creator)
 */
router.post('/:groupId/kick-member', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email, adminUserId } = req.body;

        if (!email || !adminUserId) {
            return res.status(400).json({
                success: false,
                error: 'Email and adminUserId are required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is an admin
        if (!group.admins.includes(adminUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can kick members',
            });
        }

        // Find member to kick
        const memberIndex = group.members.findIndex(m => m.email === email);

        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Member not found',
            });
        }

        // Check if trying to kick the creator
        const creatorEmail = group.members.find(m => m.email)?.email;
        const creatorMember = group.members[0]; // First member is creator
        if (creatorMember && creatorMember.email === email) {
            return res.status(403).json({
                success: false,
                error: 'Cannot kick the group creator',
            });
        }

        // Remove member
        const kickedMember = group.members[memberIndex];
        group.members.splice(memberIndex, 1);

        // Also remove from admins if they were an admin
        const adminIndex = group.admins.findIndex(a => a === kickedMember.userId);
        if (adminIndex !== -1) {
            group.admins.splice(adminIndex, 1);
        }

        await group.save();

        // Emit WebSocket event
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('member-kicked', {
            groupId,
            email,
        });

        res.json({
            success: true,
            message: 'Member kicked successfully',
        });
    } catch (error) {
        console.error('Error kicking member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to kick member',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/:groupId/promote-admin
 * Promote a member to admin (creator only, max 4 admins)
 */
router.post('/:groupId/promote-admin', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, creatorId } = req.body;

        if (!userId || !creatorId) {
            return res.status(400).json({
                success: false,
                error: 'userId and creatorId are required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is the creator
        if (group.creatorId !== creatorId) {
            return res.status(403).json({
                success: false,
                error: 'Only the creator can promote admins',
            });
        }

        // Check if already an admin
        if (group.admins.includes(userId)) {
            return res.status(400).json({
                success: false,
                error: 'User is already an admin',
            });
        }

        // Check max admins limit (4)
        if (group.admins.length >= 4) {
            return res.status(400).json({
                success: false,
                error: 'Maximum of 4 admins allowed',
            });
        }

        // Add to admins
        group.admins.push(userId);
        await group.save();

        // Emit WebSocket event
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('admin-promoted', {
            groupId,
            userId,
        });

        res.json({
            success: true,
            message: 'Member promoted to admin',
            group,
        });
    } catch (error) {
        console.error('Error promoting admin:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to promote admin',
            details: error.message,
        });
    }
});

/**
 * POST /api/study-groups/:groupId/demote-admin
 * Demote an admin to regular member (creator only, can't demote creator)
 */
router.post('/:groupId/demote-admin', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, creatorId } = req.body;

        if (!userId || !creatorId) {
            return res.status(400).json({
                success: false,
                error: 'userId and creatorId are required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is the creator
        if (group.creatorId !== creatorId) {
            return res.status(403).json({
                success: false,
                error: 'Only the creator can demote admins',
            });
        }

        // Can't demote the creator
        if (userId === group.creatorId) {
            return res.status(403).json({
                success: false,
                error: 'Cannot demote the creator',
            });
        }

        // Check if user is an admin
        const adminIndex = group.admins.findIndex(a => a === userId);
        if (adminIndex === -1) {
            return res.status(400).json({
                success: false,
                error: 'User is not an admin',
            });
        }

        // Remove from admins
        group.admins.splice(adminIndex, 1);
        await group.save();

        // Emit WebSocket event
        const io = req.app.get('io');
        io.to(`group-${groupId}`).emit('admin-demoted', {
            groupId,
            userId,
        });

        res.json({
            success: true,
            message: 'Admin demoted to member',
            group,
        });
    } catch (error) {
        console.error('Error demoting admin:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to demote admin',
            details: error.message,
        });
    }
});

/**
 * GET /api/study-groups/:groupId/pending-members
 * Get pending member requests (admin only)
 */
router.get('/:groupId/pending-members', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { adminUserId } = req.query;

        if (!adminUserId) {
            return res.status(400).json({
                success: false,
                error: 'adminUserId is required',
            });
        }

        const group = await StudyGroup.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Group not found',
            });
        }

        // Check if requester is an admin
        if (!group.admins.includes(adminUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can view pending members',
            });
        }

        res.json({
            success: true,
            pendingMembers: group.pendingMembers,
        });
    } catch (error) {
        console.error('Error getting pending members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pending members',
            details: error.message,
        });
    }
});

module.exports = router;
