'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate request from HttpOnly cookie or Authorization Bearer header.
 * Populates req.user with safe user document.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Prefer HttpOnly cookie
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Fall back to Authorization header (useful for API testing tools)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require one or more roles. Must be used AFTER authenticate.
 * @param {...string} roles
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

/**
 * Allow access if the authenticated user owns the resource OR has the given roles.
 * Expects req.params.id to be the target user ID.
 */
const requireSelfOrRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const targetId = req.params.id;
  if (req.user._id.toString() === targetId || roles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Insufficient permissions' });
};

module.exports = { authenticate, requireRole, requireSelfOrRole };
