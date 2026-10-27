'use strict';

/**
 * Centralized error handler. Must be registered LAST in Express.
 * Returns a consistent JSON error format and never leaks stack traces in production.
 */
const errorHandler = (err, req, res, _next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const message =
      field === 'email'
        ? 'Email address is already registered'
        : field === 'studentId'
        ? 'Student ID is already in use'
        : field === 'idempotencyKey'
        ? 'Duplicate request detected'
        : `Duplicate value for ${field}`;
    return res.status(409).json({ success: false, message, field });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // Custom app errors with status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // JWT errors (should be handled in middleware, fallback here)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Unknown error
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[Error]', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

/**
 * Simple application error factory.
 */
const createError = (message, statusCode = 400, errors = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
};

module.exports = { errorHandler, createError };
