'use strict';

const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  listUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, selfUpdateSchema, adminUserUpdateSchema, paginationSchema } = require('../validators');

// Student profile self-service
router.get('/me', authenticate, getMyProfile);
router.patch('/me', authenticate, validate(selfUpdateSchema), updateMyProfile);

// Admin user management
router.get('/', authenticate, requireRole('admin'), validate(paginationSchema, 'query'), listUsers);
router.get('/:id', authenticate, getUserById);
router.patch('/:id/status', authenticate, requireRole('admin'), updateUserStatus);
router.patch('/:id/role', authenticate, requireRole('admin'), updateUserRole);

module.exports = router;
