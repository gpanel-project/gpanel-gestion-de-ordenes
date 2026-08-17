const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin, verifyAdminOrTecnico } = require('../middlewares/auth.middleware');
const {
  createOrder, getOrders, getOrderById, cancelOrder,
  updateOrder, updateOrderStatus, deleteOrder,
  saveSignature, downloadPDF, uploadOrderImage, getOrderImages,
  getStats, getDashboardStats,
  assignTechnician, getTechnicians
} = require('../controllers/orders.controller');
const upload = require('../middlewares/upload.middleware');

// Crear orden → admin (a nombre de cualquier cliente) o cliente (la suya propia)
router.post('/', verifyToken, createOrder);

// Listar órdenes → todos los roles ven las suyas
router.get('/', verifyToken, getOrders);

router.get('/stats/summary', verifyToken, getStats);

// Métricas del dashboard → solo admin
router.get('/stats/dashboard', verifyToken, verifyAdmin, getDashboardStats);

// Listar técnicos disponibles → solo admin
router.get('/technicians/list', verifyToken, verifyAdmin, getTechnicians);

// Ver detalle → todos los roles
router.get('/:id', verifyToken, getOrderById);

// Actualizar orden → admin o tecnico
router.put('/:id', verifyToken, verifyAdminOrTecnico, updateOrder);

// Cambiar estado → admin o tecnico
router.patch('/:id/status', verifyToken, verifyAdminOrTecnico, updateOrderStatus);

// Asignar técnico a una orden → solo admin
router.patch('/:id/assign', verifyToken, verifyAdmin, assignTechnician);

// Cancelar → cliente (la suya, si sigue pendiente) o admin
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Eliminar → admin o técnico (solo completada/cancelada)
router.delete('/:id', verifyToken, deleteOrder);

// Guarda la firma digital (solo el cliente dueño de la orden)
router.post('/:id/signature', verifyToken, saveSignature);

// Subir imagen/PDF adjunto a una orden (admin o técnico)
router.post('/:id/images', verifyToken, verifyAdminOrTecnico, upload.single('image'), uploadOrderImage);

// Listar adjuntos de una orden
router.get('/:id/images', verifyToken, getOrderImages);

// Descarga el PDF
router.get('/:id/pdf',        verifyToken, downloadPDF);   

module.exports = router;