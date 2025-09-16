'use strict';

const Notes = require('../models/notes');

const ALLOWED_STATUS = new Set(['not_started', 'in_progress', 'completed']);
const ALLOWED_PRIORITY = new Set(['low', 'moderate', 'high']);

function ensureEnum(value, allowed, fieldName) {
  if (value === undefined) return undefined;
  if (!allowed.has(value)) {
    const err = new Error(`Invalid ${fieldName}. Allowed: ${Array.from(allowed).join(', ')}`);
    err.status = 400;
    throw err;
  }
  return value;
}

const NotesService = {
  // PUBLIC_INTERFACE
  async create(data) {
    if (!data || typeof data.user_id !== 'number') {
      const err = new Error('user_id is required');
      err.status = 400;
      throw err;
    }
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      const err = new Error('title is required');
      err.status = 400;
      throw err;
    }
    const payload = {
      user_id: data.user_id,
      title: data.title.trim(),
      content: typeof data.content === 'string' ? data.content : '',
      status: ensureEnum(data.status || 'not_started', ALLOWED_STATUS, 'status'),
      priority: ensureEnum(data.priority || 'low', ALLOWED_PRIORITY, 'priority'),
      tags: Array.isArray(data.tags) ? data.tags.map((t) => Number(t)).filter(Number.isFinite) : [],
    };
    return Notes.create(payload);
  },

  // PUBLIC_INTERFACE
  async getById(id) {
    return Notes.getById(Number(id));
  },

  // PUBLIC_INTERFACE
  async list(query) {
    const opts = {};
    if (query.user_id) opts.user_id = Number(query.user_id);
    if (query.archived !== undefined) {
      const v = String(query.archived);
      opts.archived = v === 'true' || v === '1';
    }
    if (query.status) opts.status = ensureEnum(query.status, ALLOWED_STATUS, 'status');
    if (query.priority) opts.priority = ensureEnum(query.priority, ALLOWED_PRIORITY, 'priority');
    if (query.q) opts.q = String(query.q);
    if (query.tag_ids) {
      const arr = Array.isArray(query.tag_ids) ? query.tag_ids : String(query.tag_ids).split(',');
      opts.tag_ids = arr.map((x) => Number(x)).filter(Number.isFinite);
    }
    if (query.page) opts.page = Number(query.page);
    if (query.pageSize) opts.pageSize = Number(query.pageSize);

    // Sorting by priority/updated_at/created_at and direction
    if (query.sortBy) {
      const sortBy = String(query.sortBy);
      if (!['priority', 'updated_at', 'created_at'].includes(sortBy)) {
        const err = new Error('Invalid sortBy. Allowed: priority, updated_at, created_at');
        err.status = 400;
        throw err;
      }
      opts.sortBy = sortBy;
    }
    if (query.sortDir) {
      const dir = String(query.sortDir).toUpperCase();
      if (!['ASC', 'DESC'].includes(dir)) {
        const err = new Error('Invalid sortDir. Allowed: ASC, DESC');
        err.status = 400;
        throw err;
      }
      opts.sortDir = dir;
    }

    return Notes.list(opts);
  },

  // PUBLIC_INTERFACE
  async update(id, data) {
    const payload = {};
    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        const err = new Error('Invalid title');
        err.status = 400;
        throw err;
      }
      payload.title = data.title.trim();
    }
    if (data.content !== undefined) payload.content = String(data.content || '');
    if (data.status !== undefined) payload.status = ensureEnum(data.status, ALLOWED_STATUS, 'status');
    if (data.priority !== undefined) payload.priority = ensureEnum(data.priority, ALLOWED_PRIORITY, 'priority');
    if (data.archived !== undefined) payload.archived = !!data.archived;
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        const err = new Error('tags must be an array of tag IDs');
        err.status = 400;
        throw err;
      }
      payload.tags = data.tags.map((t) => Number(t)).filter(Number.isFinite);
    }
    return Notes.update(Number(id), payload);
  },

  // PUBLIC_INTERFACE
  async remove(id) {
    return Notes.remove(Number(id));
  },
};

module.exports = NotesService;
