'use strict';

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const AssetTransaction = require('../models/AssetTransaction');
const { withResourceLock } = require('../services/bookingLockService');
const { createError } = require('../middleware/errorHandler');

// ── Helper ────────────────────────────────────────────────────────────────────

function parseDates(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createError('Invalid date format', 400);
  }
  if (start >= end) throw createError('startAt must be before endAt', 400);
  if (start < new Date()) throw createError('Cannot book in the past', 400);
  return { start, end };
}

async function assertNoConflicts(resourceId, start, end, excludeBookingId = null) {
  const [bookingConflicts, maintenanceConflicts] = await Promise.all([
    Booking.findConflicting(resourceId, start, end, excludeBookingId),
    MaintenanceRecord.findConflicting(resourceId, start, end),
  ]);

  if (maintenanceConflicts.length > 0) {
    throw createError('Resource is under maintenance during the requested time', 409);
  }
  if (bookingConflicts.length > 0) {
    throw createError('Time slot is already booked', 409);
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Concurrency-safe booking creation using per-resource lock.
 */
const createBooking = async (req, res, next) => {
  try {
    const { resourceId, startAt, endAt, purpose, idempotencyKey } = req.body;

    // Idempotency: return existing booking if key already used
    if (idempotencyKey) {
      const existing = await Booking.findOne({ idempotencyKey }).populate('resource user');
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Booking already exists (idempotent)',
          data: { booking: existing },
        });
      }
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return next(createError('Invalid resource ID', 400));
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) return next(createError('Resource not found', 404));
    if (resource.status !== 'active') {
      return next(createError('Resource is not available for booking', 400));
    }

    const { start, end } = parseDates(startAt, endAt);

    // Policy validation
    const policy = resource.bookingPolicy;
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours < policy.minDurationHours) {
      return next(createError(`Minimum booking duration is ${policy.minDurationHours} hours`, 400));
    }
    if (durationHours > policy.maxDurationHours) {
      return next(createError(`Maximum booking duration is ${policy.maxDurationHours} hours`, 400));
    }

    const advanceHours = (start - Date.now()) / (1000 * 60 * 60);
    if (advanceHours < policy.minAdvanceBookingHours) {
      return next(createError(`Must book at least ${policy.minAdvanceBookingHours} hour(s) in advance`, 400));
    }
    const advanceDays = advanceHours / 24;
    if (advanceDays > policy.maxAdvanceBookingDays) {
      return next(createError(`Cannot book more than ${policy.maxAdvanceBookingDays} days in advance`, 400));
    }

    // Concurrency-safe booking creation
    const booking = await withResourceLock(resourceId, async () => {
      // Re-check conflicts under the lock
      await assertNoConflicts(resourceId, start, end);

      const status = resource.approvalRequired ? 'pending' : 'confirmed';
      return Booking.create({
        resource: resourceId,
        user: req.user._id,
        startAt: start,
        endAt: end,
        purpose,
        status,
        ...(idempotencyKey && { idempotencyKey }),
      });
    });

    const populated = await booking.populate('resource user');
    return res.status(201).json({
      success: true,
      message: resource.approvalRequired ? 'Booking submitted for approval' : 'Booking confirmed',
      data: { booking: populated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/me
 */
const getMyBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('resource', 'name category location')
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings  (manager/admin)
 */
const listBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, resourceId, userId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (resourceId && mongoose.Types.ObjectId.isValid(resourceId)) filter.resource = resourceId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter.user = userId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('resource', 'name category location')
        .populate('user', 'name email studentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { bookings, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) } },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id)
      .populate('resource')
      .populate('user', 'name email studentId department year');

    if (!booking) return next(createError('Booking not found', 404));

    // Students can only view their own bookings
    if (req.user.role === 'student' && booking.user._id.toString() !== req.user._id.toString()) {
      return next(createError('Insufficient permissions', 403));
    }

    return res.status(200).json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 */
const cancelBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return next(createError('Booking not found', 404));

    // Students can only cancel their own bookings
    if (req.user.role === 'student' && booking.user.toString() !== req.user._id.toString()) {
      return next(createError('Insufficient permissions', 403));
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return next(createError(`Cannot cancel a booking with status: ${booking.status}`, 400));
    }

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || '';
    await booking.save();

    return res.status(200).json({ success: true, message: 'Booking cancelled', data: { booking } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/:id/reschedule
 * Concurrency-safe rescheduling.
 */
const rescheduleBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id).populate('resource');
    if (!booking) return next(createError('Booking not found', 404));

    if (req.user.role === 'student' && booking.user.toString() !== req.user._id.toString()) {
      return next(createError('Insufficient permissions', 403));
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return next(createError('Cannot reschedule a booking with this status', 400));
    }

    const { startAt, endAt } = req.body;
    const { start, end } = parseDates(startAt, endAt);

    await withResourceLock(booking.resource._id, async () => {
      await assertNoConflicts(booking.resource._id, start, end, booking._id);
      booking.startAt = start;
      booking.endAt = end;
      // Reset approval if resource requires it
      if (booking.resource.approvalRequired) booking.status = 'pending';
      await booking.save();
    });

    return res.status(200).json({ success: true, message: 'Booking rescheduled', data: { booking } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/:id/approve  (manager/admin)
 */
const approveBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return next(createError('Booking not found', 404));
    if (booking.status !== 'pending') return next(createError('Only pending bookings can be approved', 400));

    // Re-check conflicts at approval time
    await assertNoConflicts(booking.resource, booking.startAt, booking.endAt, booking._id);

    booking.status = 'confirmed';
    booking.approvedBy = req.user._id;
    booking.approvedAt = new Date();
    await booking.save();

    return res.status(200).json({ success: true, message: 'Booking approved', data: { booking } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/:id/reject  (manager/admin)
 */
const rejectBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return next(createError('Booking not found', 404));
    if (booking.status !== 'pending') return next(createError('Only pending bookings can be rejected', 400));

    booking.status = 'rejected';
    booking.rejectedBy = req.user._id;
    booking.rejectedAt = new Date();
    booking.rejectionReason = req.body.reason || '';
    await booking.save();

    return res.status(200).json({ success: true, message: 'Booking rejected', data: { booking } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/:id/check-out  (manager/admin)
 */
const checkOut = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id).populate('resource');
    if (!booking) return next(createError('Booking not found', 404));
    if (booking.status !== 'confirmed') return next(createError('Only confirmed bookings can be checked out', 400));

    const { checkoutCondition = 'good', notes } = req.body;

    const transaction = await AssetTransaction.create({
      booking: booking._id,
      resource: booking.resource._id,
      checkedOutBy: booking.user,
      staffMember: req.user._id,
      checkedOutAt: new Date(),
      dueAt: booking.endAt,
      checkoutCondition,
      notes,
    });

    return res.status(201).json({ success: true, data: { transaction } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/:id/return  (manager/admin)
 */
const returnAsset = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid booking ID', 400));
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return next(createError('Booking not found', 404));

    const transaction = await AssetTransaction.findOne({ booking: req.params.id, isActive: true });
    if (!transaction) return next(createError('No active checkout found for this booking', 404));

    const { returnCondition, notes } = req.body;
    if (!returnCondition) return next(createError('returnCondition is required', 400));

    transaction.returnedAt = new Date();
    transaction.returnCondition = returnCondition;
    transaction.returnedToStaff = req.user._id;
    transaction.isActive = false;
    if (notes) transaction.notes = notes;
    await transaction.save();

    booking.status = 'completed';
    await booking.save();

    return res.status(200).json({ success: true, message: 'Asset returned successfully', data: { transaction } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/utilization  (manager/admin)
 */
const getUtilization = async (req, res, next) => {
  try {
    const { startAt, endAt } = req.query;
    const start = startAt ? new Date(startAt) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endAt ? new Date(endAt) : new Date();

    const [
      totalBookings,
      byStatus,
      byCategory,
      topResources,
    ] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $lookup: { from: 'resources', localField: 'resource', foreignField: '_id', as: 'resource' } },
        { $unwind: '$resource' },
        { $group: { _id: '$resource.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'resources', localField: '_id', foreignField: '_id', as: 'resource' } },
        { $unwind: '$resource' },
        { $project: { name: '$resource.name', category: '$resource.category', count: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        period: { startAt: start, endAt: end },
        totalBookings,
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byCategory,
        topResources,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/maintenance  (manager/admin)
 */
const createMaintenance = async (req, res, next) => {
  try {
    const { resourceId, title, description, startAt, endAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return next(createError('Invalid resource ID', 400));
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) return next(createError('Resource not found', 404));

    const start = new Date(startAt);
    const end = new Date(endAt);

    // Check for conflicting confirmed bookings
    const conflicts = await Booking.findConflicting(resourceId, start, end);
    if (conflicts.length > 0) {
      return next(createError(
        `Maintenance window conflicts with ${conflicts.length} existing booking(s). Resolve conflicts before scheduling maintenance.`,
        409
      ));
    }

    const record = await MaintenanceRecord.create({
      resource: resourceId,
      title,
      description,
      startAt: start,
      endAt: end,
      createdBy: req.user._id,
    });

    // Mark resource status as maintenance only if the window has already started
    if (start <= new Date() && end >= new Date()) {
      resource.status = 'maintenance';
      await resource.save();
    }

    return res.status(201).json({ success: true, data: { maintenance: record } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/maintenance  (manager/admin)
 */
const listMaintenance = async (req, res, next) => {
  try {
    const { resourceId, status } = req.query;
    const filter = {};
    if (resourceId && mongoose.Types.ObjectId.isValid(resourceId)) filter.resource = resourceId;
    if (status) filter.status = status;

    const records = await MaintenanceRecord.find(filter)
      .populate('resource', 'name category location')
      .sort({ startAt: -1 });

    return res.status(200).json({ success: true, data: { maintenance: records } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking, getMyBookings, listBookings, getBookingById,
  cancelBooking, rescheduleBooking, approveBooking, rejectBooking,
  checkOut, returnAsset, getUtilization, createMaintenance, listMaintenance,
};
