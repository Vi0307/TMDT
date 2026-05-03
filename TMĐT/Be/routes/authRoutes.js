const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Đăng ký: POST /api/auth/register
router.post('/register', register);

// Đăng nhập: POST /api/auth/login
router.post('/login', login);

module.exports = router;
