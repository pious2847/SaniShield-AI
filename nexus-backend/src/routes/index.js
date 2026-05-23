const express = require('express');
const router = express.Router();

// V1 routes
router.use('/auth', require('./auth'));
router.use('/units', require('./units'));
router.use('/sensors', require('./sensors'));
router.use('/predictions', require('./predictions'));
router.use('/alerts', require('./alerts'));
router.use('/reports', require('./reports'));
router.use('/dashboard', require('./dashboard'));

// V2 routes
router.use('/toilets', require('./toilets'));
router.use('/facilities', require('./facilities'));
router.use('/gatherers', require('./gatherers'));
router.use('/ngos', require('./ngos'));
router.use('/dumps', require('./dumps'));
router.use('/broadcasts', require('./broadcasts'));
router.use('/educator', require('./educator'));
router.use('/weather', require('./weather'));
router.use('/news', require('./news'));
router.use('/health-scores', require('./healthScores'));
router.use('/map', require('./map'));
router.use('/unicef', require('./unicef'));
router.use('/community-watch', require('./communityWatch'));
router.use('/blog', require('./blog'));

// V4 routes
router.use('/sludge-jobs', require('./sludgeJobs'));
router.use('/flood-assessments', require('./floodAssessments'));
router.use('/simulator', require('./simulator'));
router.use('/export', require('./export'));
router.use('/whatsapp', require('./whatsapp'));
router.use('/discovery', require('./discovery'));

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'N.E.X.U.S. API',
    version: '4.0.0',
    description: 'Northern Environmental X-system for Universal Sanitation',
    timestamp: new Date().toISOString(),
    status: 'operational',
    features: [
      'AI overflow & flood prediction', 'Real-time sanitation monitoring',
      'Community toilet registry', 'Waste gatherer tracking',
      'NGO coordination', 'AI broadcast alerts', 'AI hygiene educator',
      'UNICEF child health metrics', 'News intelligence crawler',
      'Community health scores', 'GeoJSON map layers', 'Automated cron intelligence',
    ],
  });
});

module.exports = router;
