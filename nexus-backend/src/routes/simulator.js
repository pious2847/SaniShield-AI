const express = require('express');
const ctrl = require('../controllers/simulatorController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/sensor-spike', authenticate, requireRole('admin'), ctrl.sensorSpike);
router.post('/flood-event', authenticate, requireRole('admin'), ctrl.floodEvent);
router.post('/full-demo', authenticate, requireRole('admin'), ctrl.fullDemo);

module.exports = router;
