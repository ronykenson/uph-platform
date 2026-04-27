// ============================================================
//  config/db.js  —  MySQL Database Connection
//  Uses mysql2 with a connection pool for better performance.
//  A pool keeps several connections open and reuses them,
//  which is much faster than opening a new one every request.
// ============================================================

const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'uph_database',

  // Pool settings
  waitForConnections: true,   // queue requests when pool is full
  connectionLimit:    10,     // max 10 simultaneous connections
  queueLimit:         0       // unlimited queue (0 = no limit)
});

// Wrap the pool in a promise interface so we can use async/await
const db = pool.promise();

// Test the connection once at startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return;
  }
  console.log('✅ MySQL connected successfully!');
  connection.release(); // always release the connection back to the pool
});

module.exports = db;