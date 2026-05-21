const express = require('express');
const ctrl = require('../controllers/newsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/recent', ctrl.recent);
router.get('/:id', ctrl.getOne);
router.post('/crawl', authenticate, requireRole('admin', 'district_officer'), ctrl.crawl);

module.exports = router;
