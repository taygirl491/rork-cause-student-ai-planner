const PepTalkSubmission = require('../models/PepTalkSubmission');
const { safeError } = require('../utils/errorResponse');
const emailService = require('../services/emailService');

const submitPepTalk = async (req, res) => {
    try {
        const { firstName, lastName, school, videoLink, phone, email, address, permission } = req.body;

        if (!firstName || !lastName || !school || !videoLink || !phone || !email || !address) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        if (!permission) {
            return res.status(400).json({ success: false, error: 'You must grant permission to submit.' });
        }

        const submission = new PepTalkSubmission({
            firstName, lastName, school, videoLink, phone, email, address, permission,
        });

        await submission.save();

        // Fire-and-forget email notification — never block the response
        emailService.sendSubmissionNotification(submission).catch((err) => {
            console.error('[PepTalk] Notification email failed:', err.message);
        });

        return res.status(201).json({ success: true, message: 'Submission received!' });
    } catch (error) {
        return safeError(res, 500, 'Failed to save submission', error);
    }
};

const getSubmissions = async (req, res) => {
    try {
        const submissions = await PepTalkSubmission.find().sort({ submittedAt: -1 });
        return res.json({ success: true, submissions });
    } catch (error) {
        return safeError(res, 500, 'Failed to fetch submissions', error);
    }
};

const deleteSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await PepTalkSubmission.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Submission not found.' });
        }
        return res.json({ success: true, message: 'Submission deleted.' });
    } catch (error) {
        return safeError(res, 500, 'Failed to delete submission', error);
    }
};

const deleteAllSubmissions = async (req, res) => {
    try {
        await PepTalkSubmission.deleteMany({});
        return res.json({ success: true, message: 'All submissions deleted.' });
    } catch (error) {
        return safeError(res, 500, 'Failed to delete submissions', error);
    }
};

module.exports = { submitPepTalk, getSubmissions, deleteSubmission, deleteAllSubmissions };
