'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAME_SITE || 'Lax',
  secure: process.env.COOKIE_SECURE === 'true',
};

/**
 * Sign a short-lived access token.
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

/**
 * Sign a refresh token.
 */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * Set access and refresh tokens as HttpOnly cookies.
 */
function setTokenCookies(res, accessToken, refreshToken) {
  // Access token cookie – short lived
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...COOKIE_OPTS_BASE,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  // Refresh token cookie – longer lived
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...COOKIE_OPTS_BASE,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh', // restrict refresh cookie path
    });
  }
}

/**
 * Clear auth cookies on logout.
 */
function clearTokenCookies(res) {
  res.clearCookie(ACCESS_COOKIE, COOKIE_OPTS_BASE);
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS_BASE, path: '/api/auth/refresh' });
}

/**
 * Hash a refresh token for safe storage in DB.
 */
async function hashRefreshToken(token) {
  return bcrypt.hash(token, 10);
}

/**
 * Verify a refresh token and return the payload.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  hashRefreshToken,
  verifyRefreshToken,
};
