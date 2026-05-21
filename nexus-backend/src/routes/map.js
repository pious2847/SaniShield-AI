const express = require('express');
const ctrl = require('../controllers/mapController');

const router = express.Router();

router.get('/layers', ctrl.allLayers);
router.get('/toilets', ctrl.toilets);
router.get('/gatherers', ctrl.gatherers);
router.get('/dumps', ctrl.dumps);
router.get('/facilities', ctrl.facilities);
router.get('/alerts', ctrl.alerts);
router.get('/vulnerability', ctrl.vulnerabilityLayer);
router.get('/heatmap/:type', ctrl.heatmap);

module.exports = router;
