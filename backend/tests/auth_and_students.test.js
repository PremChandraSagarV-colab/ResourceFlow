const { describe, test, before, after, beforeEach } = require('node:test');
const { expect } = require('expect');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
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

describe('PHASE 1 & 2: MongoDB Connection, Auth, and Student Management', () => {
  // 1. Connection / configuration test
  test('1. MongoDB connection is active and responsive', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
  });

  // 2. Student registration and password hashing
  test('2. Student registration hashes password and defaults role to student', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john.doe@college.edu',
      password: 'SecurePassword123!',
      studentId: 'STU1001',
      department: 'Electrical Engineering',
      year: 2,
      role: 'admin', // Mass assignment attempt: should be ignored!
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('john.doe@college.edu');
    expect(res.body.data.user.role).toBe('student'); // Ignored mass assignment
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Never returned

    // Verify stored password in DB is hashed
    const dbUser = await User.findOne({ email: 'john.doe@college.edu' }).select('+passwordHash');
    expect(dbUser).not.toBeNull();
    expect(dbUser.passwordHash).not.toBe('SecurePassword123!');
    expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  // 3. Duplicate email and duplicate student ID rejection
  test('3. Rejects duplicate email and duplicate student ID', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Original Student',
      email: 'duplicate.test@college.edu',
      password: 'SecurePassword123!',
      studentId: 'STU9999',
    });

    // Attempt duplicate email
    const dupEmailRes = await request(app).post('/api/auth/register').send({
      name: 'Another Student',
      email: 'duplicate.test@college.edu',
      password: 'SecurePassword123!',
      studentId: 'STU8888',
    });
    expect(dupEmailRes.status).toBe(409);
    expect(dupEmailRes.body.success).toBe(false);
    expect(dupEmailRes.body.message).toMatch(/already registered/i);

    // Attempt duplicate studentId
    const dupIdRes = await request(app).post('/api/auth/register').send({
      name: 'Third Student',
      email: 'third.student@college.edu',
      password: 'SecurePassword123!',
      studentId: 'STU9999',
    });
    expect(dupIdRes.status).toBe(409);
    expect(dupIdRes.body.success).toBe(false);
    expect(dupIdRes.body.message).toMatch(/already in use/i);
  });

  // 4. Successful login and invalid login
  test('4. Successful login returns token and safe user; invalid credentials are rejected', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login.user@college.edu',
      password: 'ValidPassword123!',
    });

    // Valid login
    const successRes = await request(app).post('/api/auth/login').send({
      email: 'login.user@college.edu',
      password: 'ValidPassword123!',
    });
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.accessToken).toBeDefined();
    expect(successRes.body.data.user.email).toBe('login.user@college.edu');
    expect(successRes.body.data.user.passwordHash).toBeUndefined();

    // Wrong password
    const wrongPassRes = await request(app).post('/api/auth/login').send({
      email: 'login.user@college.edu',
      password: 'WrongPassword999!',
    });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.success).toBe(false);

    // Non-existent email
    const nonExistRes = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@college.edu',
      password: 'ValidPassword123!',
    });
    expect(nonExistRes.status).toBe(401);
  });

  // 5. Inactive user login rejection
  test('5. Deactivated user login is rejected with 403', async () => {
    const inactiveUser = await createTestUser({
      email: 'deactivated@college.edu',
      isActive: false,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'deactivated@college.edu',
      password: 'Pass1234!',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  // 6. Student profile reads and updates
  test('6. Student can read and update their own allowed profile fields only', async () => {
    const student = await createTestUser({
      name: 'Sam Student',
      email: 'sam@college.edu',
      department: 'Physics',
      year: 1,
    });
    const token = generateTestToken(student);

    // Read profile via /api/users/me
    const getRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.user.name).toBe('Sam Student');

    // Update allowed fields (name, department, year)
    const patchRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Samuel Student',
        department: 'Applied Physics',
        year: 2,
        role: 'admin', // Forbidden field attempt
        isActive: false, // Forbidden field attempt
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.user.name).toBe('Samuel Student');
    expect(patchRes.body.data.user.department).toBe('Applied Physics');
    expect(patchRes.body.data.user.year).toBe(2);
    expect(patchRes.body.data.user.role).toBe('student'); // Did not escalate
    expect(patchRes.body.data.user.isActive).toBe(true); // Did not deactivate
  });

  // 7. Student attempts to access admin routes
  test('7. Student role is blocked from admin routes with 403 Forbidden', async () => {
    const student = await createTestUser({ role: 'student' });
    const studentToken = generateTestToken(student);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient permissions/i);
  });

  // 8. Student attempts to edit another student's profile
  test('8. Student cannot view or edit another student profile via direct ID', async () => {
    const studentA = await createTestUser({ name: 'Student A' });
    const studentB = await createTestUser({ name: 'Student B' });
    const tokenA = generateTestToken(studentA);

    // Attempt to access student B's profile
    const res = await request(app)
      .get(`/api/users/${studentB._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 9. Admin user listing, filtering, pagination, and account status changes
  test('9. Admin can list, filter, paginate users and toggle active status (with last-admin guard)', async () => {
    const admin = await createTestUser({ name: 'Admin Root', role: 'admin' });
    const student1 = await createTestUser({ name: 'Alpha Student', department: 'CS', year: 3 });
    const student2 = await createTestUser({ name: 'Beta Student', department: 'EE', year: 4 });
    const adminToken = generateTestToken(admin);

    // List users
    const listRes = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.users.length).toBeGreaterThanOrEqual(3);
    expect(listRes.body.data.pagination.total).toBeGreaterThanOrEqual(3);

    // Filter by department
    const filterRes = await request(app)
      .get('/api/users?department=CS')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.users.every((u) => u.department === 'CS')).toBe(true);

    // Deactivate student1
    const statusRes = await request(app)
      .patch(`/api/users/${student1._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.user.isActive).toBe(false);

    // Guard: Admin cannot deactivate themselves if they are the only active admin
    const selfDeactivateRes = await request(app)
      .patch(`/api/users/${admin._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(selfDeactivateRes.status).toBe(400);
    expect(selfDeactivateRes.body.message).toMatch(/cannot deactivate/i);
  });
});
