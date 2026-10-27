'use strict';

const mongoose = require('mongoose');

/**
 * Booking status lifecycle:
 *   pending  → confirmed | rejected | cancelled
 *   confirmed → cancelled | completed
 *   rejected  → (terminal)
 *   cancelled → (terminal)
 *   completed → (terminal)
 *
 * BLOCKING statuses (prevent overlapping bookings): pending, confirmed
 */
const STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];
const BLOCKING_STATUSES = ['pending', 'confirmed'];

const bookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    startAt: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End time is required'],
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      minlength: [5, 'Purpose too short'],
      maxlength: [500, 'Purpose too long'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid booking status' },
      default: 'pending',
    },
    // Approval metadata
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    // Cancellation metadata
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 500 },
    // Idempotency key for safe retries
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    // Lock reference (used by concurrency control service)
    lockId: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Validate startAt < endAt
bookingSchema.pre('validate', function () {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    this.invalidate('endAt', 'End time must be after start time');
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary conflict-detection index
bookingSchema.index({ resource: 1, status: 1, startAt: 1, endAt: 1 }, { name: 'booking_conflict' });
// User booking history
bookingSchema.index({ user: 1, createdAt: -1 });
// Status queries
bookingSchema.index({ status: 1, createdAt: -1 });
// Idempotency
bookingSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true, name: 'booking_idempotency' });

bookingSchema.statics.STATUSES = STATUSES;
bookingSchema.statics.BLOCKING_STATUSES = BLOCKING_STATUSES;

/**
 * Check if a time range overlaps any blocking booking for a resource.
 * Boundary bookings are allowed: a booking ending at T may be followed by one starting at T.
 * @param {ObjectId} resourceId
 * @param {Date} startAt
 * @param {Date} endAt
 * @param {ObjectId|null} excludeBookingId  – exclude this booking (for rescheduling)
 */
bookingSchema.statics.findConflicting = function (resourceId, startAt, endAt, excludeBookingId = null) {
  const query = {
    resource: resourceId,
    status: { $in: BLOCKING_STATUSES },
    startAt: { $lt: endAt },   // existing starts before new ends
    endAt: { $gt: startAt },   // existing ends after new starts
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  return this.find(query);
};

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
