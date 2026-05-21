const express = require('express');
const ctrl = require('../controllers/unicefController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', ctrl.stats);
router.get('/compliance', ctrl.compliance);
router.get('/od-events', ctrl.odEvents);
router.get('/schools', ctrl.listSchools);
router.get('/schools/:id', ctrl.getSchool);
router.post('/schools', ctrl.addSchool);
router.post('/od-events', ctrl.reportOd);
router.put('/schools/:id', authenticate, ctrl.updateSchool);
router.get('/mhm-compliance', ctrl.mhmCompliance);
router.put('/schools/:id/mhm', authenticate, ctrl.updateMhm);

module.exports = router;
