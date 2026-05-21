const express = require('express');
const ctrl = require('../controllers/educatorController');

const router = express.Router();

router.get('/topics', ctrl.topics);
router.post('/ask', ctrl.ask);

module.exports = router;
