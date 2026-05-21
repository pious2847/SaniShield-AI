const express = require('express');
const ctrl = require('../controllers/exportController');

const router = express.Router();

router.get('/district/:district/pdf', ctrl.districtPdf);
router.get('/district/:district/csv', ctrl.districtCsv);
router.get('/full', ctrl.fullDataJson);

module.exports = router;
