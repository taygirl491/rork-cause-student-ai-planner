const express = require('express');
const router = express.Router();
const { submitPepTalk, getSubmissions, deleteSubmission, deleteAllSubmissions } = require('../controllers/pepTalkController');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

// Public — no auth needed for student submissions
router.post('/submit', submitPepTalk);

// Admin-only routes — require valid Firebase token
router.get('/submissions', verifyFirebaseToken, getSubmissions);
router.delete('/submissions/all', verifyFirebaseToken, deleteAllSubmissions);
router.delete('/submissions/:id', verifyFirebaseToken, deleteSubmission);

module.exports = router;
