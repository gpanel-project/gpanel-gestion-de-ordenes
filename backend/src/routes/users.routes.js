const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middlewares/auth.middleware');
const { getUsers, getUserById, createUser, updateUser, deleteUser, getUserStats } = require('../controllers/users.controller');

// Todas estas rutas requieren token + ser admin
// verifyToken → verifyAdmin → controlador
router.get('/',          verifyToken, verifyAdmin, getUsers);
router.get('/stats',     verifyToken, verifyAdmin, getUserStats);
router.get('/:id',       verifyToken, verifyAdmin, getUserById);
router.post('/',         verifyToken, verifyAdmin, createUser);
router.put('/:id',       verifyToken, verifyAdmin, updateUser);
router.delete('/:id',    verifyToken, verifyAdmin, deleteUser);

module.exports = router;