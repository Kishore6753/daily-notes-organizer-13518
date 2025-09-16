'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/users');

/**
 * AuthService encapsulates password hashing, user creation with credentials,
 * and JWT token issuance and verification.
 */
const AuthService = {
  // PUBLIC_INTERFACE
  /**
   * Sign up a new user with name, email, and password.
   * - Validates email and password strength minimally.
   * - Stores password hash in users_auth table.
   * - Returns { id, name, email } (no password).
   */
  async signup({ name, email, password }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Invalid name');
      err.status = 400;
      throw err;
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('Invalid email');
      err.status = 400;
      throw err;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.status = 400;
      throw err;
    }

    // Check existing user by email
    const existing = await UsersModel.getByEmailInternal(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }

    // Create user
    const user = await UsersModel.create({ name: name.trim(), email: email.trim() });

    // Store hash
    const hash = await bcrypt.hash(password, 10);
    await UsersModel.setPasswordHash(user.id, hash);

    return { id: user.id, name: user.name, email: user.email };
  },

  // PUBLIC_INTERFACE
  /**
   * Login with email and password.
   * On success returns { token, user: { id, name, email } }
   */
  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }
    const user = await UsersModel.getByEmailInternal(email);
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    const hash = await UsersModel.getPasswordHash(user.id);
    if (!hash) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    if (!secret) {
      const err = new Error('Server misconfiguration: JWT_SECRET missing');
      err.status = 500;
      throw err;
    }
    const payload = {
      sub: String(user.id),
      email: user.email,
      name: user.name,
    };
    const token = jwt.sign(payload, secret, { expiresIn });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  },
};

module.exports = AuthService;
