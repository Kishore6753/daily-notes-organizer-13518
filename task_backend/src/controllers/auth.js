'use strict';

const AuthService = require('../services/auth');

class AuthController {
  // PUBLIC_INTERFACE
  /**
   * Handle user signup: expects { name, email, password }
   */
  async signup(req, res, next) {
    try {
      const user = await AuthService.signup(req.body || {});
      return res.status(201).json(user);
    } catch (e) { return next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Handle user login: expects { email, password }, returns JWT token
   */
  async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body || {});
      return res.status(200).json(result);
    } catch (e) { return next(e); }
  }
}

module.exports = new AuthController();
