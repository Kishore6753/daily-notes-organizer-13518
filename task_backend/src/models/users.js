'use strict';

const { query } = require('../db');

/**
 * Users model with basic CRUD operations.
 * Schema assumed from provided DB step:
 * users(id PK AI, name, email UNIQUE, created_at TIMESTAMP DEFAULT NOW)
 */
const UsersModel = {
  // PUBLIC_INTERFACE
  /**
   * Create a user.
   * @param {{name: string, email: string}} data
   */
  async create(data) {
    const sql = `
      INSERT INTO users (name, email)
      VALUES (?, ?)
    `;
    const { rows } = await query(sql, [data.name, data.email]);
    return { id: rows.insertId, ...data };
  },

  // PUBLIC_INTERFACE
  /**
   * Get user by id
   * @param {number} id
   */
  async getById(id) {
    const { rows } = await query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // PUBLIC_INTERFACE
  /**
   * Get user by email
   * @param {string} email
   */
  async getByEmail(email) {
    const { rows } = await query('SELECT id, name, email, created_at FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  // PUBLIC_INTERFACE
  /**
   * List users with pagination
   * @param {{page?: number, pageSize?: number, q?: string}} opts
   */
  async list(opts = {}) {
    const page = Math.max(1, Number(opts.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    let where = '';
    const params = [];
    if (opts.q) {
      where = 'WHERE name LIKE ? OR email LIKE ?';
      params.push(`%${opts.q}%`, `%${opts.q}%`);
    }

    const { rows } = await query(
      `SELECT id, name, email, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return rows;
  },

  // PUBLIC_INTERFACE
  /**
   * Update user
   * @param {number} id
   * @param {{name?: string, email?: string}} data
   */
  async update(id, data) {
    const fields = [];
    const params = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      params.push(data.email);
    }
    if (!fields.length) return this.getById(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    await query(sql, params);
    return this.getById(id);
  },

  // PUBLIC_INTERFACE
  /**
   * Delete user
   * @param {number} id
   */
  async remove(id) {
    await query('DELETE FROM users WHERE id = ?', [id]);
    return { success: true };
  },
};

module.exports = UsersModel;
