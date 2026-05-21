const express = require('express');
const ctrl = require('../controllers/whatsappController');

const router = express.Router();

// Meta sends GET to verify webhook, POST for incoming messages
router.get('/webhook', ctrl.webhook);
router.post('/webhook', ctrl.receive);

module.exports = router;
