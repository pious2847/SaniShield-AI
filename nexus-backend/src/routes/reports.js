const express = require('express');
const { createReport, listReports, getReport, updateReportStatus } = require('../controllers/reportController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public can submit reports (field workers, community members)
router.post('/', optionalAuth, createReport);

router.get('/', authenticate, listReports);
router.get('/:id', authenticate, getReport);
router.patch('/:id/status', authenticate, requireRole('admin', 'district_officer', 'sanitation_worker'), updateReportStatus);

module.exports = router;
