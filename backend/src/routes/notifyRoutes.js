const express = require('express');
const router = express.Router();
const notifyController = require('../controllers/notifyController');
const authenticate = require('../middleware/authenticate');

router.post('/group-join', authenticate, notifyController.notifyGroupJoin);
router.post('/group-created', authenticate, notifyController.notifyGroupCreated);

module.exports = router;
