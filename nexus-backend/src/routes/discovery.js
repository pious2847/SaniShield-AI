const express = require('express');
const router = express.Router();
const { trigger, stats } = require('../controllers/discoveryController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/trigger', authenticate, requireRole('admin'), trigger);
router.get('/stats', authenticate, stats);

module.exports = router;
