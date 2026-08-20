const { Pool } = require('pg');
require('dotenv').config();

// Pool de conexiones a PostgreSQL (Supabase)
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } // Supabase requiere SSL
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// ── Adaptador de compatibilidad ──────────────────────────────
// El resto del código (controllers) fue escrito para mysql2, que usa
// "?" como placeholder y devuelve [rows]. Este wrapper traduce las
// queries a sintaxis Postgres ($1, $2, ...) para no tener que reescribir
// cada línea de SQL en los controladores.
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  query: async (sql, params = []) => {
    const pgSql = toPgPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    // Mantenemos la forma [rows] para no romper "const [x] = await db.query(...)"
    return [result.rows, result.fields];
  }
};

// Crear tablas y columnas que necesitan existir siempre
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        company VARCHAR(255),
        phone VARCHAR(255),
        address TEXT,
        verification_code VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla pending_registrations lista en PostgreSQL');

    // Adjuntos de cada orden subidos a Cloudinary (imágenes y PDFs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_images (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        public_id TEXT,
        file_type TEXT DEFAULT 'image',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla order_images lista en PostgreSQL');

    // Columna que guarda el public_id del PDF en Cloudinary
    await pool.query(`
      ALTER TABLE service_orders
      ADD COLUMN IF NOT EXISTS pdf_public_id TEXT;
    `);
    console.log('✅ Columna pdf_public_id asegurada en service_orders');

    // El técnico ahora puede asignarse después: permitimos que quede
    // nulo cuando un cliente crea su propia orden (queda "sin asignar")
    await pool.query(`
      ALTER TABLE service_orders
      ALTER COLUMN technician_id DROP NOT NULL;
    `);
    console.log('✅ technician_id ahora es opcional en service_orders');

    // Columna para el tipo de dispositivo del cliente
    await pool.query(`
      ALTER TABLE service_orders
      ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT NULL;
    `);
    console.log('✅ Columna device_type asegurada en service_orders');

    // Tabla de inventario de repuestos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla inventory lista en PostgreSQL');

    // Tabla pivote: repuestos usados en cada orden
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_parts (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
        inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
        quantity_used INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla order_parts lista en PostgreSQL');
  } catch (err) {
    console.error('❌ Error inicializando tablas en PostgreSQL:', err.message);
  }
};

initDb();

db.pool = pool;
module.exports = db;