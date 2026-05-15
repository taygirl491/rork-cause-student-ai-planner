const express = require('express');
const router = express.Router();
const { activateSubscription } = require('../controllers/iapController');

// Called after a successful Apple IAP purchase or restore
router.post('/activate', activateSubscription);

module.exports = router;
