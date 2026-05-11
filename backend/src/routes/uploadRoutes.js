const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, uploadController.uploadFiles);

module.exports = router;
