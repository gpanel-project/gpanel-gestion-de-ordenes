const bcrypt = require('bcryptjs');
const db = require('../db');

// ─── LISTAR USUARIOS ──────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, active, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── OBTENER UN USUARIO ───────────────────────────────────
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── CREAR USUARIO ────────────────────────────────────────
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [rows] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, email, password_hash, role || 'tecnico']
    );

    res.status(201).json({ mensaje: 'Usuario creado exitosamente', id: rows[0]?.id || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── EDITAR USUARIO ───────────────────────────────────────
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, active } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.query(
      'UPDATE users SET name = ?, email = ?, role = ?, active = ? WHERE id = ?',
      [name, email, role, active, id]
    );

    res.json({ mensaje: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ELIMINAR USUARIO ─────────────────────────────────────
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ESTADÍSTICAS DE USUARIOS ─────────────────────────────
const getUserStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*)                                     as total,
        SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'tecnico' THEN 1 ELSE 0 END) as tecnicos,
        SUM(CASE WHEN role = 'cliente' THEN 1 ELSE 0 END) as clientes,
        SUM(CASE WHEN active = true    THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN active = false   THEN 1 ELSE 0 END) as inactivos
      FROM users
    `);

    const [pending] = await db.query(
      'SELECT COUNT(*) as pendientes FROM pending_registrations'
    );

    res.json({ ...stats[0], pendientes: pending[0]?.pendientes || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser, getUserStats };