'use strict';

const mongoose = require('mongoose');

/**
 * ResourceLock – per-resource mutex for booking concurrency control.
 *
 * Strategy: Optimistic single-document lock per resource.
 * A lock document is atomically acquired using findOneAndUpdate with upsert.
 * The lock has a TTL so orphaned locks auto-expire (e.g., if a server crashes
 * mid-transaction). Lock acquisition uses a unique compound index on resourceId
 * + acquired state to ensure only one holder at a time.
 *
 * This works with BOTH standalone MongoDB and replica sets. For full ACID
 * multi-document transactions, the calling service wraps DB writes in a
 * mongoose session. If transactions are unavailable (standalone), the lock
 * still serializes access and conflict checks are re-done under the lock.
 */
const resourceLockSchema = new mongoose.Schema({
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
  },
  lockHolder: {
    type: String, // UUID or request ID
    required: true,
  },
  acquiredAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    // MongoDB TTL index auto-removes expired documents
    index: { expires: 0 },
  },
});

// Only one lock per resource at a time
resourceLockSchema.index({ resource: 1 }, { unique: true, name: 'resource_lock_unique' });

const ResourceLock = mongoose.model('ResourceLock', resourceLockSchema);
module.exports = ResourceLock;
