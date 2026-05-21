const express = require('express');
const ctrl = require('../controllers/ngoController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/alertable', ctrl.alertable);
router.get('/:id', ctrl.getOne);
router.get('/:id/agents', ctrl.listAgents);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.post('/:id/agents', authenticate, ctrl.addAgent);

module.exports = router;
