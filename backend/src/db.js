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

db.pool = pool;
module.exports = db;