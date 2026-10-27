'use strict';

const express = require('express');
const router = express.Router();
const {
  createMaintenance,
  listMaintenance,
} = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, maintenanceCreateSchema } = require('../validators');

router.get('/', authenticate, requireRole('manager', 'admin'), listMaintenance);
router.post(
  '/',
  authenticate,
  requireRole('manager', 'admin'),
  validate(maintenanceCreateSchema),
  createMaintenance
);

module.exports = router;
