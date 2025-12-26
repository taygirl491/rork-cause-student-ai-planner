const express = require('express');
const router = express.Router();
const User = require('../models/User');
const emailService = require('../emailService'); // Back to SMTP

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

        // Send the announcement in the background (fire and forget)
        // We do NOT await this, so the frontend gets an immediate response
        emailService.sendAnnouncement(recipients, subject, body)
            .then(result => {
                if (result.success) {
                    console.log(`✓ Broadcast complete: Sent to ${result.count} users`);
                } else {
                    console.error('✗ Broadcast failed:', result.error);
                    console.error('Full error details:', JSON.stringify(result, null, 2));
                }
            })
            .catch(err => {
                console.error('✗ Broadcast critical error:', err.message);
                console.error('Stack trace:', err.stack);
            });

        // Respond immediately
        res.json({
            success: true,
            message: `Broadcast initiated for ${recipients.length} users. You will receive the email shortly.`,
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
