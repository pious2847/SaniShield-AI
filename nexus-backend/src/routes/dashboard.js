const express = require('express');
const { getOverview, getGisData, getWeatherSummary, getFullDashboard, getCronStatusHandler } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authenticate, getOverview);
router.get('/full', authenticate, getFullDashboard);
router.get('/cron-status', authenticate, getCronStatusHandler);
router.get('/gis', getGisData);
router.get('/weather', authenticate, getWeatherSummary);

module.exports = router;
