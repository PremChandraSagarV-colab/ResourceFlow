'use strict';

const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const { createError } = require('../middleware/errorHandler');

/**
 * GET /api/resources
 * Public (active resources visible to all). Managers/admins see all.
 */
const listResources = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      location,
      status,
      approvalRequired,
    } = req.query;

    const filter = {};

    // Non-admin/manager users only see active resources
    if (!req.user || !['manager', 'admin'].includes(req.user.role)) {
      filter.status = 'active';
    } else if (status) {
      filter.status = status;
    }

    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (approvalRequired !== undefined) filter.approvalRequired = approvalRequired === 'true';

    // Text search
    let searchQuery = filter;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      searchQuery = { ...filter, $or: [{ name: regex }, { location: regex }, { description: regex }] };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [resources, total] = await Promise.all([
      Resource.find(searchQuery)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Resource.countDocuments(searchQuery),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        resources,
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
 * GET /api/resources/:id
 */
const getResourceById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid resource ID', 400));
    }
    const resource = await Resource.findById(req.params.id);
    if (!resource) return next(createError('Resource not found', 404));
    return res.status(200).json({ success: true, data: { resource } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/resources
 * Manager/admin only.
 */
const createResource = async (req, res, next) => {
  try {
    const resource = await Resource.create({ ...req.body, createdBy: req.user._id });
    return res.status(201).json({ success: true, data: { resource } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/resources/:id
 * Manager/admin only.
 */
const updateResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid resource ID', 400));
    }
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );
    if (!resource) return next(createError('Resource not found', 404));
    return res.status(200).json({ success: true, data: { resource } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/resources/:id
 * Manager/admin only. Safe archival: hard delete only if no bookings exist.
 */
const deleteResource = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid resource ID', 400));
    }
    const resource = await Resource.findById(req.params.id);
    if (!resource) return next(createError('Resource not found', 404));

    const bookingCount = await Booking.countDocuments({
      resource: req.params.id,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (bookingCount > 0) {
      // Soft delete – archive instead
      await resource.softDelete();
      return res.status(200).json({
        success: true,
        message: 'Resource archived (has active bookings). It will no longer appear in listings.',
      });
    }

    await resource.deleteOne();
    return res.status(200).json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resources/:id/availability?startAt=...&endAt=...
 */
const getAvailability = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(createError('Invalid resource ID', 400));
    }

    const { startAt, endAt } = req.query;
    if (!startAt || !endAt) {
      return next(createError('startAt and endAt query parameters are required', 400));
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start) || isNaN(end)) {
      return next(createError('Invalid date format', 400));
    }
    if (start >= end) {
      return next(createError('startAt must be before endAt', 400));
    }

    const [conflictingBookings, maintenanceWindows] = await Promise.all([
      Booking.findConflicting(req.params.id, start, end),
      MaintenanceRecord.findConflicting(req.params.id, start, end),
    ]);

    const isAvailable = conflictingBookings.length === 0 && maintenanceWindows.length === 0;

    return res.status(200).json({
      success: true,
      data: {
        resourceId: req.params.id,
        startAt: start,
        endAt: end,
        isAvailable,
        conflicts: {
          bookings: conflictingBookings.length,
          maintenance: maintenanceWindows.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listResources, getResourceById, createResource, updateResource, deleteResource, getAvailability };
