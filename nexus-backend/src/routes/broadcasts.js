const express = require('express');
const ctrl = require('../controllers/broadcastController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, ctrl.list);
router.get('/recent', authenticate, ctrl.recent);
router.get('/:id', authenticate, ctrl.getOne);
router.get('/:id/recipients', authenticate, ctrl.getRecipients);
router.post('/', authenticate, ctrl.create);
router.post('/:id/send', authenticate, ctrl.send);

module.exports = router;
