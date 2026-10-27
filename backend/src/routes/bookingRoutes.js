'use strict';

const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  listBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  approveBooking,
  rejectBooking,
  checkOut,
  returnAsset,
} = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  validate,
  bookingCreateSchema,
  bookingRescheduleSchema,
} = require('../validators');

// Student booking actions
router.post('/', authenticate, validate(bookingCreateSchema), createBooking);
router.get('/me', authenticate, getMyBookings);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/cancel', authenticate, cancelBooking);
router.patch('/:id/reschedule', authenticate, validate(bookingRescheduleSchema), rescheduleBooking);

// Manager / Admin operational controls
router.get('/', authenticate, requireRole('manager', 'admin'), listBookings);
router.patch('/:id/approve', authenticate, requireRole('manager', 'admin'), approveBooking);
router.patch('/:id/reject', authenticate, requireRole('manager', 'admin'), rejectBooking);
router.post('/:id/check-out', authenticate, requireRole('manager', 'admin'), checkOut);
router.post('/:id/return', authenticate, requireRole('manager', 'admin'), returnAsset);

module.exports = router;
