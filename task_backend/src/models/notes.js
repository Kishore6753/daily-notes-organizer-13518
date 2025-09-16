'use strict';

const { query, transaction } = require('../db');

/**
 * Notes model with note_tags join table handling.
 * Schema:
 * notes(id PK AI, user_id FK users.id, title, content TEXT, status ENUM, priority ENUM, created_at, updated_at, archived TINYINT)
 * note_tags(note_id FK notes.id, tag_id FK tags.id, PK(note_id, tag_id))
 */

async function attachTags(note) {
  if (!note) return note;
  const { rows: tags } = await query(
    `SELECT t.id, t.name, t.color
     FROM note_tags nt
     JOIN tags t ON t.id = nt.tag_id
     WHERE nt.note_id = ?`,
    [note.id]
  );
  return { ...note, tags };
}

const NotesModel = {
  // PUBLIC_INTERFACE
  /**
   * Create note and optional tag relations.
   * @param {{user_id: number, title: string, content?: string, status?: string, priority?: string, tags?: number[]}} data
   */
  async create(data) {
    return transaction(async (conn) => {
      const [result] = await conn.query(
        `INSERT INTO notes (user_id, title, content, status, priority)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.user_id,
          data.title,
          data.content || '',
          data.status || 'not_started',
          data.priority || 'low',
        ]
      );
      const noteId = result.insertId;

      if (Array.isArray(data.tags) && data.tags.length > 0) {
        const values = data.tags.map((tagId) => [noteId, tagId]);
        await conn.query('INSERT IGNORE INTO note_tags (note_id, tag_id) VALUES ?', [values]);
      }

      const [rows] = await conn.query(
        `SELECT id, user_id, title, content, status, priority, archived, created_at, updated_at
         FROM notes WHERE id = ?`,
        [noteId]
      );
      return attachTags(rows[0]);
    });
  },

  // PUBLIC_INTERFACE
  /**
   * Get note by id (with tags)
   * @param {number} id
   */
  async getById(id) {
    const { rows } = await query(
      `SELECT id, user_id, title, content, status, priority, archived, created_at, updated_at
       FROM notes WHERE id = ?`,
      [id]
    );
    const note = rows[0] || null;
    return attachTags(note);
  },

  // PUBLIC_INTERFACE
  /**
   * List notes with filters and pagination
   * @param {{user_id?: number, tag_ids?: number[], q?: string, status?: string, priority?: string, archived?: boolean, page?: number, pageSize?: number}} opts
   */
  async list(opts = {}) {
    const page = Math.max(1, Number(opts.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];

    if (opts.user_id) {
      where.push('n.user_id = ?');
      params.push(opts.user_id);
    }
    if (opts.archived !== undefined) {
      where.push('n.archived = ?');
      params.push(opts.archived ? 1 : 0);
    }
    if (opts.status) {
      where.push('n.status = ?');
      params.push(opts.status);
    }
    if (opts.priority) {
      where.push('n.priority = ?');
      params.push(opts.priority);
    }
    if (opts.q) {
      where.push('(n.title LIKE ? OR n.content LIKE ?)');
      params.push(`%${opts.q}%`, `%${opts.q}%`);
    }

    // If tag filter provided, join note_tags and ensure all tag_ids match (AND semantics)
    let join = '';
    if (opts.tag_ids && opts.tag_ids.length > 0) {
      const tagCount = opts.tag_ids.length;
      join = `
        JOIN (
          SELECT nt.note_id
          FROM note_tags nt
          WHERE nt.tag_id IN (${opts.tag_ids.map(() => '?').join(',')})
          GROUP BY nt.note_id
          HAVING COUNT(DISTINCT nt.tag_id) = ?
        ) tag_filter ON tag_filter.note_id = n.id
      `;
      params.push(...opts.tag_ids, tagCount);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Sorting: allow sortBy=priority|updated_at|created_at and sortDir=asc|desc
    const allowedSortBy = new Set(['priority', 'updated_at', 'created_at']);
    const sortBy = allowedSortBy.has(opts.sortBy) ? opts.sortBy : 'updated_at';
    const sortDir = String(opts.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Priority ordering: enforce explicit order high > moderate > low when sorting by priority
    const orderClause =
      sortBy === 'priority'
        ? `ORDER BY FIELD(n.priority, 'high','moderate','low') ${sortDir}, n.updated_at DESC, n.created_at DESC`
        : `ORDER BY n.${sortBy} ${sortDir}, n.created_at DESC`;

    const sql = `
      SELECT n.id, n.user_id, n.title, n.content, n.status, n.priority, n.archived, n.created_at, n.updated_at
      FROM notes n
      ${join}
      ${whereSql}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    const { rows } = await query(sql, [...params, pageSize, offset]);

    // Attach tags for each note
    const noteIds = rows.map((r) => r.id);
    if (noteIds.length === 0) return [];

    const { rows: tagRows } = await query(
      `SELECT nt.note_id, t.id, t.name, t.color
       FROM note_tags nt
       JOIN tags t ON t.id = nt.tag_id
       WHERE nt.note_id IN (${noteIds.map(() => '?').join(',')})`,
      noteIds
    );

    const tagMap = new Map();
    tagRows.forEach((tr) => {
      if (!tagMap.has(tr.note_id)) tagMap.set(tr.note_id, []);
      tagMap.get(tr.note_id).push({ id: tr.id, name: tr.name, color: tr.color });
    });

    return rows.map((n) => ({ ...n, tags: tagMap.get(n.id) || [] }));
  },

  // PUBLIC_INTERFACE
  /**
   * Update note with partial fields and tag replacement if provided.
   * @param {number} id
   * @param {{title?: string, content?: string, status?: string, priority?: string, archived?: boolean, tags?: number[]}} data
   */
  async update(id, data) {
    return transaction(async (conn) => {
      const fields = [];
      const params = [];

      if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
      if (data.content !== undefined) { fields.push('content = ?'); params.push(data.content); }
      if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
      if (data.priority !== undefined) { fields.push('priority = ?'); params.push(data.priority); }
      if (data.archived !== undefined) { fields.push('archived = ?'); params.push(data.archived ? 1 : 0); }

      if (fields.length) {
        await conn.query(`UPDATE notes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, [...params, id]);
      }

      if (Array.isArray(data.tags)) {
        await conn.query('DELETE FROM note_tags WHERE note_id = ?', [id]);
        if (data.tags.length) {
          const values = data.tags.map((tagId) => [id, tagId]);
          await conn.query('INSERT IGNORE INTO note_tags (note_id, tag_id) VALUES ?', [values]);
        }
      }

      const [rows] = await conn.query(
        `SELECT id, user_id, title, content, status, priority, archived, created_at, updated_at
         FROM notes WHERE id = ?`,
        [id]
      );
      const note = rows[0] || null;
      if (!note) return null;
      const [tagRows] = await conn.query(
        `SELECT t.id, t.name, t.color
         FROM note_tags nt
         JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id = ?`,
        [id]
      );
      return { ...note, tags: tagRows };
    });
  },

  // PUBLIC_INTERFACE
  /**
   * Delete note by id
   * @param {number} id
   */
  async remove(id) {
    await query('DELETE FROM notes WHERE id = ?', [id]);
    return { success: true };
  },
};

module.exports = NotesModel;
