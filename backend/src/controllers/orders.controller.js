  const db = require('../db');
  const { sendOrderEmail, sendOrderAttendedEmail } = require('../services/email.service');

  // ─── CREAR ORDEN ──────────────────────────────────────────
  // Admin: crea la orden a nombre de cualquier cliente y asigna técnico.
  // Cliente: crea su propia orden (queda sin técnico asignado, a la espera
  // de que el admin la asigne). Técnico: no puede crear órdenes.
  const createOrder = async (req, res) => {
    if (req.user.role === 'tecnico') {
      return res.status(403).json({ error: 'Los técnicos no pueden crear órdenes' });
    }

    let { client_id, technician_id, description, device_type } = req.body;
    technician_id = technician_id || null;

    if (req.user.role === 'cliente') {
      const [clientRow] = await db.query('SELECT id FROM clients WHERE user_id = ?', [req.user.id]);
      if (clientRow.length === 0) {
        return res.status(400).json({ error: 'Tu usuario no tiene un perfil de cliente asociado. Contacta al administrador.' });
      }
      client_id = clientRow[0].id;
      technician_id = null;
    }

    if (!client_id || !description) {
      return res.status(400).json({ error: 'Cliente y descripción son obligatorios' });
    }
    if (!device_type) {
      return res.status(400).json({ error: 'El tipo de dispositivo es obligatorio' });
    }
    if (req.user.role === 'admin' && !technician_id) {
      return res.status(400).json({ error: 'Cliente, técnico y descripción son obligatorios' });
    }

    try {
      // Generamos el número de orden automáticamente
      const year = new Date().getFullYear();
      const [lastOrder] = await db.query(
        'SELECT COUNT(*) as total FROM service_orders WHERE EXTRACT(YEAR FROM created_at) = ?',
        [year]
      );
      const totalCount = parseInt(lastOrder[0]?.total || 0, 10);
      const consecutive = String(totalCount + 1).padStart(4, '0');
      const order_number = `OS-${year}-${consecutive}`;

      const [rows] = await db.query(
        `INSERT INTO service_orders 
          (order_number, client_id, technician_id, created_by, description, device_type, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'pendiente') RETURNING id`,
        [order_number, client_id, technician_id, req.user.id, description, device_type]
      );

      res.status(201).json({
        mensaje: 'Orden creada exitosamente',
        id: rows[0]?.id || null,
        order_number
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── CANCELAR ORDEN (cliente cancela una orden propia PENDIENTE) ──
  const cancelOrder = async (req, res) => {
    const { id } = req.params;

    try {
      const [existing] = await db.query(
        `SELECT so.id, so.status, c.user_id AS client_user_id
         FROM service_orders so
         JOIN clients c ON so.client_id = c.id
         WHERE so.id = ?`,
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      if (req.user.role === 'cliente' && existing[0].client_user_id !== req.user.id) {
        return res.status(403).json({ error: 'No puedes cancelar una orden que no es tuya' });
      }

      if (existing[0].status !== 'pendiente') {
        return res.status(400).json({ error: 'Solo se pueden cancelar órdenes en estado PENDIENTE' });
      }

      await db.query('UPDATE service_orders SET status = ? WHERE id = ?', ['cancelada', id]);
      res.json({ mensaje: 'Orden cancelada exitosamente' });
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
            so.total_cost, so.device_type, so.created_at,
            c.name  AS client_name,
            c.company AS client_company,
            u.name  AS technician_name
          FROM service_orders so
          JOIN clients c ON so.client_id = c.id
          LEFT JOIN users u ON so.technician_id = u.id
          ORDER BY so.created_at DESC
        `;
      } else if (req.user.role === 'tecnico') {
        // Técnico solo ve sus órdenes
        query = `
          SELECT 
            so.id, so.order_number, so.status, so.description,
            so.total_cost, so.device_type, so.created_at,
            c.name AS client_name,
            c.company AS client_company,
            u.name AS technician_name
          FROM service_orders so
          JOIN clients c ON so.client_id = c.id
          LEFT JOIN users u ON so.technician_id = u.id
          WHERE so.technician_id = ?
          ORDER BY so.created_at DESC
        `;
        params = [req.user.id];
      } else {
        // Cliente solo ve sus órdenes
        query = `
          SELECT 
            so.id, so.order_number, so.status, so.description,
            so.total_cost, so.device_type, so.created_at,
            c.name AS client_name,
            c.company AS client_company,
            u.name AS technician_name
          FROM service_orders so
          JOIN clients c ON so.client_id = c.id
          LEFT JOIN users u ON so.technician_id = u.id
          WHERE c.user_id = ?
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
        LEFT JOIN users u ON so.technician_id = u.id
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
      const [existing] = await db.query('SELECT id, technician_id FROM service_orders WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Un técnico solo puede modificar las órdenes que le fueron asignadas
      if (req.user.role === 'tecnico' && existing[0].technician_id !== req.user.id) {
        return res.status(403).json({ error: 'No puedes modificar una orden que no te fue asignada' });
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

    const validStatuses = ['pendiente', 'en_progreso', 'atendida', 'completada', 'cancelada'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    try {
      const [existing] = await db.query('SELECT id, technician_id, status FROM service_orders WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Las órdenes completadas o canceladas quedan bloqueadas
      if (['completada', 'cancelada'].includes(existing[0].status)) {
        return res.status(400).json({ error: 'Esta orden está cerrada y no puede cambiar de estado' });
      }

      // Las órdenes atendidas esperan firma del cliente, no pueden cambiar de estado
      if (existing[0].status === 'atendida') {
        return res.status(400).json({ error: 'La orden está atendida, esperando firma del cliente' });
      }

      // Un técnico solo puede cambiar el estado de sus propias órdenes
      if (req.user.role === 'tecnico') {
        if (existing[0].technician_id !== req.user.id) {
          return res.status(403).json({ error: 'No puedes cambiar el estado de una orden que no te fue asignada' });
        }
        // Técnico solo puede pasar de en_progreso → atendida
        if (existing[0].status !== 'en_progreso' || status !== 'atendida') {
          return res.status(400).json({ error: 'El técnico solo puede marcar una orden EN PROGRESO como ATENDIDA' });
        }
      }

      await db.query('UPDATE service_orders SET status = ? WHERE id = ?', [status, id]);

      // Si el técnico marca la orden como atendida, notificamos al cliente
      if (status === 'atendida') {
        try {
          const [orderData] = await db.query(
            `SELECT 
              so.order_number, so.description,
              c.name AS client_name, c.email AS client_email,
              u.name AS technician_name
            FROM service_orders so
            JOIN clients c ON so.client_id = c.id
            LEFT JOIN users u ON so.technician_id = u.id
            WHERE so.id = ?`,
            [id]
          );
          if (orderData.length > 0) {
            await sendOrderAttendedEmail(orderData[0]);
          }
        } catch (emailError) {
          console.error('Error enviando correo de orden atendida:', emailError.message);
        }
      }

      res.json({ mensaje: `Estado actualizado a: ${status}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── ASIGNAR TÉCNICO A UNA ORDEN (solo admin) ──────────────
  const assignTechnician = async (req, res) => {
    const { id } = req.params;
    const { technician_id } = req.body;

    if (!technician_id) {
      return res.status(400).json({ error: 'Debe seleccionar un técnico' });
    }

    try {
      const [existing] = await db.query(
        'SELECT id, status FROM service_orders WHERE id = ?', [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      if (existing[0].status !== 'pendiente') {
        return res.status(400).json({ error: 'Solo se pueden asignar técnicos a órdenes en estado PENDIENTE' });
      }

      await db.query(
        'UPDATE service_orders SET technician_id = ?, status = \'en_progreso\' WHERE id = ?',
        [technician_id, id]
      );

      res.json({ mensaje: 'Técnico asignado y orden puesta en progreso' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── LISTAR TÉCNICOS DISPONIBLES ──────────────────────────
  const getTechnicians = async (req, res) => {
    try {
      const [techs] = await db.query(
        "SELECT id, name, email FROM users WHERE role = 'tecnico' AND active = true ORDER BY name"
      );
      res.json(techs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── ELIMINAR ORDEN (admin o técnico, solo COMPLETADA o CANCELADA) ──
  const deleteOrder = async (req, res) => {
    const { id } = req.params;

    try {
      const [existing] = await db.query(
        'SELECT id, status, technician_id, pdf_public_id FROM service_orders WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Solo las órdenes completadas o canceladas pueden eliminarse
      if (!['completada', 'cancelada'].includes(existing[0].status)) {
        return res.status(400).json({ error: 'Solo las órdenes en estado COMPLETADA o CANCELADA pueden eliminarse' });
      }

      // El técnico solo puede eliminar sus propias órdenes
      if (req.user.role === 'tecnico' && existing[0].technician_id !== req.user.id) {
        return res.status(403).json({ error: 'No puedes eliminar una orden que no te fue asignada' });
      }

      // 1. Limpiamos adjuntos de Cloudinary (best effort, no bloquea el borrado)
      const cloudinary = require('../config/cloudinary');
      try {
        if (existing[0].pdf_public_id) {
          await cloudinary.uploader.destroy(existing[0].pdf_public_id, { resource_type: 'raw' });
        }
        const [images] = await db.query(
          'SELECT public_id, file_type FROM order_images WHERE order_id = ?',
          [id]
        );
        for (const img of images) {
          if (img.public_id) {
            const resourceType = img.file_type === 'raw' ? 'raw' : 'image';
            await cloudinary.uploader.destroy(img.public_id, { resource_type: resourceType });
          }
        }
      } catch (cloudError) {
        console.error('⚠️ Error limpiando archivos de Cloudinary:', cloudError.message);
      }

      // 2. Borramos la orden (las imágenes se eliminan en cascada por la FK)
      await db.query('DELETE FROM service_orders WHERE id = ?', [id]);
      res.json({ mensaje: 'Orden eliminada exitosamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const { generateOrderPDF } = require('../services/pdf.service');
  const cloudinary = require('../config/cloudinary');

  // ─── GUARDAR FIRMA Y GENERAR PDF ──────────────────────────
  const saveSignature = async (req, res) => {
    const { id } = req.params;
    const { signature_base64 } = req.body;

    if (!signature_base64) {
      return res.status(400).json({ error: 'La firma es obligatoria' });
    }

    try {
      // 1. Obtenemos todos los datos de la orden (también valida que exista)
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
        LEFT JOIN users u ON so.technician_id = u.id
        JOIN users cb   ON so.created_by = cb.id
        WHERE so.id = ?`,
        [id]
      );

      if (orders.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      const order = orders[0];

      // 1b. Solo el cliente dueño de la orden puede firmar
      if (req.user.role !== 'cliente') {
        return res.status(403).json({ error: 'Solo el cliente puede firmar la orden' });
      }

      // 1c. La orden debe estar en estado 'atendida' para poder firmarla
      if (order.status !== 'atendida') {
        return res.status(400).json({ error: 'La orden debe estar en estado ATENDIDA para poder firmarla' });
      }

      // 1d. Validamos que el cliente autenticado sea el dueño de la orden
      const [clientRow] = await db.query(
        'SELECT id FROM clients WHERE user_id = ? AND id = ?',
        [req.user.id, order.client_id]
      );
      if (clientRow.length === 0) {
        return res.status(403).json({ error: 'No puedes firmar una orden que no es tuya' });
      }

      // 1c. La orden debe estar en estado 'atendida' para poder firmarla
      if (order.status !== 'atendida') {
        return res.status(400).json({ error: 'La orden debe estar en estado ATENDIDA para poder firmarla' });
      }

      // 2. Guardamos la firma en la BD
      await db.query(
        `UPDATE service_orders 
        SET signature_base64 = ?, signature_date = NOW(), status = 'completada'
        WHERE id = ?`,
        [signature_base64, id]
      );

      // 3. Generamos el PDF y lo subimos a Cloudinary
      const { url: pdfUrl, public_id: pdfPublicId } = await generateOrderPDF(order);

      // 4. Guardamos la URL del PDF en la BD
      await db.query(
        'UPDATE service_orders SET pdf_path = ?, pdf_public_id = ? WHERE id = ?',
        [pdfUrl, pdfPublicId, id]
      );

      // 5. Enviamos el correo (adjuntando el PDF desde la URL de Cloudinary)
      try {
        await sendOrderEmail(order, pdfUrl);
      } catch (emailError) {
        // Si el correo falla no rompemos todo, solo avisamos
        console.error('Error enviando correo:', emailError.message);
      }

      res.json({
        mensaje: '✅ Firma guardada, PDF generado y correo enviado exitosamente',
        pdf: pdfUrl
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── DESCARGAR PDF ────────────────────────────────────────
  // El PDF vive en Cloudinary (carpeta ordenes-pdf). Esta cuenta de
  // Cloudinary restringe la entrega pública de archivos con extensión
  // .pdf, así que en vez de redirigir, descargamos el archivo desde
  // Cloudinary y lo enviamos al navegador con los headers correctos.
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

      // Descargamos el PDF desde Cloudinary y lo transmitimos
      const response = await fetch(orders[0].pdf_path);
      if (!response.ok) {
        throw new Error('No se pudo obtener el PDF desde Cloudinary');
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${orders[0].order_number}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── SUBIR IMAGEN ADJUNTA A UNA ORDEN ─────────────────────
  // Espera un archivo en req.file (middleware multer, campo 'image')
  const uploadOrderImage = async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

    try {
      const [existing] = await db.query(
        'SELECT id, client_id, technician_id FROM service_orders WHERE id = ?', [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Solo el admin, el técnico asignado o el cliente dueño pueden subir adjuntos
      const order = existing[0];
      if (req.user.role === 'tecnico' && order.technician_id !== req.user.id) {
        return res.status(403).json({ error: 'No puedes adjuntar archivos a una orden que no te fue asignada' });
      }
      if (req.user.role === 'cliente') {
        const [clientRow] = await db.query(
          'SELECT id FROM clients WHERE user_id = ? AND id = ?',
          [req.user.id, order.client_id]
        );
        if (clientRow.length === 0) {
          return res.status(403).json({ error: 'No puedes adjuntar archivos a una orden que no es tuya' });
        }
      }

      // Subimos el buffer del archivo a Cloudinary.
      // Si es PDF usamos resource_type 'raw'; si es imagen, 'image'.
      const isPdf = req.file.mimetype === 'application/pdf';
      const resourceType = isPdf ? 'raw' : 'image';
      const folder = isPdf ? 'ordenes-adjuntos' : 'ordenes-imagenes';
      const extension = isPdf ? 'pdf' : req.file.originalname.split('.').pop() || 'png';

      const uploadOptions = {
        resource_type: resourceType,
        folder,
        public_id: `orden-${id}-${Date.now()}`,
        format: extension,
      };
      if (resourceType === 'raw') delete uploadOptions.format;

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      // Guardamos el archivo en una tabla aparte (order_images) para permitir varios por orden
      await db.query(
        `INSERT INTO order_images (order_id, image_url, public_id, file_type) VALUES (?, ?, ?, ?)`,
        [id, uploadResult.secure_url, uploadResult.public_id, resourceType]
      );

      res.status(201).json({
        mensaje: 'Archivo subido exitosamente',
        url: uploadResult.secure_url
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // ─── LISTAR ARCHIVOS ADJUNTOS DE UNA ORDEN ────────────────
  const getOrderImages = async (req, res) => {
    const { id } = req.params;

    try {
      const [images] = await db.query(
        `SELECT id, image_url, public_id, file_type, created_at
         FROM order_images
         WHERE order_id = ?
         ORDER BY created_at DESC`,
        [id]
      );

      res.json(images);
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
        // client_id pertenece a la tabla clients; el token trae el id de users
        whereClause = 'WHERE client_id IN (SELECT id FROM clients WHERE user_id = ?)';
        params = [req.user.id];
      }
      // admin no tiene whereClause, ve todo

      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN status = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
          SUM(CASE WHEN status = 'atendida' THEN 1 ELSE 0 END) as atendidas,
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

  // ─── MÉTRICAS DEL DASHBOARD (solo admin) ──────────────────
  const getDashboardStats = async (req, res) => {
    try {
      // 1. Tasa de atención exitosa
      const [resumen] = await db.query(`
        SELECT
          SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as canceladas
        FROM service_orders
      `);

      const completadas = parseInt(resumen[0]?.completadas || 0, 10);
      const canceladas  = parseInt(resumen[0]?.canceladas || 0, 10);
      const resueltas   = completadas + canceladas;
      const tasaExito   = resueltas > 0 ? Math.round((completadas / resueltas) * 100) : 0;

      // 2. Top técnicos por órdenes completadas
      const [topTecnicos] = await db.query(`
        SELECT u.name, COUNT(*) as completadas
        FROM service_orders so
        JOIN users u ON so.technician_id = u.id
        WHERE so.status = 'completada'
        GROUP BY u.id, u.name
        ORDER BY completadas DESC
        LIMIT 5
      `);

      // 3. Top clientes por volumen (e ingresos generados)
      const [topClientes] = await db.query(`
        SELECT c.name, c.company, COUNT(*) as total,
               COALESCE(SUM(so.total_cost), 0) as ingresos
        FROM service_orders so
        JOIN clients c ON so.client_id = c.id
        GROUP BY c.id, c.name, c.company
        ORDER BY total DESC
        LIMIT 5
      `);

      // 4. Carga de trabajo actual por técnico
      const [cargaTecnicos] = await db.query(`
        SELECT u.name, COUNT(*) as carga
        FROM service_orders so
        JOIN users u ON so.technician_id = u.id
        WHERE so.status IN ('pendiente', 'en_progreso')
        GROUP BY u.id, u.name
        ORDER BY carga DESC
      `);

      res.json({
        resumen: { completadas, canceladas, tasaExito },
        topTecnicos,
        topClientes,
        cargaTecnicos
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  module.exports = {
    createOrder, getOrders, getOrderById, cancelOrder,
    updateOrder, updateOrderStatus, deleteOrder,
    saveSignature, downloadPDF, uploadOrderImage, getOrderImages,
    getStats, getDashboardStats,
    assignTechnician, getTechnicians
  };
