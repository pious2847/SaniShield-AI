const express = require('express');
const ctrl = require('../controllers/sludgeJobController');
const { authenticate } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

const router = express.Router();

router.get('/stats/chain', ctrl.chainStats);
router.post('/', authenticate, ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id/accept', authenticate, ctrl.accept);
router.put('/:id/pickup', authenticate, uploadPhoto, ctrl.pickup);
router.put('/:id/deliver', authenticate, uploadPhoto, ctrl.deliver);
router.put('/:id/treat', authenticate, ctrl.confirmTreatment);
router.put('/:id/cancel', authenticate, ctrl.cancel);

module.exports = router;
