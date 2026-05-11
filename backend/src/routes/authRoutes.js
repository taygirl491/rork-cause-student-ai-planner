const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.post('/welcome-email', authenticate, authController.sendWelcomeEmail);

module.exports = router;
