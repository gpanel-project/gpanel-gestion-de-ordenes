const express = require('express');
const router = express.Router();
const { register, login, registerClient } = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/register/client
router.post('/register/client', registerClient);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;