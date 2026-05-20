// ===== authRoutes.js =====
const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { registerValidation, loginValidation, validate } = require('../middleware/validationMiddleware');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
