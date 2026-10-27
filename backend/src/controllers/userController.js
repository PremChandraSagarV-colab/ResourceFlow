'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

// Fields a student may update about themselves
const STUDENT_EDITABLE_FIELDS = ['name', 'department', 'year'];

/**
 * GET /api/users/me  (alias: see also GET /api/auth/me)
 */
const getMyProfile = (req, res) => {
  return res.status(200).json({ success: true, data: { user: req.user.toSafeObject() } });
};

/**
 * PATCH /api/users/me
 * Students can only update STUDENT_EDITABLE_FIELDS.
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const allowedUpdates = {};
    for (const key of STUDENT_EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) allowedUpdates[key] = req.body[key];
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: allowedUpdates },
      { returnDocument: 'after', runValidators: true }
    );

    return res.status(200).json({ success: true, data: { user: updatedUser.toSafeObject() } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users
 * Admin only. Paginated, searchable, filterable.
 */
const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, department, year, role, isActive } = req.query;

    const filter = {};

    // Text search across name, email, studentId
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { studentId: regex }];
    }
    if (department) filter.department = department;
    if (year) filter.year = parseInt(year, 10);
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => u.toSafeObject()),
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Admin or the user themselves.
 */
const getUserById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid user ID', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(createError('User not found', 404));

    // Students can only view their own profile
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
      return next(createError('Insufficient permissions', 403));
    }

    return res.status(200).json({ success: true, data: { user: user.toSafeObject() } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/status
 * Admin only. Deactivate or reactivate a user.
 * Prevents deactivating the last active admin.
 */
const updateUserStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid user ID', 400));
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return next(createError('isActive must be a boolean', 400));
    }

    const target = await User.findById(req.params.id);
    if (!target) return next(createError('User not found', 404));

    // Cannot deactivate yourself
    if (req.user._id.toString() === req.params.id && !isActive) {
      return next(createError('You cannot deactivate your own account', 400));
    }

    // Prevent removing the last active admin
    if (!isActive && target.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return next(createError('Cannot deactivate the last active administrator', 400));
      }
    }

    target.isActive = isActive;
    await target.save();

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: target.toSafeObject() },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/role
 * Admin only. Update a user's role with privilege escalation protection.
 */
const updateUserRole = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid user ID', 400));
    }

    const { role } = req.body;
    if (!User.ROLES.includes(role)) {
      return next(createError(`Role must be one of: ${User.ROLES.join(', ')}`, 400));
    }

    const target = await User.findById(req.params.id);
    if (!target) return next(createError('User not found', 404));

    // Prevent demoting the last active admin
    if (target.role === 'admin' && role !== 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return next(createError('Cannot change role of the last active administrator', 400));
      }
    }

    target.role = role;
    await target.save();

    return res.status(200).json({
      success: true,
      message: 'User role updated',
      data: { user: target.toSafeObject() },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  listUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
};
