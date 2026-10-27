'use strict';

const { z } = require('zod');

// ── Shared schemas ────────────────────────────────────────────────────────────

const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .transform((v) => v.toLowerCase().trim());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ── Auth validators ───────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name too short').max(100, 'Name too long').trim(),
  email: emailSchema,
  password: passwordSchema,
  studentId: z
    .string()
    .max(20, 'Student ID too long')
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  department: z.string().max(100, 'Department too long').trim().optional(),
  year: z.number().int().min(1).max(6).optional(),
  // role is NOT accepted from the client at registration – always defaults to student
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// ── User update validators ────────────────────────────────────────────────────

// Fields a student may update about themselves
const selfUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  department: z.string().max(100).trim().optional(),
  year: z.number().int().min(1).max(6).optional(),
});

// Admin can update role and status
const adminUserUpdateSchema = z.object({
  role: z.enum(['student', 'manager', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

// ── Resource validators ───────────────────────────────────────────────────────

const resourceCreateSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  category: z.enum(['laboratory', 'meeting_room', 'sports_facility', 'equipment', 'other']),
  description: z.string().max(2000).optional(),
  location: z.string().min(1).max(200).trim(),
  capacity: z.number().int().min(1).max(10000),
  specifications: z.record(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  approvalRequired: z.boolean().optional(),
  bookingPolicy: z
    .object({
      maxDurationHours: z.number().positive().optional(),
      minDurationHours: z.number().positive().optional(),
      maxAdvanceBookingDays: z.number().int().positive().optional(),
      minAdvanceBookingHours: z.number().nonnegative().optional(),
    })
    .optional(),
});

const resourceUpdateSchema = resourceCreateSchema.partial();

// ── Booking validators ────────────────────────────────────────────────────────

const bookingCreateSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 datetime' }),
  endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 datetime' }),
  purpose: z.string().min(5, 'Purpose too short').max(500, 'Purpose too long').trim(),
  idempotencyKey: z.string().max(128).optional(),
});

const bookingRescheduleSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

// ── Maintenance validators ────────────────────────────────────────────────────

const maintenanceCreateSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

// ── Pagination / query validators ─────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  department: z.string().optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  role: z.enum(['student', 'manager', 'admin']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

// ── Validation middleware factory ─────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On failure, responds with 400 and field-level errors.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (source === 'query') {
    Object.assign(req.query, result.data);
  } else {
    req[source] = result.data;
  }
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  selfUpdateSchema,
  adminUserUpdateSchema,
  resourceCreateSchema,
  resourceUpdateSchema,
  bookingCreateSchema,
  bookingRescheduleSchema,
  maintenanceCreateSchema,
  paginationSchema,
};
