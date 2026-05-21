const express = require('express');
const ctrl = require('../controllers/gathererController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', ctrl.register);
router.get('/', ctrl.list);
router.get('/nearby', ctrl.nearby);
router.get('/:id', ctrl.getOne);
router.put('/:id/location', ctrl.updateLocation);
router.put('/:id', authenticate, ctrl.update);

module.exports = router;
