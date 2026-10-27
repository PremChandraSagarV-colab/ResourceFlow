'use strict';

const express = require('express');
const router = express.Router();
const {
  listResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getAvailability,
} = require('../controllers/resourceController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, resourceCreateSchema, resourceUpdateSchema } = require('../validators');

// Public listing & details (active status default for public, full view for managers/admins)
router.get('/', (req, res, next) => {
  // Optional auth check to let manager/admin view inactive resources if token present
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;
  if (authHeader || cookieToken) {
    return authenticate(req, res, () => listResources(req, res, next));
  }
  return listResources(req, res, next);
});

router.get('/:id', getResourceById);
router.get('/:id/availability', getAvailability);

// Manager/Admin protected mutations
router.post('/', authenticate, requireRole('manager', 'admin'), validate(resourceCreateSchema), createResource);
router.patch('/:id', authenticate, requireRole('manager', 'admin'), validate(resourceUpdateSchema), updateResource);
router.delete('/:id', authenticate, requireRole('manager', 'admin'), deleteResource);

module.exports = router;
