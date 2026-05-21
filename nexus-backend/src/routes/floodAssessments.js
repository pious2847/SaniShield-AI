const express = require('express');
const ctrl = require('../controllers/floodAssessmentController');
const { authenticate } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

const router = express.Router();

router.get('/', ctrl.list);
router.post('/trigger', authenticate, ctrl.trigger);
router.get('/:id', ctrl.getOne);
router.get('/:id/checks', ctrl.getChecks);
router.put('/checks/:checkId', authenticate, uploadPhoto, ctrl.updateCheck);
router.put('/:id/complete', authenticate, ctrl.complete);

module.exports = router;
