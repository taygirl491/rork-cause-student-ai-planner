const express = require('express');
const router = express.Router();
const User = require('../models/User');
const emailService = require('../emailService');

/**
 * POST /api/admin/broadcast-email
 * Send an email announcement to all users
 */
router.post('/broadcast-email', async (req, res) => {
    try {
        const { subject, body } = req.body;

        if (!subject || !body) {
            return res.status(400).json({
                error: 'Missing required fields: subject and body'
            });
        }

        // Fetch all user emails
        const users = await User.find({}, 'email');
        const recipients = users.map(u => u.email).filter(email => email && email.includes('@'));

        if (recipients.length === 0) {
            return res.status(404).json({
                error: 'No users found to email'
            });
        }

        console.log(`Starting broadcast to ${recipients.length} users...`);

        // Send the announcement
        const result = await emailService.sendAnnouncement(recipients, subject, body);

        if (result.success) {
            res.json({
                success: true,
                message: `Announcement sent to ${result.count} users`,
                recipientCount: result.count
            });
        } else {
            res.status(500).json({
                error: 'Failed to send announcement',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Error in broadcast-email:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
