const express = require('express');
const ctrl = require('../controllers/weatherHistoryController');

const router = express.Router();

router.get('/latest', ctrl.latestAll);
router.get('/:district/summary', ctrl.getSummary);
router.get('/:district/heavy-rain', ctrl.heavyRain);
router.get('/:district', ctrl.getForDistrict);

module.exports = router;
