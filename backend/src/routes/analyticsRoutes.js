'use strict';

const express = require('express');
const router = express.Router();
const { getUtilization } = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/utilization', authenticate, requireRole('manager', 'admin'), getUtilization);

module.exports = router;
