const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin, verifyAdminOrTecnico } = require('../middlewares/auth.middleware');
const {
  createOrder, getOrders, getOrderById,
  updateOrder, updateOrderStatus, deleteOrder,
  saveSignature, downloadPDF,
  getStats                    
} = require('../controllers/orders.controller');

// Crear orden → solo admin
router.post('/', verifyToken, verifyAdmin, createOrder);

// Listar órdenes → todos los roles ven las suyas
router.get('/', verifyToken, getOrders);

router.get('/stats/summary', verifyToken, getStats);

// Ver detalle → todos los roles
router.get('/:id', verifyToken, getOrderById);

// Actualizar orden → admin o tecnico
router.put('/:id', verifyToken, verifyAdminOrTecnico, updateOrder);

// Cambiar estado → admin o tecnico
router.patch('/:id/status', verifyToken, verifyAdminOrTecnico, updateOrderStatus);

// Eliminar → solo admin
router.delete('/:id', verifyToken, verifyAdmin, deleteOrder);

// Guarda la firma digital 
router.post('/:id/signature', verifyToken, saveSignature);   

// Descarga el PDF
router.get('/:id/pdf',        verifyToken, downloadPDF);   

module.exports = router;