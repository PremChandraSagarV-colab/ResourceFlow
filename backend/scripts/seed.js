'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Resource = require('../src/models/Resource');
const Booking = require('../src/models/Booking');
const MaintenanceRecord = require('../src/models/MaintenanceRecord');

async function seed() {
  console.log('[Seed] Starting ResourceFlow database seeding...');

  try {
    await connectDB();

    console.log('[Seed] Connected to database. Clearing existing demo collections...');
    await Promise.all([
      User.deleteMany({}),
      Resource.deleteMany({}),
      Booking.deleteMany({}),
      MaintenanceRecord.deleteMany({}),
    ]);

    // 1. Seed Users
    console.log('[Seed] Creating initial users with bcrypt hashes...');
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
    const passwordHash = await User.hashPassword(defaultPassword);
    const studentPasswordHash = await User.hashPassword('Student123!');

    const admin = await User.create({
      name: process.env.SEED_ADMIN_NAME || 'System Administrator',
      email: (process.env.SEED_ADMIN_EMAIL || 'admin@resourceflow.dev').toLowerCase(),
      passwordHash,
      role: 'admin',
      department: 'Dean of Academic Computing',
      isActive: true,
    });

    const manager = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'manager@resourceflow.dev',
      passwordHash,
      role: 'manager',
      department: 'Campus Facilities & Labs',
      isActive: true,
    });

    const student1 = await User.create({
      name: 'Alex Johnson',
      email: 'alex.johnson@student.edu',
      passwordHash: studentPasswordHash,
      studentId: 'STU2024001',
      department: 'Computer Science & Engineering',
      year: 3,
      role: 'student',
      isActive: true,
    });

    const student2 = await User.create({
      name: 'Maya Patel',
      email: 'maya.patel@student.edu',
      passwordHash: studentPasswordHash,
      studentId: 'STU2024002',
      department: 'Electrical & Electronics',
      year: 4,
      role: 'student',
      isActive: true,
    });

    const deactivatedStudent = await User.create({
      name: 'Inactive Student',
      email: 'inactive@student.edu',
      passwordHash: studentPasswordHash,
      studentId: 'STU2024099',
      department: 'Civil Engineering',
      year: 2,
      role: 'student',
      isActive: false,
    });

    console.log('[Seed] Users seeded successfully.');

    // 2. Seed Resources
    console.log('[Seed] Creating college resources...');
    const resources = await Resource.create([
      {
        name: 'AI & Robotics Research Laboratory',
        category: 'laboratory',
        location: 'Turing Hall, Room 304',
        capacity: 30,
        description: 'Advanced computing facility equipped with 16x NVIDIA RTX 4090 workstations, ROS robots, and 3D printing stations for machine learning and robotics coursework.',
        specifications: {
          'GPU Stations': '16x RTX 4090',
          'OS': 'Ubuntu 24.04 LTS / CUDA 12',
          'Robotics Kit': 'TurtleBot 4, DJI Tello Drones',
          'Safety': 'First aid kit, CO2 fire suppression',
        },
        status: 'active',
        approvalRequired: true,
        bookingPolicy: {
          maxDurationHours: 4,
          minDurationHours: 1,
          maxAdvanceBookingDays: 14,
          minAdvanceBookingHours: 2,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
      {
        name: 'Silicon VLSI & Embedded Systems Lab',
        category: 'laboratory',
        location: 'Edison Wing, Lab 102',
        capacity: 25,
        description: 'Precision electronics laboratory with digital storage oscilloscopes, FPGA development boards (Xilinx Artix-7), logic analyzers, and SMD soldering workstations.',
        specifications: {
          'Equipments': 'Keysight 200MHz DSOs, Weller Soldering Stations',
          'FPGA Boards': 'Xilinx Basys 3 & Nexys A7',
          'ESD Protection': 'Grounded anti-static mats on all benches',
        },
        status: 'active',
        approvalRequired: false,
        bookingPolicy: {
          maxDurationHours: 3,
          minDurationHours: 1,
          maxAdvanceBookingDays: 10,
          minAdvanceBookingHours: 1,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
      {
        name: 'Executive Boardroom & Conference Suite',
        category: 'meeting_room',
        location: 'Administration Tower, Level 4',
        capacity: 20,
        description: 'High-end boardroom equipped with 4K video conferencing, dual presentation displays, motorized blackout blinds, and crystal audio bar for student council and defense presentations.',
        specifications: {
          'AV System': 'Logitech Rally Plus 4K Video Bar',
          'Screens': 'Dual 75-inch Sony BRAVIA Displays',
          'Seating': 'Ergonomic conference chairs with power hubs',
        },
        status: 'active',
        approvalRequired: true,
        bookingPolicy: {
          maxDurationHours: 2,
          minDurationHours: 0.5,
          maxAdvanceBookingDays: 30,
          minAdvanceBookingHours: 4,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: admin._id,
      },
      {
        name: 'Design Thinking & Collaborative Sprint Studio',
        category: 'meeting_room',
        location: 'Student Innovation Hub, Pod B',
        capacity: 12,
        description: 'Casual, high-energy collaboration room featuring modular whiteboard tables, floor-to-ceiling magnetic writable walls, post-it sprint kits, and ultra-short-throw interactive projector.',
        specifications: {
          'Whiteboards': '360-degree magnetic writable walls',
          'Furniture': 'Movable acoustic booth & sit-stand desks',
          'Projector': 'Epson BrightLink Interactive',
        },
        status: 'active',
        approvalRequired: false,
        bookingPolicy: {
          maxDurationHours: 4,
          minDurationHours: 0.5,
          maxAdvanceBookingDays: 7,
          minAdvanceBookingHours: 0,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
      {
        name: 'Indoor Badminton & Squash Arena',
        category: 'sports_facility',
        location: 'Recreation Complex, Court 2',
        capacity: 4,
        description: 'BWF certified sprung hardwood floor badminton court with anti-glare LED sports lighting, digital scoreboard, and equipment storage.',
        specifications: {
          'Flooring': 'Yonex Court Mat over sprung wood',
          'Lighting': '500 lux sports floodlights',
          'Gear': 'Net and standard scorepost included',
        },
        status: 'active',
        approvalRequired: false,
        bookingPolicy: {
          maxDurationHours: 1.5,
          minDurationHours: 0.5,
          maxAdvanceBookingDays: 5,
          minAdvanceBookingHours: 1,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
      {
        name: 'Sony FX3 Cinema Camera Production Kit',
        category: 'equipment',
        location: 'Media Arts Center, Equipment Cage Locker #7',
        capacity: 1,
        description: 'Full-frame 4K cinema camera package with 24-70mm f/2.8 GM lens, DJI RS3 Pro gimbal, Sennheiser wireless lavalier kit, 4x 160GB CFexpress cards, and Pelican hard case.',
        specifications: {
          'Camera': 'Sony FX3 Cinema Line',
          'Lens': 'Sony FE 24-70mm f/2.8 GM II',
          'Audio': 'Sennheiser EW-DP Wireless Mic Kit',
          'Support': 'DJI RS3 Pro Gimbal + Carbon Tripod',
        },
        status: 'active',
        approvalRequired: true,
        bookingPolicy: {
          maxDurationHours: 8,
          minDurationHours: 2,
          maxAdvanceBookingDays: 14,
          minAdvanceBookingHours: 6,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
      {
        name: 'VR & Spatial Computing Immersion Lab',
        category: 'laboratory',
        location: 'Innovation Wing, Room 410',
        capacity: 15,
        description: 'Dedicated VR/AR testing environment featuring Meta Quest 3, Apple Vision Pro, and HTC Vive Pro headsets with ceiling-mounted tracking arrays.',
        status: 'maintenance',
        location: 'Innovation Wing, Room 410',
        capacity: 15,
        approvalRequired: true,
        bookingPolicy: {
          maxDurationHours: 3,
          minDurationHours: 1,
          maxAdvanceBookingDays: 14,
          minAdvanceBookingHours: 2,
          allowedRoles: ['student', 'manager', 'admin'],
        },
        createdBy: manager._id,
      },
    ]);

    console.log(`[Seed] ${resources.length} resources created.`);

    // 3. Seed Maintenance record on the VR Lab
    const vrLab = resources.find((r) => r.status === 'maintenance');
    const now = new Date();
    const maintStart = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hr from now
    const maintEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hrs from now

    await MaintenanceRecord.create({
      resource: vrLab._id,
      title: 'Firmware & Tracking Beacon Recalibration',
      description: 'Quarterly maintenance on ceiling sensor grid and updating headset runtimes to visionOS 2.0 and Meta Horizon OS.',
      startAt: maintStart,
      endAt: maintEnd,
      status: 'scheduled',
      createdBy: manager._id,
    });
    console.log('[Seed] Scheduled maintenance record created.');

    // 4. Seed sample bookings
    const sprintStudio = resources.find((r) => r.name.includes('Design Thinking'));
    const bookStart = new Date(now.getTime() + 4 * 60 * 60 * 1000); // in 4 hours
    const bookEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);   // in 6 hours

    const sampleBooking = await Booking.create({
      resource: sprintStudio._id,
      user: student1._id,
      startAt: bookStart,
      endAt: bookEnd,
      purpose: 'Senior Capstone Sprint – UX Wireframing and User Journey Mapping',
      status: 'confirmed',
      approvedBy: manager._id,
      approvedAt: now,
    });

    console.log('[Seed] Sample confirmed booking created.');

    console.log('\n======================================================');
    console.log('  🎉 Database Seeding Complete!');
    console.log('======================================================');
    console.log('  Admin:   admin@resourceflow.dev   | Pass: ' + defaultPassword);
    console.log('  Manager: manager@resourceflow.dev | Pass: ' + defaultPassword);
    console.log('  Student: alex.johnson@student.edu | Pass: Student123!');
    console.log('  Student: maya.patel@student.edu   | Pass: Student123!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
