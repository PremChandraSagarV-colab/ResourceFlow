'use strict';

const mongoose = require('mongoose');

const CATEGORIES = ['laboratory', 'meeting_room', 'sports_facility', 'equipment', 'other'];
const STATUSES = ['active', 'inactive', 'maintenance'];

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      minlength: [2, 'Name too short'],
      maxlength: [200, 'Name too long'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category' },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description too long'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location too long'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [10000, 'Capacity seems too large'],
    },
    specifications: {
      type: Map,
      of: String,
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid status' },
      default: 'active',
    },
    approvalRequired: {
      type: Boolean,
      default: false,
    },
    bookingPolicy: {
      maxDurationHours: { type: Number, default: 8, min: 0.25 },
      minDurationHours: { type: Number, default: 0.5, min: 0.25 },
      maxAdvanceBookingDays: { type: Number, default: 30, min: 1 },
      minAdvanceBookingHours: { type: Number, default: 1, min: 0 },
      allowedRoles: {
        type: [String],
        default: ['student', 'manager', 'admin'],
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

resourceSchema.index({ category: 1, status: 1 });
resourceSchema.index({ location: 1 });
resourceSchema.index({ name: 'text', description: 'text', location: 'text' });
resourceSchema.index({ isDeleted: 1 });

resourceSchema.statics.CATEGORIES = CATEGORIES;
resourceSchema.statics.STATUSES = STATUSES;

// Soft delete
resourceSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = 'inactive';
  return this.save();
};

// Default query excludes deleted resources
resourceSchema.pre(/^find/, function () {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;
