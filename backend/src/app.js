require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();
app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ mensaje: '¡Servidor funcionando!', app: 'Gestión de Órdenes de Mantenimiento' });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS resultado');
    res.json({ conexion: '✅ Base de datos conectada', prueba: rows[0].resultado });
  } catch (error) {
    res.status(500).json({ conexion: '❌ Error de conexión', error: error.message });
  }
});

app.post('/test-post', (req, res) => {
  res.json({ recibido: req.body });
});

// Todas las rutas de auth empiezan con /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);

// ── Manejo de errores (multer y otros) en JSON ─────────
app.use((err, req, res, next) => {
  if (err) {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
  next();
});

// ── Servidor ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});