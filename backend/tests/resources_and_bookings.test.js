const { describe, test, before, after, beforeEach } = require('node:test');
const { expect } = require('expect');
const request = require('supertest');
const app = require('../src/app');
const Resource = require('../src/models/Resource');
const Booking = require('../src/models/Booking');
const MaintenanceRecord = require('../src/models/MaintenanceRecord');
const ResourceLock = require('../src/models/ResourceLock');
const {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  generateTestToken,
  createTestUser,
} = require('./setup');

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

// Helper to create a test resource
async function createTestResource(overrides = {}) {
  const defaults = {
    name: 'Turing Computer Lab',
    category: 'laboratory',
    location: 'Building A, Room 101',
    capacity: 40,
    status: 'active',
    approvalRequired: false,
    bookingPolicy: {
      maxDurationHours: 6,
      minDurationHours: 0.5,
      maxAdvanceBookingDays: 30,
      minAdvanceBookingHours: 0,
    },
  };
  return Resource.create({ ...defaults, ...overrides });
}

describe('PHASE 3 & 4: Resource Management, Bookings, and Concurrency Control', () => {
  // 10. Resource CRUD and validation
  test('10. Resource CRUD and validation for managers and public availability', async () => {
    const manager = await createTestUser({ role: 'manager' });
    const managerToken = generateTestToken(manager);

    // Create resource
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Quantum Optics Laboratory',
        category: 'laboratory',
        location: 'Science Block B, Room 202',
        capacity: 15,
        status: 'active',
        approvalRequired: true,
        bookingPolicy: {
          maxDurationHours: 4,
          minDurationHours: 1,
          maxAdvanceBookingDays: 14,
          minAdvanceBookingHours: 1,
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.resource.name).toBe('Quantum Optics Laboratory');
    const resourceId = createRes.body.data.resource._id;

    // Public list
    const listRes = await request(app).get('/api/resources');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.resources.some((r) => r._id === resourceId)).toBe(true);

    // Update resource
    const patchRes = await request(app)
      .patch(`/api/resources/${resourceId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ capacity: 20 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.resource.capacity).toBe(20);
  });

  // 11. Booking creation, cancellation, rescheduling, and approval
  test('11. Booking lifecycle: create, reschedule, cancel, and manager approval', async () => {
    const manager = await createTestUser({ role: 'manager' });
    const student = await createTestUser({ role: 'student' });
    const studentToken = generateTestToken(student);
    const managerToken = generateTestToken(manager);

    const resource = await createTestResource({ approvalRequired: true });

    const now = Date.now();
    const startAt = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(now + 4 * 60 * 60 * 1000).toISOString();

    // Student creates booking
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        resourceId: resource._id.toString(),
        startAt,
        endAt,
        purpose: 'Deep learning seminar preparation',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.booking.status).toBe('pending');
    const bookingId = createRes.body.data.booking._id;

    // Manager approves booking
    const approveRes = await request(app)
      .patch(`/api/bookings/${bookingId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.booking.status).toBe('confirmed');

    // Student reschedules booking to another free window
    const newStart = new Date(now + 5 * 60 * 60 * 1000).toISOString();
    const newEnd = new Date(now + 7 * 60 * 60 * 1000).toISOString();
    const reschedRes = await request(app)
      .patch(`/api/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ startAt: newStart, endAt: newEnd });
    expect(reschedRes.status).toBe(200);

    // Student cancels booking
    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ reason: 'Project milestone completed early' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.booking.status).toBe('cancelled');
  });

  // 12. Overlapping booking rejection
  test('12. Overlapping booking is rejected with 409 Conflict', async () => {
    const student1 = await createTestUser();
    const student2 = await createTestUser();
    const token1 = generateTestToken(student1);
    const token2 = generateTestToken(student2);

    const resource = await createTestResource();
    const now = Date.now();
    const start = new Date(now + 3 * 60 * 60 * 1000).toISOString();
    const end = new Date(now + 5 * 60 * 60 * 1000).toISOString();

    // First student books [T+3, T+5]
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        resourceId: resource._id.toString(),
        startAt: start,
        endAt: end,
        purpose: 'Robotics Workshop',
      });
    expect(res1.status).toBe(201);

    // Second student attempts overlapping interval [T+4, T+6]
    const overlapStart = new Date(now + 4 * 60 * 60 * 1000).toISOString();
    const overlapEnd = new Date(now + 6 * 60 * 60 * 1000).toISOString();
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        resourceId: resource._id.toString(),
        startAt: overlapStart,
        endAt: overlapEnd,
        purpose: 'Autonomous drone flight test',
      });
    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
  });

  // 13. Simultaneous competing requests for one exclusive slot: exactly one succeeds
  test('13. Concurrency test: Simultaneous requests for the exact same slot allow exactly one winner', async () => {
    const users = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser(),
      createTestUser(),
    ]);

    const resource = await createTestResource();
    const now = Date.now();
    const startAt = new Date(now + 10 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(now + 12 * 60 * 60 * 1000).toISOString();

    // Dispatch 4 concurrent booking requests at the same instant
    const promises = users.map((u) => {
      const token = generateTestToken(u);
      return request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: resource._id.toString(),
          startAt,
          endAt,
          purpose: `Concurrent request by ${u.name}`,
        });
    });

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    expect(successful.length).toBe(1);
    expect(conflicts.length).toBe(3);

    // Verify exactly one active booking exists in the database
    const dbBookings = await Booking.find({
      resource: resource._id,
      status: { $in: ['pending', 'confirmed'] },
    });
    expect(dbBookings.length).toBe(1);
  });

  // 14. Non-overlapping reservations succeeding concurrently
  test('14. Non-overlapping reservations succeed concurrently', async () => {
    const student1 = await createTestUser();
    const student2 = await createTestUser();
    const token1 = generateTestToken(student1);
    const token2 = generateTestToken(student2);

    const resource = await createTestResource();
    const now = Date.now();

    // Slot A: [T+1, T+2], Slot B: [T+2, T+3] (Boundary match permitted)
    const slotA = {
      startAt: new Date(now + 1 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    };
    const slotB = {
      startAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    };

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: resource._id.toString(),
          startAt: slotA.startAt,
          endAt: slotA.endAt,
          purpose: 'Morning session',
        }),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          resourceId: resource._id.toString(),
          startAt: slotB.startAt,
          endAt: slotB.endAt,
          purpose: 'Afternoon session',
        }),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  // 15. Cancelled bookings releasing reservations correctly
  test('15. Cancelled bookings release reservations for subsequent bookings', async () => {
    const student1 = await createTestUser();
    const student2 = await createTestUser();
    const token1 = generateTestToken(student1);
    const token2 = generateTestToken(student2);

    const resource = await createTestResource();
    const now = Date.now();
    const startAt = new Date(now + 20 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(now + 22 * 60 * 60 * 1000).toISOString();

    // Student 1 books
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        resourceId: resource._id.toString(),
        startAt,
        endAt,
        purpose: 'Reserved slot to cancel',
      });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data.booking._id;

    // Student 1 cancels
    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ reason: 'Plans changed' });

    // Student 2 can now book the exact same slot
    const bookRes2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        resourceId: resource._id.toString(),
        startAt,
        endAt,
        purpose: 'Claim released slot',
      });
    expect(bookRes2.status).toBe(201);
  });

  // 16. Maintenance windows blocking bookings
  test('16. Maintenance windows block bookings for that period', async () => {
    const manager = await createTestUser({ role: 'manager' });
    const student = await createTestUser({ role: 'student' });
    const managerToken = generateTestToken(manager);
    const studentToken = generateTestToken(student);

    const resource = await createTestResource();
    const now = Date.now();
    const maintStart = new Date(now + 15 * 60 * 60 * 1000).toISOString();
    const maintEnd = new Date(now + 18 * 60 * 60 * 1000).toISOString();

    // Manager schedules maintenance
    const maintRes = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        resourceId: resource._id.toString(),
        title: 'Network Switch Upgrade',
        startAt: maintStart,
        endAt: maintEnd,
      });
    expect(maintRes.status).toBe(201);

    // Student attempts to book during maintenance
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        resourceId: resource._id.toString(),
        startAt: new Date(now + 16 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(now + 17 * 60 * 60 * 1000).toISOString(),
        purpose: 'Attempting to book during maintenance',
      });
    expect(bookRes.status).toBe(409);
    expect(bookRes.body.message).toMatch(/maintenance/i);
  });

  // 17. Failed operations not leaving partial slot claims / dangling locks
  test('17. Failed operations release resource lock cleanly', async () => {
    const student = await createTestUser();
    const token = generateTestToken(student);
    const resource = await createTestResource();

    // Trigger an invalid booking request (missing required fields / past date)
    const invalidRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resourceId: resource._id.toString(),
        startAt: new Date(Date.now() - 10000).toISOString(), // Past date
        endAt: new Date().toISOString(),
        purpose: 'Invalid past date',
      });
    expect(invalidRes.status).toBe(400);

    // Verify lock is completely free
    const lock = await ResourceLock.findOne({ resource: resource._id });
    expect(lock).toBeNull();
  });

  // 18. Repeated idempotent booking requests not creating duplicates
  test('18. Repeated idempotent booking requests return existing booking without creating duplicates', async () => {
    const student = await createTestUser();
    const token = generateTestToken(student);
    const resource = await createTestResource();

    const idempotencyKey = 'client-req-uuid-12345';
    const now = Date.now();
    const startAt = new Date(now + 25 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(now + 27 * 60 * 60 * 1000).toISOString();

    const payload = {
      resourceId: resource._id.toString(),
      startAt,
      endAt,
      purpose: 'Idempotent experiment booking',
      idempotencyKey,
    };

    // First attempt
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res1.status).toBe(201);
    const originalBookingId = res1.body.data.booking._id;

    // Second attempt with exact same idempotency key
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res2.status).toBe(200); // 200 OK idempotent return
    expect(res2.body.data.booking._id).toBe(originalBookingId);

    // Ensure only 1 booking was created
    const count = await Booking.countDocuments({ idempotencyKey });
    expect(count).toBe(1);
  });
});
