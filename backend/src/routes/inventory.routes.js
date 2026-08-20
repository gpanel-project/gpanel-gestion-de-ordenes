const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middlewares/auth.middleware');
const {
  getInventory,
  createItem,
  updateQuantity,
  deleteItem,
  getAvailableItems
} = require('../controllers/inventory.controller');

// GET /api/inventory          - Listar todo (admin)
router.get('/', verifyToken, verifyAdmin, getInventory);

// GET /api/inventory/available - Repuestos con stock > 0 (admin + tecnico)
router.get('/available', verifyToken, getAvailableItems);

// POST /api/inventory         - Crear repuesto (admin)
router.post('/', verifyToken, verifyAdmin, createItem);

// PATCH /api/inventory/:id    - Actualizar cantidad (admin)
router.patch('/:id', verifyToken, verifyAdmin, updateQuantity);

// DELETE /api/inventory/:id   - Eliminar repuesto (admin)
router.delete('/:id', verifyToken, verifyAdmin, deleteItem);

module.exports = router;
