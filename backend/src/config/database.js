'use strict';

const mongoose = require('mongoose');

const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (process.env.NODE_ENV === 'production') {
    for (const name of ['JWT_REFRESH_SECRET', 'FRONTEND_ORIGIN']) {
      if (!process.env[name]) missing.push(name);
    }
  }
  if (missing.length) {
    throw new Error(
      `[Config] Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and fill in the values.'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
      if (process.env[name].startsWith('REPLACE_WITH_') || process.env[name].length < 32) {
        throw new Error(`[Config] ${name} must be a unique secret with at least 32 characters.`);
      }
    }
    if (process.env.COOKIE_SECURE !== 'true') {
      throw new Error('[Config] COOKIE_SECURE must be true in production.');
    }
  }
}

const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  driverInfo: { name: 'nodejs', version: '6.0.0' },
};

let _connection = null;

async function connectDB(uri) {
  if (_connection && mongoose.connection.readyState === 1) {
    return _connection;
  }

  const dbUri = uri || process.env.MONGODB_URI;
  if (!dbUri) {
    throw new Error('[DB] MONGODB_URI is not defined.');
  }

  mongoose.connection.on('connected', () =>
    console.log(`[DB] Connected to MongoDB: ${mongoose.connection.name}`)
  );
  mongoose.connection.on('error', (err) =>
    console.error('[DB] Connection error:', err.message)
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('[DB] MongoDB disconnected.')
  );

  _connection = await mongoose.connect(dbUri, connectionOptions);
  return _connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[DB] Disconnected from MongoDB.');
  }
}

// Graceful shutdown
function registerShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`\n[DB] ${signal} received – closing MongoDB connection.`);
    await disconnectDB();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { connectDB, disconnectDB, validateEnv, registerShutdownHandlers };
