'use strict';

require('dotenv').config();
const app = require('./app');
const {
  connectDB,
  validateEnv,
  registerShutdownHandlers,
} = require('./config/database');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    // Validate configuration
    validateEnv();

    // Connect to database
    await connectDB();
    registerShutdownHandlers();

    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  🚀 ResourceFlow Backend running on port ${PORT}`);
      console.log(`  🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`  🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    server.on('error', (err) => {
      console.error('[Server] Startup error:', err.message);
      process.exit(1);
    });

    return server;
  } catch (err) {
    console.error('[Server] Fatal startup failure:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
