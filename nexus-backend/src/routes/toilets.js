const express = require('express');
const ctrl = require('../controllers/toiletController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', ctrl.register);
router.get('/', ctrl.list);
router.get('/by-district', ctrl.countByDistrict);
router.get('/:id/qrcode', ctrl.qrCode);
router.get('/:id', ctrl.getOne);
router.put('/:id/verify', authenticate, requireRole('admin', 'district_officer'), ctrl.verify);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.remove);

module.exports = router;
