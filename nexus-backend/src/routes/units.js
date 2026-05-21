const express = require('express');
const { createUnit, listUnits, getUnit, updateUnit, getHighRisk, getStats } = require('../controllers/unitController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listUnits);
router.get('/high-risk', getHighRisk);
router.get('/stats/by-district', getStats);
router.get('/:id', getUnit);
router.post('/', authenticate, requireRole('admin', 'district_officer'), createUnit);
router.patch('/:id', authenticate, requireRole('admin', 'district_officer', 'sanitation_worker'), updateUnit);

module.exports = router;
