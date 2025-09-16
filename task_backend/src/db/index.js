'use strict';

/**
 * Database connection and query helper using mysql2/promise.
 * Uses environment variables for configuration.
 *
 * Required environment variables:
 * - MYSQL_URL or individual MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Build configuration from either MYSQL_URL or individual parts.
// Prefer MYSQL_URL if provided (e.g., mysql://user:pass@host:port/dbname)
function buildConfigFromEnv() {
  if (process.env.MYSQL_URL) {
    try {
      const url = new URL(process.env.MYSQL_URL);
      return {
        host: url.hostname,
        port: Number(url.port || process.env.MYSQL_PORT || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
        waitForConnections: true,
        connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
        queueLimit: 0,
      };
    } catch (e) {
      // Fallback to parts if URL parsing fails
      console.warn('Invalid MYSQL_URL, falling back to discrete env vars. Error:', e.message);
    }
  }

  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || process.env.MYSQL_DATABASE || 'notes_app',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    queueLimit: 0,
  };
}

const pool = mysql.createPool({
  ...buildConfigFromEnv(),
  // Guardrails: enable connectTimeout if provided (ms)
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 10000),
});

/**
 * Executes a query with parameters using the pool. Wraps errors and logs details in development.
 * @param {string} sql - The SQL query
 * @param {Array<any>} params - Query parameters
 * @returns {Promise<{rows: any[], fields: any[]}>}
 */
async function query(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [rows, fields] = await conn.query(sql, params);
    return { rows, fields };
  } catch (err) {
    if ((process.env.NODE_ENV || 'development') === 'development') {
      console.error('DB QUERY ERROR:', { sql, params, message: err.message });
    }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Helper to run a transactional set of operations
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} handler
 * @returns {Promise<any>}
 */
async function transaction(handler) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
};
