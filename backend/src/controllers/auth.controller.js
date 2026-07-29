const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// ─── REGISTRO ───────────────────────────────────────────
const register = async (req, res) => {
  // 1. Recibimos los datos del body
  const { name, email, password, role } = req.body;

  // 2. Validamos que no falte nada
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    // 3. Verificamos que el email no exista ya
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 4. Encriptamos la contraseña (nunca se guarda en texto plano)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 5. Guardamos el usuario en la BD
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role || 'tecnico']
    );

    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente',
      id: result.insertId 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── REGISTRO DE CLIENTE (users + clients en transacción) ──
const registerClient = async (req, res) => {
  const { name, email, password, company, phone, address } = req.body;

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

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, password_hash, 'cliente']
      );
      const userId = userResult.rows[0].id;

      await client.query(
        'INSERT INTO clients (name, company, email, phone, address, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [name, company || null, email, phone || null, address || null, userId]
      );

      await client.query('COMMIT');
      client.release();

      const token = jwt.sign(
        { id: userId, email, role: 'cliente' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.status(201).json({
        mensaje: 'Cliente registrado exitosamente',
        token,
        user: { id: userId, name, email, role: 'cliente' }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      throw err;
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── LOGIN ──────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // 1. Buscamos el usuario por email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = users[0];

    // 2. Verificamos la contraseña
    const passwordValida = await bcrypt.compare(password, user.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // 3. Generamos el token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }  // el token dura 8 horas
    );

    // 4. Respondemos con el token y datos básicos del usuario
    res.json({
      mensaje: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, registerClient };