'use strict';

const { query } = require('../db');

/**
 * Tags model.
 * Schema:
 * tags(id PK AI, name UNIQUE, color NULLABLE, created_at)
 */
const TagsModel = {
  // PUBLIC_INTERFACE
  /**
   * Create a tag
   * @param {{name: string, color?: string}} data
   */
  async create(data) {
    const sql = 'INSERT INTO tags (name, color) VALUES (?, ?)';
    const { rows } = await query(sql, [data.name, data.color || null]);
    return { id: rows.insertId, ...data };
  },

  // PUBLIC_INTERFACE
  /**
   * Get tag by id
   * @param {number} id
   */
  async getById(id) {
    const { rows } = await query('SELECT id, name, color, created_at FROM tags WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // PUBLIC_INTERFACE
  /**
   * List tags
   * @param {{q?: string}} opts
   */
  async list(opts = {}) {
    const params = [];
    let where = '';
    if (opts.q) {
      where = 'WHERE name LIKE ?';
      params.push(`%${opts.q}%`);
    }
    const { rows } = await query(`SELECT id, name, color, created_at FROM tags ${where} ORDER BY name ASC`, params);
    return rows;
  },

  // PUBLIC_INTERFACE
  /**
   * Update tag
   * @param {number} id
   * @param {{name?: string, color?: string}} data
   */
  async update(id, data) {
    const fields = [];
    const params = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      params.push(data.color);
    }
    if (!fields.length) return this.getById(id);

    params.push(id);
    await query(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.getById(id);
  },

  // PUBLIC_INTERFACE
  /**
   * Delete tag
   * @param {number} id
   */
  async remove(id) {
    await query('DELETE FROM tags WHERE id = ?', [id]);
    return { success: true };
  },
};

module.exports = TagsModel;
