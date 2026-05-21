const express = require('express');
const { listAlerts, getAlert, acknowledgeAlert, resolveAlert, getAlertSummary } = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, listAlerts);
router.get('/summary', authenticate, getAlertSummary);
router.get('/:id', authenticate, getAlert);
router.patch('/:id/acknowledge', authenticate, acknowledgeAlert);
router.patch('/:id/resolve', authenticate, resolveAlert);

module.exports = router;
