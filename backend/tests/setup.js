'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

let mongod;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_12345678901234567890123456789012';
process.env.BCRYPT_ROUNDS = '4'; // Fast hashing in tests

// Ensure Jest doesn't timeout while MongoMemoryServer downloads/boots
if (typeof jest !== 'undefined') {
  jest.setTimeout(60000);
}

async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, {
    driverInfo: { name: 'nodejs', version: '6.0.0' },
  });
}

async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
}

function generateTestToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function createTestUser(overrides = {}) {
  const hash = await User.hashPassword('Pass1234!');
  const defaults = {
    name: 'Test Student',
    email: `student_${Date.now()}_${Math.random().toString(36).substring(7)}@test.edu`,
    passwordHash: hash,
    studentId: `STU${Math.floor(100000 + Math.random() * 900000)}`,
    department: 'Computer Science',
    year: 3,
    role: 'student',
    isActive: true,
  };
  return User.create({ ...defaults, ...overrides });
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  generateTestToken,
  createTestUser,
};
