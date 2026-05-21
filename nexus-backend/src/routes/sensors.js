const express = require('express');
const {
  ingestReading, batchIngest, getLatestAll, getReadingsForUnit, getCritical
} = require('../controllers/sensorController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// IoT devices post here — use a device API key in production
router.post('/unit/:unitId', ingestReading);
router.post('/batch', batchIngest);

router.get('/latest', getLatestAll);
router.get('/critical', getCritical);
router.get('/unit/:unitId/history', getReadingsForUnit);

module.exports = router;
