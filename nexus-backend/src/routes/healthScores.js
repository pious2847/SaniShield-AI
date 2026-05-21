const express = require('express');
const ctrl = require('../controllers/healthScoreController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', ctrl.all);
router.get('/:district/history', ctrl.history);
router.get('/:district', ctrl.forDistrict);
router.post('/compute', authenticate, requireRole('admin', 'district_officer'), ctrl.compute);
router.post('/compute/:district', authenticate, requireRole('admin', 'district_officer'), ctrl.computeOne);

module.exports = router;
