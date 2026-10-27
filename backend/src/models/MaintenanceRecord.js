'use strict';

const mongoose = require('mongoose');

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const maintenanceRecordSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title too short'],
      maxlength: [200, 'Title too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description too long'],
    },
    startAt: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid maintenance status' },
      default: 'scheduled',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

maintenanceRecordSchema.pre('validate', function () {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    this.invalidate('endAt', 'Maintenance end time must be after start time');
  }
});

maintenanceRecordSchema.index({ resource: 1, status: 1, startAt: 1, endAt: 1 }, { name: 'maintenance_window' });
maintenanceRecordSchema.index({ startAt: 1, endAt: 1 });

maintenanceRecordSchema.statics.STATUSES = STATUSES;

/**
 * Check if a time range overlaps an active maintenance window for a resource.
 * 'scheduled' and 'in_progress' windows block bookings.
 */
maintenanceRecordSchema.statics.findConflicting = function (resourceId, startAt, endAt) {
  return this.find({
    resource: resourceId,
    status: { $in: ['scheduled', 'in_progress'] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });
};

const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
module.exports = MaintenanceRecord;
