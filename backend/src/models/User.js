'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'manager', 'admin'];
const PUBLIC_ROLES = ['student']; // roles assignable at registration

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
      maxlength: [254, 'Email too long'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Student ID too long'],
      sparse: true, // partial unique index – allows multiple null values
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department name too long'],
    },
    year: {
      type: Number,
      min: [1, 'Year must be between 1 and 6'],
      max: [6, 'Year must be between 1 and 6'],
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Invalid role' },
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Refresh token hash for stateless logout/revocation
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound partial unique index for studentId (unique when not null)
userSchema.index(
  { studentId: 1 },
  { unique: true, sparse: true, name: 'studentId_unique_sparse' }
);

// Indexes for common query patterns
userSchema.index({ role: 1 });
userSchema.index({ department: 1, year: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// ── Static helpers ────────────────────────────────────────────────────────────

userSchema.statics.ROLES = ROLES;
userSchema.statics.PUBLIC_ROLES = PUBLIC_ROLES;

/**
 * Hash a plain-text password.
 */
userSchema.statics.hashPassword = async function (plain) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  return bcrypt.hash(plain, rounds);
};

/**
 * Find user by email and include passwordHash for verification.
 */
userSchema.statics.findByEmailForAuth = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash +refreshTokenHash'
  );
};

// ── Instance methods ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 */
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Return a safe public object (no password hash).
 */
userSchema.methods.toSafeObject = function () {
  return this.toObject();
};

// ── Pre-save hook ─────────────────────────────────────────────────────────────

// Ensure email stays lowercase
userSchema.pre('save', function () {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
