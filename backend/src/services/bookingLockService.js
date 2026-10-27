'use strict';

/**
 * BookingLockService – per-resource serialization for booking concurrency control.
 *
 * Design:
 *   - Each resource has at most one ResourceLock document at a time (enforced by
 *     unique index on resource field).
 *   - A lock is acquired with findOneAndUpdate + upsert in a single atomic
 *     operation. If the document already exists (another holder), upsert fails
 *     with a duplicate key error → treated as "lock busy" → retry.
 *   - Locks carry an expiry (expiresAt) and are automatically cleaned up by
 *     MongoDB's TTL index, preventing deadlocks from crashed processes.
 *   - After acquiring the lock, the caller does its overlap check + write, then
 *     releases the lock.
 *   - Works on both standalone MongoDB and replica sets (no session required
 *     for the lock itself).
 *
 * Concurrency guarantee:
 *   Only one request at a time performs the check-then-insert for a given
 *   resource, so even simultaneous requests cannot both see "no conflict" and
 *   both proceed – the loser sees the lock document is already held, retries,
 *   and after the winner releases, finds the conflicting booking.
 */

const crypto = require('crypto');
const ResourceLock = require('../models/ResourceLock');

const LOCK_TTL_SECONDS = 30; // max time a lock may be held
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquire an exclusive lock for a resource.
 * Retries with exponential back-off if the lock is currently held.
 *
 * @param {string|ObjectId} resourceId
 * @returns {string} lockHolder – must be passed to releaseLock
 * @throws if lock cannot be acquired after MAX_RETRIES
 */
async function acquireLock(resourceId) {
  const lockHolder = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + LOCK_TTL_SECONDS * 1000);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Remove any expired lock first (belt-and-suspenders; TTL index handles this async)
    await ResourceLock.deleteOne({
      resource: resourceId,
      expiresAt: { $lte: new Date() },
    });

    try {
      await ResourceLock.create({ resource: resourceId, lockHolder, expiresAt });
      return lockHolder; // acquired
    } catch (err) {
      if (err.code === 11000) {
        // Lock held by someone else – wait and retry
        if (attempt === MAX_RETRIES) {
          throw Object.assign(new Error('Could not acquire resource lock – please try again'), {
            statusCode: 503,
          });
        }
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt) + Math.random() * 20;
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Release the lock held by lockHolder for a resource.
 * Only removes the document if the lockHolder matches (prevents stale releases).
 */
async function releaseLock(resourceId, lockHolder) {
  await ResourceLock.deleteOne({ resource: resourceId, lockHolder });
}

/**
 * Execute fn() while holding the exclusive resource lock.
 * Always releases the lock, even if fn() throws.
 *
 * @param {string|ObjectId} resourceId
 * @param {Function} fn  async function to execute under the lock
 * @returns {*} return value of fn()
 */
async function withResourceLock(resourceId, fn) {
  const lockHolder = await acquireLock(resourceId);
  try {
    return await fn();
  } finally {
    await releaseLock(resourceId, lockHolder);
  }
}

module.exports = { acquireLock, releaseLock, withResourceLock };
