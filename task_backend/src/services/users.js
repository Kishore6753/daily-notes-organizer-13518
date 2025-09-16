'use strict';

const Users = require('../models/users');

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const UsersService = {
  // PUBLIC_INTERFACE
  /**
   * Create a new user with basic validation.
   */
  async create(data) {
    if (!data || typeof data.name !== 'string' || !data.name.trim()) {
      const err = new Error('Invalid name');
      err.status = 400;
      throw err;
    }
    if (!validateEmail(data.email)) {
      const err = new Error('Invalid email');
      err.status = 400;
      throw err;
    }
    return Users.create({ name: data.name.trim(), email: data.email.trim() });
  },

  // PUBLIC_INTERFACE
  async getById(id) {
    return Users.getById(Number(id));
  },

  // PUBLIC_INTERFACE
  async list(query) {
    const { page, pageSize, q } = query || {};
    return Users.list({ page, pageSize, q });
  },

  // PUBLIC_INTERFACE
  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        const err = new Error('Invalid name');
        err.status = 400;
        throw err;
      }
      payload.name = data.name.trim();
    }
    if (data.email !== undefined) {
      if (!validateEmail(data.email)) {
        const err = new Error('Invalid email');
        err.status = 400;
        throw err;
      }
      payload.email = data.email.trim();
    }
    return Users.update(Number(id), payload);
  },

  // PUBLIC_INTERFACE
  async remove(id) {
    return Users.remove(Number(id));
  },
};

module.exports = UsersService;
