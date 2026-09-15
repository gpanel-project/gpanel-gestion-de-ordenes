const express = require('express');
const router = express.Router();
const { register, login, registerClient, verifyClient, requestPasswordChange, verifyPasswordChange } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/register/client
router.post('/register/client', registerClient);

// POST /api/auth/verify-client
router.post('/verify-client', verifyClient);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/request-password-change (usuario logueado)
router.post('/request-password-change', verifyToken, requestPasswordChange);

// POST /api/auth/verify-password-change (usuario logueado)
router.post('/verify-password-change', verifyToken, verifyPasswordChange);

module.exports = router;