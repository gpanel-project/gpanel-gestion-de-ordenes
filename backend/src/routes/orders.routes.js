const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin, verifyAdminOrTecnico } = require('../middlewares/auth.middleware');
const {
  createOrder, getOrders, getOrderById, cancelOrder,
  updateOrder, updateOrderStatus, deleteOrder,
  saveSignature, downloadPDF, uploadOrderImage, getOrderImages,
  getStats, getDashboardStats                    
} = require('../controllers/orders.controller');
const upload = require('../middlewares/upload.middleware');

// Crear orden → admin (a nombre de cualquier cliente) o cliente (la suya propia)
router.post('/', verifyToken, createOrder);

// Listar órdenes → todos los roles ven las suyas
router.get('/', verifyToken, getOrders);

router.get('/stats/summary', verifyToken, getStats);

// Métricas del dashboard → solo admin
router.get('/stats/dashboard', verifyToken, verifyAdmin, getDashboardStats);

// Ver detalle → todos los roles
router.get('/:id', verifyToken, getOrderById);

// Actualizar orden → admin o tecnico
router.put('/:id', verifyToken, verifyAdminOrTecnico, updateOrder);

// Cambiar estado → admin o tecnico
router.patch('/:id/status', verifyToken, verifyAdminOrTecnico, updateOrderStatus);

// Cancelar → cliente (la suya, si sigue pendiente) o admin
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Eliminar → solo admin
router.delete('/:id', verifyToken, verifyAdmin, deleteOrder);

// Guarda la firma digital (solo admin o tecnico)
router.post('/:id/signature', verifyToken, verifyAdminOrTecnico, saveSignature);

// Subir imagen/PDF adjunto a una orden (admin o técnico)
router.post('/:id/images', verifyToken, verifyAdminOrTecnico, upload.single('image'), uploadOrderImage);

// Listar adjuntos de una orden
router.get('/:id/images', verifyToken, getOrderImages);

// Descarga el PDF
router.get('/:id/pdf',        verifyToken, downloadPDF);   

module.exports = router;