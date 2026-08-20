const db = require('../db');

// ─── Generar codigo unico REP-### ──────────────────────────
async function generateCode() {
  let code;
  let exists = true;
  while (exists) {
    const num = String(Math.floor(100 + Math.random() * 900)); // 100-999
    code = `REP-${num}`;
    const [rows] = await db.query('SELECT id FROM inventory WHERE code = ?', [code]);
    exists = rows.length > 0;
  }
  return code;
}

// ─── Listar todo el inventario ───────────────────────────────
const getInventory = async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT id, code, name, quantity, created_at FROM inventory ORDER BY name ASC'
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Crear un repuesto (solo admin) ──────────────────────────
const createItem = async (req, res) => {
  const { name, quantity } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
    return res.status(400).json({ error: 'La cantidad debe ser un numero entero positivo' });
  }

  try {
    const code = await generateCode();

    const [result] = await db.query(
      'INSERT INTO inventory (code, name, quantity) VALUES (?, ?, ?) RETURNING id, code, name, quantity, created_at',
      [code, name, quantity || 0]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Actualizar cantidad de un repuesto (solo admin) ─────────
const updateQuantity = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un numero entero positivo' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM inventory WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [quantity, id]);
    const [updated] = await db.query('SELECT id, code, name, quantity FROM inventory WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Eliminar un repuesto (solo admin) ───────────────────────
const deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT id FROM inventory WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    // Verificar que no este en uso en ordenes activas
    const [inUse] = await db.query(
      `SELECT op.id FROM order_parts op
       JOIN service_orders so ON op.order_id = so.id
       WHERE op.inventory_id = ? AND so.status NOT IN ('completada', 'cancelada')`,
      [id]
    );
    if (inUse.length > 0) {
      return res.status(400).json({ error: 'Este repuesto esta en uso en una orden activa y no puede eliminarse' });
    }

    await db.query('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ mensaje: 'Repuesto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Obtener repuestos con disponibilidad (para el tecnico) ──
const getAvailableItems = async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT id, code, name, quantity FROM inventory WHERE quantity > 0 ORDER BY name ASC'
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getInventory,
  createItem,
  updateQuantity,
  deleteItem,
  getAvailableItems
};
