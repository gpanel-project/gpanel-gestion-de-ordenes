const jwt = require('jsonwebtoken');
require('dotenv').config();

// ─── GUARDIA 1: Verifica que el token existe y es válido ───
const verifyToken = (req, res, next) => {
  // El token llega en el header así: "Bearer eyJhbGci..."
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. No enviaste un token.' });
  }

  // Separamos "Bearer" del token real
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  try {
    // Verificamos que el token sea auténtico
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardamos los datos del usuario en req.user
    // para usarlos en el controlador
    req.user = decoded;

    // ✅ Todo bien, dejamos pasar
    next();

  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// ─── GUARDIA 2: Verifica que el usuario sea admin ─────────
const verifyAdmin = (req, res, next) => {
  // Este guardia siempre va DESPUÉS de verifyToken
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  // ✅ Es admin, dejamos pasar
  next();
};

// ─── GUARDIA 3: Verifica admin o tecnico ──────────────────
const verifyAdminOrTecnico = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'tecnico') {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, verifyAdminOrTecnico };