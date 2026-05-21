const express = require('express');
const ctrl = require('../controllers/blogController');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadCover } = require('../middleware/upload');

const router = express.Router();

// Public read
router.get('/', ctrl.list);
router.get('/recent', ctrl.recent);
router.get('/:id', ctrl.getPost);

// Authenticated write
router.post('/', authenticate, uploadCover, ctrl.create);
router.post('/ai-generate', authenticate, requireRole('admin', 'district_officer'), ctrl.aiGenerate);
router.put('/:id', authenticate, uploadCover, ctrl.update);
router.post('/:id/publish', authenticate, requireRole('admin', 'district_officer', 'ngo_staff'), ctrl.publish);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.remove);

module.exports = router;
