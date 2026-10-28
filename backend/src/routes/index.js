'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const resourceRoutes = require('./resourceRoutes');
const bookingRoutes = require('./bookingRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const analyticsRoutes = require('./analyticsRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/resources', resourceRoutes);
router.use('/bookings', bookingRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/analytics', analyticsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    status: databaseConnected ? 'healthy' : 'database unavailable',
    timestamp: new Date().toISOString(),
    service: 'ResourceFlow API',
  });
});

module.exports = router;
