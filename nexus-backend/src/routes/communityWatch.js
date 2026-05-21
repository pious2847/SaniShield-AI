const express = require('express');
const ctrl = require('../controllers/communityWatchController');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

const router = express.Router();

// Public — anyone with a phone can submit a report or photo
router.post('/report', uploadPhoto, ctrl.report);
router.post('/upload', uploadPhoto, ctrl.uploadPhoto);

// Read endpoints — open to public
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

module.exports = router;
