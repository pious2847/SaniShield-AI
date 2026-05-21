const express = require('express');
const ctrl = require('../controllers/dumpController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', ctrl.report);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id/resolve', authenticate, ctrl.resolve);
router.put('/:id/assign', authenticate, ctrl.assign);
router.post('/:id/analyze', authenticate, ctrl.analyzeWithAi);

module.exports = router;
