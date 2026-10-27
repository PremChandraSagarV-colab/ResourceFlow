'use strict';

const User = require('../models/User');
const {
  signAccessToken,
  signRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  hashRefreshToken,
  verifyRefreshToken,
} = require('../services/tokenService');

/**
 * POST /api/auth/register
 * Public. Role defaults to 'student' – client cannot override.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, studentId, department, year } = req.body;

    // Hash password
    const passwordHash = await User.hashPassword(password);

    const userData = {
      name,
      email,
      passwordHash,
      department,
      year,
      role: 'student', // always student at public registration
    };
    if (studentId && studentId.trim()) {
      userData.studentId = studentId.trim().toUpperCase();
    }

    const user = await User.create(userData);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store refresh token hash for revocation tracking
    user.refreshTokenHash = await hashRefreshToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: user.toSafeObject(), accessToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmailForAuth(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshTokenHash = await hashRefreshToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: user.toSafeObject(), accessToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Invalidate refresh token in DB
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { $unset: { refreshTokenHash: 1 } });
    }
    clearTokenCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = (req, res) => {
  return res.status(200).json({ success: true, data: { user: req.user.toSafeObject() } });
};

/**
 * POST /api/auth/refresh
 * Rotate refresh token.
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !user.isActive || !user.refreshTokenHash) {
      clearTokenCookies(res);
      return res.status(401).json({ success: false, message: 'Session invalidated' });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshTokenHash = await hashRefreshToken(newRefreshToken);
    await user.save();

    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, user: user.toSafeObject() },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe, refreshToken };
