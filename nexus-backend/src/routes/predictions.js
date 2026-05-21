const express = require('express');
const {
  predictOverflow, predictFloodRisk, getMaintenancePlan, getDistrictIntelligence, listPredictions
} = require('../controllers/predictionController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, listPredictions);
router.post('/unit/:unitId/overflow', authenticate, predictOverflow);
router.post('/unit/:unitId/flood-risk', authenticate, predictFloodRisk);
router.get('/maintenance-plan', authenticate, requireRole('admin', 'district_officer'), getMaintenancePlan);
router.get('/district/:district/intelligence', authenticate, getDistrictIntelligence);

module.exports = router;
