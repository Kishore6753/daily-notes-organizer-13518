'use strict';

const Tags = require('../models/tags');

const TagsService = {
  // PUBLIC_INTERFACE
  /**
   * Create new tag
   */
  async create(data) {
    if (!data || typeof data.name !== 'string' || !data.name.trim()) {
      const err = new Error('Tag name is required');
      err.status = 400;
      throw err;
    }
    const payload = { name: data.name.trim() };
    if (data.color !== undefined) {
      if (data.color && !/^#?[0-9A-Fa-f]{6}$/.test(data.color)) {
        const err = new Error('Invalid color hex');
        err.status = 400;
        throw err;
      }
      payload.color = data.color ? (data.color.startsWith('#') ? data.color : `#${data.color}`) : null;
    }
    return Tags.create(payload);
  },

  // PUBLIC_INTERFACE
  async getById(id) {
    return Tags.getById(Number(id));
  },

  // PUBLIC_INTERFACE
  async list(query) {
    const { q } = query || {};
    return Tags.list({ q });
  },

  // PUBLIC_INTERFACE
  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        const err = new Error('Invalid tag name');
        err.status = 400;
        throw err;
      }
      payload.name = data.name.trim();
    }
    if (data.color !== undefined) {
      if (data.color && !/^#?[0-9A-Fa-f]{6}$/.test(data.color)) {
        const err = new Error('Invalid color hex');
        err.status = 400;
        throw err;
      }
      payload.color = data.color ? (data.color.startsWith('#') ? data.color : `#${data.color}`) : null;
    }
    return Tags.update(Number(id), payload);
  },

  // PUBLIC_INTERFACE
  async remove(id) {
    return Tags.remove(Number(id));
  },
};

module.exports = TagsService;
