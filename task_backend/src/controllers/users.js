'use strict';

const UsersService = require('../services/users');

class UsersController {
  // PUBLIC_INTERFACE
  /**
   * Get list of users
   */
  async list(req, res, next) {
    try {
      const users = await UsersService.list(req.query);
      res.json(users);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Create user
   */
  async create(req, res, next) {
    try {
      const user = await UsersService.create(req.body);
      res.status(201).json(user);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Get user by ID
   */
  async get(req, res, next) {
    try {
      const user = await UsersService.getById(Number(req.params.id));
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Update user
   */
  async update(req, res, next) {
    try {
      const user = await UsersService.update(Number(req.params.id), req.body);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete user
   */
  async remove(req, res, next) {
    try {
      const result = await UsersService.remove(Number(req.params.id));
      res.json(result);
    } catch (e) { next(e); }
  }
}

module.exports = new UsersController();
