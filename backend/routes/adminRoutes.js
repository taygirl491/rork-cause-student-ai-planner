const express = require('express');
const router = express.Router();
const User = require('../models/User');
const emailService = require('../emailService'); // Use Nodemailer with Gmail

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
        console.log('Recipients:', recipients.slice(0, 3), recipients.length > 3 ? `... and ${recipients.length - 3} more` : '');

        // Get Socket.io instance
        const io = req.app.get('io');

        // Send the announcement in the background with WebSocket progress
        emailService.sendAnnouncement(recipients, subject, body, io)
            .then(result => {
                console.log(`✓ Broadcast complete: Sent to ${result.successCount}/${result.total} users`);
                if (result.failedEmails && result.failedEmails.length > 0) {
                    console.log(`✗ Failed emails: ${result.failedEmails.join(', ')}`);
                }
            })
            .catch(err => {
                console.error('✗ Broadcast critical error:', err.message);
                console.error('Stack trace:', err.stack);
            });

        // Respond immediately
        res.json({
            success: true,
            message: `Broadcast initiated for ${recipients.length} users. Watch for real-time progress updates.`,
            recipientCount: recipients.length
        });

    } catch (error) {
        console.error('Error in broadcast-email:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
