/**
 * config/database.js — Configuration de la connexion MySQL
 * Gère le pool de connexions avec reconnexion automatique
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

// Création du pool de connexions / Connection pool creation
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT) || 3306,
  database:        process.env.DB_NAME     || 'quincaillerie_db',
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,      // Max 10 connexions simultanées
  queueLimit:         0,       // File d'attente illimitée
  charset:            'utf8mb4',
  timezone:           '+00:00',
});

/**
 * Tester la connexion à la base de données
 * Test database connection
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅  Connexion MySQL établie / MySQL connection established');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌  Erreur connexion MySQL / MySQL connection error:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
