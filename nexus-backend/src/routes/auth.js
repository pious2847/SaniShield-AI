const express = require('express');
const { register, login, getProfile, listUsers } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getProfile);
router.get('/users', authenticate, requireRole('admin', 'district_officer'), listUsers);

module.exports = router;
