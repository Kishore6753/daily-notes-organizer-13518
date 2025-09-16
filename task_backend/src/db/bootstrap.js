'use strict';

/**
 * Database bootstrap and health-check helper.
 * - Validates and logs required environment variables for MySQL connectivity.
 * - Ensures the schema exists (creates tables if not present).
 * - Provides a function to test connectivity.
 *
 * PUBLIC FUNCTIONS:
 *  - ensureDatabaseReady(): Promise<void>
 *  - checkConnection(): Promise<{ ok: boolean, error?: string }>
 *
 * IMPORTANT: All configuration must come from environment variables:
 * - MYSQL_URL or
 *   - MYSQL_HOST
 *   - MYSQL_PORT
 *   - MYSQL_USER
 *   - MYSQL_PASSWORD
 *   - MYSQL_DB (or MYSQL_DATABASE)
 */

const { pool, query } = require('./index');

/**
 * Validate presence of env variables and output helpful logs.
 * Does not throw, but returns a list of missing keys (empty if OK).
 */
function validateEnv() {
  const missing = [];
  // If MYSQL_URL is present, we don't strictly require individual parts
  if (!process.env.MYSQL_URL) {
    if (!process.env.MYSQL_HOST) missing.push('MYSQL_HOST');
    if (!process.env.MYSQL_PORT) missing.push('MYSQL_PORT');
    if (!process.env.MYSQL_USER) missing.push('MYSQL_USER');
    // MYSQL_PASSWORD can be empty on some setups but is commonly required; warn if absent
    if (process.env.MYSQL_PASSWORD === undefined) missing.push('MYSQL_PASSWORD');
    if (!process.env.MYSQL_DB && !process.env.MYSQL_DATABASE) missing.push('MYSQL_DB|MYSQL_DATABASE');
  }
  if (missing.length) {
    console.warn('[DB] Environment check: missing keys ->', missing.join(', '));
    console.warn('[DB] Set MYSQL_URL or discrete MYSQL_* variables. See task_backend/.env.example for guidance.');
  } else {
    console.log('[DB] Environment check: MySQL variables present (or MYSQL_URL provided).');
  }
  return missing;
}

/**
 * Check whether a table exists in the current database by querying INFORMATION_SCHEMA.
 * @param {string} tableName
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName) {
  const dbName = process.env.MYSQL_DB || process.env.MYSQL_DATABASE || (process.env.MYSQL_URL ? new URL(process.env.MYSQL_URL).pathname.replace(/^\//, '') : '');
  if (!dbName) return false;
  const sql = `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    LIMIT 1
  `;
  const { rows } = await query(sql, [dbName, tableName]);
  return rows.length > 0;
}

/**
 * Create the required tables if they don't already exist.
 * Tables:
 *  - users(id PK AI, name, email UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
 *  - tags(id PK AI, name UNIQUE, color NULLABLE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
 *  - notes(id PK AI, user_id FK users.id, title, content TEXT, status ENUM, priority ENUM, archived TINYINT(1) DEFAULT 0,
 *          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
 *  - note_tags(note_id, tag_id, PK(note_id, tag_id), FKs)
 */
async function ensureSchema() {
  // Create users
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create tags
  await query(`
    CREATE TABLE IF NOT EXISTS tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(16) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Credentials storage (separate table from users profile)
  await query(`
    CREATE TABLE IF NOT EXISTS users_auth (
      user_id INT NOT NULL PRIMARY KEY,
      password_hash TEXT NOT NULL,
      CONSTRAINT fk_users_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create notes
  // Use ENUMs aligned with services/notes.js ALLOWED_* values
  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
      priority ENUM('low', 'moderate', 'high') NOT NULL DEFAULT 'low',
      archived TINYINT(1) NOT NULL DEFAULT 0,
      -- Recurrence fields
      recurrence_pattern ENUM('none','daily','weekly','monthly') NOT NULL DEFAULT 'none',
      recurrence_start_date DATE NULL,
      recurrence_end_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // In case the table already existed without recurrence fields, attempt to add them idempotently.
  try {
    await query('ALTER TABLE notes ADD COLUMN recurrence_pattern ENUM(\'none\',\'daily\',\'weekly\',\'monthly\') NOT NULL DEFAULT \'none\'', []);
  } catch (e) {
    // ignore if already exists
  }
  try {
    await query('ALTER TABLE notes ADD COLUMN recurrence_start_date DATE NULL', []);
  } catch (e) {
    // ignore if already exists
  }
  try {
    await query('ALTER TABLE notes ADD COLUMN recurrence_end_date DATE NULL', []);
  } catch (e) {
    // ignore if already exists
  }

  // Create note_tags (junction)
  await query(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INT NOT NULL,
      tag_id INT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      CONSTRAINT fk_note_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/**
 * PUBLIC_INTERFACE
 * Ensure DB connection works and schema exists.
 */
async function ensureDatabaseReady() {
  const missing = validateEnv();
  if (missing.length) {
    console.warn(`[DB] Warning: Missing environment variables: ${missing.join(', ')}. If MYSQL_URL is set, this can be ignored.`);
  }

  // Attempt a simple connection by acquiring and releasing one connection
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }

  // Ensure schema exists (idempotent)
  await ensureSchema();

  // Optional: seed a default user so POST /notes can work without creating a user first
  // Only if there are no users.
  const { rows: userCountRows } = await query('SELECT COUNT(*) AS c FROM users');
  const userCount = userCountRows[0]?.c || 0;
  if (userCount === 0) {
    await query('INSERT INTO users (name, email) VALUES (?, ?)', ['Demo User', 'demo@example.com']);
  }
}

/**
 * PUBLIC_INTERFACE
 * Simple connectivity test for health checks.
 */
async function checkConnection() {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      // tiny query to ensure current database is selected and accessible
      await conn.query('SELECT 1+1 AS two');
    } finally {
      conn.release();
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

module.exports = {
  ensureDatabaseReady,
  checkConnection,
};
