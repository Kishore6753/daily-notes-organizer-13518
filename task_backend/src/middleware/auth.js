'use strict';

const jwt = require('jsonwebtoken');

/**
 * Authentication middleware using JWT Bearer tokens.
 * Reads Authorization: Bearer <token>, verifies with JWT_SECRET,
 * and attaches req.user = { id, email, name } from token payload.
 * Responds 401 on missing/invalid tokens.
 *
 * Environment:
 * - JWT_SECRET: secret for signing/verification (required)
 */
module.exports = function authMiddleware(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ status: 'error', message: 'Missing or invalid Authorization header' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ status: 'error', message: 'Server misconfiguration: JWT_SECRET is not set' });
    }
    const payload = jwt.verify(token, secret);
    // Minimal user info embedded in token
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};
