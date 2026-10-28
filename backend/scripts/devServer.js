'use strict';

require('dotenv').config();
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { validateEnv, registerShutdownHandlers } = require('../src/config/database');
const seed = require('./seed');

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Keep the zero-configuration demo login usable without asking students to
// create secrets. These temporary keys are only for this local dev process.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('REPLACE_WITH_')) {
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
}
if (
  !process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_REFRESH_SECRET.startsWith('REPLACE_WITH_')
) {
  process.env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString('hex');
}

async function startDevEnvironment() {
  console.log('\n======================================================');
  console.log('  ⚡ ResourceFlow Development Environment Bootstrapper');
  console.log('======================================================');

  let dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resourceflow';
  let memoryServer = null;

  // Check if external MongoDB is running
  try {
    console.log(`[Dev] Probing MongoDB connection at ${dbUri}...`);
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 2000,
      driverInfo: { name: 'nodejs', version: '6.0.0' },
    });
    console.log('[Dev] External MongoDB is active and reachable.');
    await mongoose.disconnect();
  } catch {
    console.log('[Dev] No external MongoDB found on localhost:27017.');
    console.log('[Dev] Initializing embedded zero-config MongoDB instance...');
    memoryServer = await MongoMemoryServer.create({
      instance: { port: 27017, dbName: 'resourceflow' },
    }).catch(async () => {
      // If port 27017 has conflict or permission, use dynamic port
      return MongoMemoryServer.create({ instance: { dbName: 'resourceflow' } });
    });

    dbUri = memoryServer.getUri();
    process.env.MONGODB_URI = dbUri;
    console.log(`[Dev] Embedded MongoDB running at: ${dbUri}`);
  }

  // Connect Mongoose to the selected URI
  await mongoose.connect(dbUri, {
    driverInfo: { name: 'nodejs', version: '6.0.0' },
  });

  // Seed demo data if database is empty
  const User = require('../src/models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('[Dev] Database is empty. Seeding initial demo catalog...');
    await seed();
    // Reconnect after seed disconnects
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri, {
        driverInfo: { name: 'nodejs', version: '6.0.0' },
      });
    }
  }

  // Start Express API Server
  const server = app.listen(PORT, () => {
    console.log('\n======================================================');
    console.log(`  🚀 ResourceFlow Backend API: http://localhost:${PORT}`);
    console.log(`  🏥 Health Check Endpoint:    http://localhost:${PORT}/api/health`);
    console.log(`  📦 Database Connection:      ${dbUri}`);
    console.log('======================================================\n');
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Dev] Shutting down (${signal})...`);
    server.close();
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startDevEnvironment().catch((err) => {
  console.error('[Dev] Startup failure:', err);
  process.exit(1);
});
