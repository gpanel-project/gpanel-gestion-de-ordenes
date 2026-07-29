const db = require('../db');
const { sendOrderEmail } = require('../services/email.service');

// ─── CREAR ORDEN ──────────────────────────────────────────
const createOrder = async (req, res) => {
  const { client_id, technician_id, description } = req.body;

  if (!client_id || !technician_id || !description) {
    return res.status(400).json({ error: 'Cliente, técnico y descripción son obligatorios' });
  }

  try {
    // Generamos el número de orden automáticamente
    const year = new Date().getFullYear();
    const [lastOrder] = await db.query(
      'SELECT COUNT(*) as total FROM service_orders WHERE YEAR(created_at) = ?',
      [year]
    );
    const consecutive = String(lastOrder[0].total + 1).padStart(4, '0');
    const order_number = `OS-${year}-${consecutive}`;

    const [result] = await db.query(
      `INSERT INTO service_orders 
        (order_number, client_id, technician_id, created_by, description, status) 
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [order_number, client_id, technician_id, req.user.id, description]
    );

    res.status(201).json({
      mensaje: 'Orden creada exitosamente',
      id: result.insertId,
      order_number
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── LISTAR ÓRDENES ───────────────────────────────────────
const getOrders = async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin ve todas las órdenes
      query = `
        SELECT 
          so.id, so.order_number, so.status, so.description,
          so.total_cost, so.created_at,
          c.name  AS client_name,
          c.company AS client_company,
          u.name  AS technician_name
        FROM service_orders so
        JOIN clients c ON so.client_id = c.id
        JOIN users u   ON so.technician_id = u.id
        ORDER BY so.created_at DESC
      `;
    } else if (req.user.role === 'tecnico') {
      // Técnico solo ve sus órdenes
      query = `
        SELECT 
          so.id, so.order_number, so.status, so.description,
          so.total_cost, so.created_at,
          c.name AS client_name,
          c.company AS client_company,
          u.name AS technician_name
        FROM service_orders so
        JOIN clients c ON so.client_id = c.id
        JOIN users u   ON so.technician_id = u.id
        WHERE so.technician_id = ?
        ORDER BY so.created_at DESC
      `;
      params = [req.user.id];
    } else {
      // Cliente solo ve sus órdenes
      query = `
        SELECT 
          so.id, so.order_number, so.status, so.description,
          so.total_cost, so.created_at,
          c.name AS client_name,
          c.company AS client_company,
          u.name AS technician_name
        FROM service_orders so
        JOIN clients c ON so.client_id = c.id
        JOIN users u   ON so.technician_id = u.id
        WHERE so.client_id = ?
        ORDER BY so.created_at DESC
      `;
      params = [req.user.id];
    }

    const [orders] = await db.query(query, params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── VER DETALLE DE UNA ORDEN ─────────────────────────────
const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const [orders] = await db.query(
      `SELECT 
        so.*,
        c.name        AS client_name,
        c.company     AS client_company,
        c.email       AS client_email,
        c.phone       AS client_phone,
        c.address     AS client_address,
        u.name        AS technician_name,
        u.email       AS technician_email,
        cb.name       AS created_by_name
      FROM service_orders so
      JOIN clients c  ON so.client_id = c.id
      JOIN users u    ON so.technician_id = u.id
      JOIN users cb   ON so.created_by = cb.id
      WHERE so.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json(orders[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ACTUALIZAR ORDEN ─────────────────────────────────────
const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, work_done, parts_used, total_cost } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM service_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    await db.query(
      `UPDATE service_orders 
       SET diagnosis = ?, work_done = ?, parts_used = ?, total_cost = ?
       WHERE id = ?`,
      [diagnosis, work_done, parts_used, total_cost, id]
    );

    res.json({ mensaje: 'Orden actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── CAMBIAR ESTADO DE LA ORDEN ───────────────────────────
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM service_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    await db.query('UPDATE service_orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ mensaje: `Estado actualizado a: ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ELIMINAR ORDEN ───────────────────────────────────────
const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT id FROM service_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    await db.query('DELETE FROM service_orders WHERE id = ?', [id]);
    res.json({ mensaje: 'Orden eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const path = require('path');
const fs   = require('fs');
const { generateOrderPDF } = require('../services/pdf.service');

// ─── GUARDAR FIRMA Y GENERAR PDF ──────────────────────────
const saveSignature = async (req, res) => {
  const { id } = req.params;
  const { signature_base64 } = req.body;

  if (!signature_base64) {
    return res.status(400).json({ error: 'La firma es obligatoria' });
  }

  try {
    // 1. Guardamos la firma en la BD
    await db.query(
      `UPDATE service_orders 
       SET signature_base64 = ?, signature_date = NOW(), status = 'completada'
       WHERE id = ?`,
      [signature_base64, id]
    );

    // 2. Obtenemos todos los datos de la orden
    const [orders] = await db.query(
      `SELECT 
        so.*,
        c.name        AS client_name,
        c.company     AS client_company,
        c.email       AS client_email,
        c.phone       AS client_phone,
        c.address     AS client_address,
        u.name        AS technician_name,
        u.email       AS technician_email,
        cb.name       AS created_by_name
      FROM service_orders so
      JOIN clients c  ON so.client_id = c.id
      JOIN users u    ON so.technician_id = u.id
      JOIN users cb   ON so.created_by = cb.id
      WHERE so.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = orders[0];

    // 3. Generamos el PDF
    const pdfPath = await generateOrderPDF(order);

    // 4. Guardamos la ruta del PDF en la BD
    const relativePath = path.relative(
      path.join(__dirname, '../../'),
      pdfPath
    );

    await db.query(
      'UPDATE service_orders SET pdf_path = ? WHERE id = ?',
      [relativePath, id]
    );

    // 5. Enviamos el correo
    try {
      await sendOrderEmail(order, pdfPath);
    } catch (emailError) {
      // Si el correo falla no rompemos todo, solo avisamos
      console.error('Error enviando correo:', emailError.message);
    }

    res.json({
      mensaje: '✅ Firma guardada, PDF generado y correo enviado exitosamente',
      pdf: relativePath
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DESCARGAR PDF ────────────────────────────────────────
const downloadPDF = async (req, res) => {
  const { id } = req.params;

  try {
    const [orders] = await db.query(
      'SELECT pdf_path, order_number FROM service_orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (!orders[0].pdf_path) {
      return res.status(404).json({ error: 'Esta orden aún no tiene PDF generado' });
    }

    const filePath = path.join(__dirname, '../../', orders[0].pdf_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo PDF no encontrado en el servidor' });
    }

    res.download(filePath, `${orders[0].order_number}.pdf`);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ESTADÍSTICAS PARA EL DASHBOARD ───────────────────────
const getStats = async (req, res) => {
  try {
    let whereClause = '';
    let params = [];

    if (req.user.role === 'tecnico') {
      whereClause = 'WHERE technician_id = ?';
      params = [req.user.id];
    } else if (req.user.role === 'cliente') {
      whereClause = 'WHERE client_id = ?';
      params = [req.user.id];
    }
    // admin no tiene whereClause, ve todo

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN status = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
        SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completadas,
        SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as canceladas
      FROM service_orders ${whereClause}`,
      params
    );

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder, getOrders, getOrderById,
  updateOrder, updateOrderStatus, deleteOrder,
  saveSignature, downloadPDF, 
  getStats                
};