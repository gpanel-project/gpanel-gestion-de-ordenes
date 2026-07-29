const mysql = require('mysql2');
require('dotenv').config();

// Creamos el "pool" de conexiones
// Un pool reutiliza conexiones en lugar de abrir una nueva cada vez
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }  // Railway lo requiere
});

// Convertimos el pool a promesas (para usar async/await)
const db = pool.promise();

module.exports = db;