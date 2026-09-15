const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// Los códigos/enlaces de restablecimiento de contraseña expiran a los N minutos
const PASSWORD_CHANGE_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '20', 10);

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
    const [rows] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, email, password_hash, role || 'tecnico']
    );

    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente',
      id: rows[0]?.id || null 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const { sendVerificationEmail, sendPasswordChangeEmail } = require('../services/email.service');

// ─── SOLICITUD DE REGISTRO DE CLIENTE (Guardado pendiente + Correo) ──
const registerClient = async (req, res) => {
  const { name, email, password, company, phone, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    // 1. Verificar si el correo ya existe en usuarios registrados
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 2. Generar código de verificación de 6 dígitos y encriptar clave
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Guardar en tabla temporal pending_registrations
    await db.query(
      `INSERT INTO pending_registrations 
        (name, email, password_hash, company, phone, address, verification_code) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        company = EXCLUDED.company,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        verification_code = EXCLUDED.verification_code,
        created_at = CURRENT_TIMESTAMP`,
      [name, email, password_hash, company || null, phone || null, address || null, verificationCode]
    );

    // 4. Enviar correo de verificación por Resend
    await sendVerificationEmail(email, name, verificationCode);

    res.status(200).json({
      mensaje: 'Código de autenticación enviado a tu correo. Por favor revisa tu bandeja de entrada.',
      email
    });

  } catch (error) {
    console.error('Error en registerClient:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─── VERIFICACIÓN DE CÓDIGO (Transferencia de pending_registrations a BD) ──
const verifyClient = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email y código son obligatorios' });
  }

  try {
    // 1. Buscar en registros pendientes
    const [pending] = await db.query(
      'SELECT * FROM pending_registrations WHERE email = ? AND verification_code = ?',
      [email, code.trim()]
    );

    if (pending.length === 0) {
      return res.status(400).json({ error: 'El código de verificación es incorrecto o ha expirado.' });
    }

    const pendingUser = pending[0];

    // 2. Iniciar transacción en PostgreSQL para crear usuario + cliente
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Crear usuario
      const userResult = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [pendingUser.name, pendingUser.email, pendingUser.password_hash, 'cliente']
      );
      const userId = userResult.rows[0].id;

      // Crear cliente
      await client.query(
        'INSERT INTO clients (name, company, email, phone, address, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [pendingUser.name, pendingUser.company, pendingUser.email, pendingUser.phone, pendingUser.address, userId]
      );

      // Eliminar de pendientes
      await client.query('DELETE FROM pending_registrations WHERE id = $1', [pendingUser.id]);

      await client.query('COMMIT');
      client.release();

      // 3. Generar token JWT para inicio de sesión inmediato
      const token = jwt.sign(
        { id: userId, email: pendingUser.email, role: 'cliente' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.status(200).json({
        mensaje: '¡Cuenta verificada y creada exitosamente!',
        token,
        user: { id: userId, name: pendingUser.name, email: pendingUser.email, role: 'cliente' }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      throw err;
    }

  } catch (error) {
    console.error('Error en verifyClient:', error.message);
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

    // 2b. Verificamos que la cuenta esté activa
    if (user.active === false) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador para más información.' });
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

// ─── SOLICITUD DE CAMBIO DE CONTRASEÑA (doble verificación por correo) ──
// Paso 1: el usuario (logueado) envía su contraseña actual + la nueva.
// Guardamos el hash nuevo en pendiente y enviamos un código por correo.
const requestPasswordChange = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son obligatorias' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    if (current_password === new_password) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
    }

    // Verificamos que la contraseña actual sea correcta
    const passwordValida = await bcrypt.compare(current_password, user.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptamos la nueva contraseña y generamos el código de verificación
    const salt = await bcrypt.genSalt(10);
    const new_password_hash = await bcrypt.hash(new_password, salt);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardamos el cambio pendiente (un solo registro activo por usuario)
    await db.query(
      `INSERT INTO pending_password_resets (user_id, new_password_hash, verification_code)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         new_password_hash = EXCLUDED.new_password_hash,
         verification_code = EXCLUDED.verification_code,
         created_at = CURRENT_TIMESTAMP`,
      [req.user.id, new_password_hash, verificationCode]
    );

    // Enviamos el correo con el código y el link de confirmación
    await sendPasswordChangeEmail(user.email, user.name, verificationCode, PASSWORD_CHANGE_TTL_MINUTES);

    res.status(200).json({
      mensaje: 'Hemos enviado un código de verificación a tu correo para confirmar el cambio de contraseña.'
    });

  } catch (error) {
    console.error('Error en requestPasswordChange:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─── VERIFICACIÓN DEL CÓDIGO Y APLICACIÓN DEL CAMBIO DE CONTRASEÑA ──
const verifyPasswordChange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'El código de verificación es obligatorio' });
  }

  try {
    // Buscamos el cambio pendiente del usuario autenticado
    const [pending] = await db.query(
      'SELECT * FROM pending_password_resets WHERE user_id = ? AND verification_code = ?',
      [req.user.id, code.trim()]
    );

    if (pending.length === 0) {
      return res.status(400).json({ error: 'El código de verificación es incorrecto o ha expirado.' });
    }

    // ── Validación por tiempo: el código/link expira a los N minutos ──
    const createdAt = new Date(pending[0].created_at);
    const expiresAt = new Date(createdAt.getTime() + PASSWORD_CHANGE_TTL_MINUTES * 60 * 1000);
    if (new Date() > expiresAt) {
      // Limpiamos el registro vencido y rechazamos el cambio
      await db.query('DELETE FROM pending_password_resets WHERE id = ?', [pending[0].id]);
      return res.status(400).json({
        error: `El código de verificación ha expirado. Solicita uno nuevo (los enlaces son válidos por ${PASSWORD_CHANGE_TTL_MINUTES} minutos).`
      });
    }

    // Aplicamos la nueva contraseña y limpiamos el registro pendiente
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [pending[0].new_password_hash, req.user.id]);
    await db.query('DELETE FROM pending_password_resets WHERE id = ?', [pending[0].id]);

    res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente.' });

  } catch (error) {
    console.error('Error en verifyPasswordChange:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, registerClient, verifyClient, requestPasswordChange, verifyPasswordChange };