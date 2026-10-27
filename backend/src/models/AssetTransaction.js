'use strict';

const mongoose = require('mongoose');

const CONDITIONS = ['excellent', 'good', 'fair', 'damaged', 'lost'];

const assetTransactionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staffMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member is required'],
    },
    checkedOutAt: {
      type: Date,
      required: [true, 'Checkout time is required'],
      default: Date.now,
    },
    dueAt: {
      type: Date,
      required: [true, 'Due time is required'],
    },
    returnedAt: {
      type: Date,
    },
    returnedToStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    checkoutCondition: {
      type: String,
      enum: { values: CONDITIONS, message: 'Invalid condition' },
      required: [true, 'Checkout condition is required'],
    },
    returnCondition: {
      type: String,
      enum: { values: CONDITIONS, message: 'Invalid condition' },
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes too long'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate active checkout for the same booking
assetTransactionSchema.index(
  { booking: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'active_checkout_unique',
  }
);

assetTransactionSchema.index({ resource: 1, checkedOutAt: -1 });
assetTransactionSchema.index({ checkedOutBy: 1 });
assetTransactionSchema.index({ isActive: 1 });

// Validate return state
assetTransactionSchema.pre('save', function () {
  if (this.returnedAt && !this.returnCondition) {
    throw new Error('Return condition is required when returning an asset');
  }
  if (this.returnedAt && this.returnedAt < this.checkedOutAt) {
    throw new Error('Return time cannot be before checkout time');
  }
});

const AssetTransaction = mongoose.model('AssetTransaction', assetTransactionSchema);
module.exports = AssetTransaction;
