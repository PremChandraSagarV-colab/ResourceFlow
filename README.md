# ResourceFlow ⚡

> **Startup-Grade Full-Stack College Resource Booking & Asset Management Platform**  
> Engineered with Node.js, Express, MongoDB/Mongoose, React, and Vite with atomic mutex concurrency control.

---

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Architecture & Folder Structure](#-architecture--folder-structure)
5. [Prerequisites](#-prerequisites)
6. [Environment Variables Setup](#-environment-variables-setup)
7. [Database Setup (Atlas & Local)](#-database-setup-atlas--local)
8. [Installation & Startup Guide](#-installation--startup-guide)
9. [Database Seeding](#-database-seeding)
10. [Authentication & Role-Based Permissions](#-authentication--role-based-permissions)
11. [Booking Conflict-Prevention & Concurrency Engine](#-booking-conflict-prevention--concurrency-engine)
12. [API Reference & Endpoint Documentation](#-api-reference--endpoint-documentation)
13. [Database Schemas & Indexes](#-database-schemas--indexes)
14. [Automated Testing Suite](#-automated-testing-suite)
15. [Security & Hardening Checklist](#-security--hardening-checklist)
16. [Known Limitations & Production Deployment](#-known-limitations--production-deployment)

---

## 🌟 Project Overview

**ResourceFlow** is a modern, reliable, and secure web platform designed for higher education institutions. It streamlines the reservation and custody lifecycle of high-value college facilities and assets—including AI computing clusters, robotics research laboratories, collaborative design sprint studios, meeting suites, sports facilities, and film/camera gear packages.

Students can discover campus resources, check real-time non-overlapping slot availability, make instant or approval-backed reservations, manage reschedule requests, and track check-out status. Facility managers can review approval queues, conduct physical asset handovers and returns, and lock resources for maintenance. Administrators enjoy full oversight over user directories, roles, resource catalogs, and utilization analytics.

---

## 🚀 Key Features

### 🎓 Student Experience
- **Resource Discovery:** Multi-filter catalog by category (`laboratory`, `meeting_room`, `sports_facility`, `equipment`), location, and live text search.
- **Real-Time Availability Engine:** Inspect any future datetime interval for conflicts before committing.
- **Frictionless Reservations:** Submit bookings with automatic client idempotency protection.
- **Reservation Lifecycle:** View upcoming bookings, cancel reservations with reason logging, or reschedule to new conflict-free slots.
- **Student Profile Self-Service:** Update permitted profile fields (display name, department, academic year) with strict immutability guards on protected fields (student ID, role, status).

### 🛡️ Facility Management (Manager Hub)
- **Pending Approvals Queue:** Review restricted facility requests and approve or reject with custom feedback.
- **Physical Handover & Returns:** Track active check-outs with condition ratings (`excellent`, `good`, `fair`, `damaged`, `lost`) and process returns with audit trails.
- **Maintenance Lockouts:** Schedule maintenance windows that instantly block student reservations during work periods.

### ⚡ Administrator Control (Admin Portal)
- **Student & Staff Directory:** Search, paginate, and filter accounts by department, academic year, role, and active status.
- **Access Control & Status:** Activate/deactivate accounts with safety guards preventing the removal or demotion of the last active administrator.
- **Privilege Management:** Assign role elevations with role allowlist validation.
- **Catalog Management:** Create, update, or soft-archive college resources without breaking historical booking records.
- **Visual Analytics:** Interactive Recharts analytics illustrating bookings by category, top-utilized facilities, and reservation status breakdowns.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, React Router 6, Axios, Recharts, Custom Glassmorphism CSS Design System |
| **Backend** | Node.js (v20+ / v24), Express 5, Mongoose 9, REST APIs |
| **Database** | MongoDB Atlas / Local MongoDB (wire protocol compatible with replica sets and standalone) |
| **Authentication** | JWT (short-lived access tokens, refresh tokens), HttpOnly cookies, Bcrypt password hashing |
| **Validation** | Zod schema validation, Express-rate-limit, Helmet security headers, CORS origin whitelisting |
| **Testing** | Node.js Test Runner (`node --test`), Supertest for HTTP assertions, Expect, MongoMemoryServer |

---

## 📂 Architecture & Folder Structure

```
ResourceFlow/
├── backend/
│   ├── package.json               # Backend dependencies & scripts
│   ├── .env.example               # Template environment configuration
│   ├── scripts/
│   │   └── seed.js                # Database seeder (admin, manager, students, resources)
│   ├── src/
│   │   ├── app.js                 # Express application configuration & middleware
│   │   ├── server.js              # Server entrypoint with DB connection
│   │   ├── config/
│   │   │   └── database.js        # Mongoose connection pooling & graceful shutdown
│   │   ├── controllers/
│   │   │   ├── authController.js     # Register, login, logout, me, refresh
│   │   │   ├── userController.js     # Student profile & admin user management
│   │   │   ├── resourceController.js # Resource catalog & availability checker
│   │   │   └── bookingController.js  # Concurrency-safe reservations & asset workflows
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification & RBAC authorization
│   │   │   └── errorHandler.js    # Centralized JSON error formatting
│   │   ├── models/
│   │   │   ├── User.js            # User model with partial unique indexes & bcrypt
│   │   │   ├── Resource.js        # Resource model with booking policies
│   │   │   ├── Booking.js         # Booking model with boundary-aware conflict queries
│   │   │   ├── AssetTransaction.js# Equipment check-out / return records
│   │   │   ├── MaintenanceRecord.js# Maintenance blocking windows
│   │   │   └── ResourceLock.js    # Atomic per-resource mutex lock with TTL
│   │   ├── routes/
│   │   │   ├── index.js           # API route aggregator
│   │   │   ├── authRoutes.js      # /api/auth/*
│   │   │   ├── userRoutes.js      # /api/users/*
│   │   │   ├── resourceRoutes.js  # /api/resources/*
│   │   │   ├── bookingRoutes.js   # /api/bookings/*
│   │   │   ├── maintenanceRoutes.js# /api/maintenance/*
│   │   │   └── analyticsRoutes.js # /api/analytics/*
│   │   ├── services/
│   │   │   ├── tokenService.js    # JWT cookie & signature management
│   │   │   └── bookingLockService.js # Mutex lock acquisition & retry logic
│   │   └── validators/
│   │       └── index.js           # Zod request validation schemas
│   └── tests/
│       ├── setup.js               # In-memory test database harness
│       ├── auth_and_students.test.js # Phase 1 & 2 automated tests
│       └── resources_and_bookings.test.js # Phase 3 & 4 concurrency tests
├── frontend/
│   ├── package.json               # Frontend dependencies & build scripts
│   ├── index.html                 # HTML shell with meta tags
│   ├── vite.config.js             # Vite development server config
│   └── src/
│       ├── main.jsx               # React DOM entrypoint
│       ├── App.jsx                # Routing & ProtectedRoute role guards
│       ├── index.css              # Design tokens, typography, glassmorphism
│       ├── components/
│       │   ├── Navbar.jsx         # Responsive navigation & role badges
│       │   ├── StatusBadge.jsx    # Status and role indicator badges
│       │   └── ConfirmationModal.jsx # Reusable action confirmation modal
│       ├── context/
│       │   └── AuthContext.jsx    # User authentication provider & session hook
│       ├── pages/
│       │   ├── LoginPage.jsx      # Sign-in & student registration with demo fill
│       │   ├── StudentDashboard.jsx# Student KPI metrics & upcoming bookings
│       │   ├── ResourcesPage.jsx  # Catalog discovery with live filters
│       │   ├── ResourceDetailPage.jsx # Hardware specs & live availability checker
│       │   ├── MyBookingsPage.jsx # Tabbed booking list, cancel, reschedule
│       │   ├── StudentProfilePage.jsx # Allowed profile updates & immutable field guard
│       │   ├── ManagerDashboard.jsx # Approvals queue, checkouts, maintenance
│       │   ├── AdminDashboard.jsx # User directory, catalog CRUD, Recharts analytics
│       │   ├── UnauthorizedPage.jsx # 403 Forbidden handler
│       │   └── NotFoundPage.jsx   # 404 Not Found handler
│       └── services/
│           └── api.js             # Axios instance with credentials & interceptors
├── .gitignore                     # Git ignore rules (.env, node_modules, dist)
└── README.md                      # Complete system documentation
```

---

## 📋 Prerequisites

- **Node.js:** v20.0.0 or higher (v24 LTS recommended)
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas connection string OR local MongoDB instance running on port 27017

---

## 🔐 Environment Variables Setup

1. In the `backend` folder, create a `.env` file based on `.env.example`:

```bash
cd backend
cp ../.env.example .env
```

2. Configure the variables:

```ini
# Environment
NODE_ENV=development
PORT=5000

# Database
# For Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/resourceflow
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/resourceflow?retryWrites=true&w=majority

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=super_secure_64_byte_random_hex_string_for_access_tokens
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=another_super_secure_64_byte_random_hex_string_for_refresh
JWT_REFRESH_EXPIRES_IN=7d

# Cookies & CORS
COOKIE_SECURE=false               # Set to true in production over HTTPS
COOKIE_SAME_SITE=Lax
FRONTEND_ORIGIN=http://localhost:5173

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
AUTH_RATE_LIMIT_MAX=100           # max requests per IP window

# Security
BCRYPT_ROUNDS=12

# Seeder Credentials (used by npm run seed)
SEED_ADMIN_NAME=Admin User
SEED_ADMIN_EMAIL=admin@resourceflow.dev
SEED_ADMIN_PASSWORD=AdminPass123!
```

> **CRITICAL SECURITY NOTICE:** Never commit `.env` files to version control. The repository `.gitignore` automatically excludes `.env` and all its variants.

---

## 🗄️ Database Setup (Atlas & Local)

### Option A: MongoDB Atlas (Cloud)
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a free M0 cluster.
3. Under **Database Access**, create a database user with Read and Write privileges.
4. Under **Network Access**, whitelist your IP address (or `0.0.0.0/0` for initial cloud development).
5. Click **Connect** → **Drivers** (Node.js) and copy your connection string into `MONGODB_URI` in `.env`.

### Option B: Local MongoDB
1. Ensure the MongoDB service is running on your machine:
   ```bash
   mongod --dbpath <data-directory>
   ```
2. Set `MONGODB_URI=mongodb://localhost:27017/resourceflow`.

---

## ⚡ Installation & Startup Guide

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Seed Initial Demo Accounts & Catalog (Optional but Recommended)
```bash
cd ../backend
npm run seed
```

### 4. Start the Backend API Server
```bash
cd backend
npm run dev
# The API will listen on http://localhost:5000/api
# Health Check available at: http://localhost:5000/api/health
```

### 5. Start the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
# The UI will launch on http://localhost:5173
```

---

## 🌱 Database Seeding

The seed script creates realistic college assets and ready-to-test accounts:

```bash
cd backend
npm run seed
```

### Pre-Configured Demo Accounts:
| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@resourceflow.dev` | `AdminPass123!` | Full system access, user management, analytics |
| **Facility Manager** | `manager@resourceflow.dev` | `AdminPass123!` | Approval queue, check-in/out, maintenance |
| **Student** | `alex.johnson@student.edu` | `Student123!` | Resource booking, profile editing, reschedule |
| **Student** | `maya.patel@student.edu` | `Student123!` | Resource booking, profile editing, reschedule |

*(Note: The login page includes quick demo fill buttons to populate these credentials in 1 click).*

---

## 🔒 Authentication & Role-Based Permissions

ResourceFlow employs strict **Defense in Depth**:
1. Passwords hashed using Bcrypt with configurable salt rounds (12 in production, 4 in test).
2. Short-lived JSON Web Tokens signed with strong HMAC secrets.
3. Tokens passed via **HttpOnly cookies** (with automatic fallback to `Authorization: Bearer <token>` for API clients).
4. Every private route is protected by `authenticate` middleware that validates account active status.
5. Role authorization (`requireRole`) enforced strictly on the server—never relying on client-side routing guards.

### Permission Matrix:
| Capability | Student | Manager | Admin |
|---|:---:|:---:|:---:|
| Discover active resources | ✅ | ✅ | ✅ |
| Check real-time slot availability | ✅ | ✅ | ✅ |
| Create booking request | ✅ | ✅ | ✅ |
| View own booking history | ✅ | ✅ | ✅ |
| Cancel own active booking | ✅ | ✅ | ✅ |
| Reschedule own active booking | ✅ | ✅ | ✅ |
| Update own profile (name/dept/year) | ✅ | ✅ | ✅ |
| Approve / reject pending bookings | ❌ | ✅ | ✅ |
| Process equipment check-out / return | ❌ | ✅ | ✅ |
| Schedule resource maintenance | ❌ | ✅ | ✅ |
| View utilization analytics & charts | ❌ | ✅ | ✅ |
| Create / Edit / Archive resources | ❌ | ✅ | ✅ |
| View all user accounts (directory) | ❌ | ❌ | ✅ |
| Change user roles / promote staff | ❌ | ❌ | ✅ |
| Deactivate / Reactivate users | ❌ | ❌ | ✅ |

---

## 🛡️ Booking Conflict-Prevention & Concurrency Engine

### The Problem
Traditional check-then-insert queries suffer from race conditions: if two students request the same slot simultaneously across Express instances, both check queries see "no conflict" and both insert, leading to double-booked facilities.

### The ResourceFlow Solution
ResourceFlow implements an **Atomic Per-Resource Mutex Locking Engine** (`ResourceLock` model) backed by MongoDB's unique index and TTL capabilities:

1. **Atomic Lock Acquisition:**
   - Before evaluating overlap queries, the server attempts to insert an exclusive `ResourceLock` document keyed by `{ resource: resourceId }`.
   - The unique compound index on `resource` ensures that **only one request** in the entire cluster can hold the lock for that resource at any millisecond.
   - Competing requests encounter a duplicate key error (code `11000`), enter an exponential backoff loop with jitter, and retry up to 5 times.
2. **Conflict Evaluation Under Lock:**
   - The winner of the lock executes `assertNoConflicts(resourceId, start, end)`:
     ```javascript
     Booking.findConflicting = function (resourceId, startAt, endAt, excludeBookingId) {
       return this.find({
         resource: resourceId,
         status: { $in: ['pending', 'confirmed'] },
         startAt: { $lt: endAt },  // existing starts before new ends
         endAt: { $gt: startAt }    // existing ends after new starts
       });
     };
     ```
   - Checks active maintenance windows (`MaintenanceRecord`).
   - Boundary intervals are permitted (e.g. Booking 1 ending at 2:00 PM and Booking 2 starting at 2:00 PM do not conflict).
3. **Write & Release:**
   - The booking document is created.
   - The lock is atomically released in a `finally` block via `releaseLock(resourceId, lockHolder)`.
   - If the server process crashes mid-flight, MongoDB's TTL index automatically purges orphaned locks after 30 seconds.
4. **Idempotency Protection:**
   - Clients supply an `idempotencyKey` header or payload.
   - If a network retry occurs, the system safely returns the existing reservation with `200 OK` rather than generating a duplicate.

---

## 📡 API Reference & Endpoint Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new student account (role locked to student) |
| `POST` | `/api/auth/login` | Public | Sign in and receive HttpOnly cookie & token |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token and clear cookies |
| `GET` | `/api/auth/me` | Authenticated | Fetch current authenticated user |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token |

### Student & User Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Authenticated | Fetch authenticated user profile |
| `PATCH` | `/api/users/me` | Authenticated | Update allowed profile fields (name, department, year) |
| `GET` | `/api/users` | Admin | Search, filter, and paginate all accounts |
| `GET` | `/api/users/:id` | Self or Admin | Fetch specific user profile |
| `PATCH` | `/api/users/:id/status` | Admin | Activate or deactivate account (last-admin guard) |
| `PATCH` | `/api/users/:id/role` | Admin | Change account role (`student`, `manager`, `admin`) |

### Resources (`/api/resources`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/resources` | Public | List catalog resources with category/search filters |
| `GET` | `/api/resources/:id` | Public | Fetch resource specifications and booking policies |
| `GET` | `/api/resources/:id/availability` | Public | Check if `startAt` and `endAt` are available |
| `POST` | `/api/resources` | Manager/Admin | Create new facility or gear package |
| `PATCH` | `/api/resources/:id` | Manager/Admin | Update specifications, capacity, or policies |
| `DELETE` | `/api/resources/:id` | Manager/Admin | Safe soft-archive (preserves existing bookings) |

### Bookings & Facility Operations (`/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Authenticated | Create concurrency-safe reservation |
| `GET` | `/api/bookings/me` | Authenticated | List current student's reservations |
| `GET` | `/api/bookings` | Manager/Admin | List all campus reservations with filters |
| `GET` | `/api/bookings/:id` | Self or Staff | Get details of a reservation |
| `PATCH` | `/api/bookings/:id/cancel` | Self or Staff | Cancel active reservation (releases slot) |
| `PATCH` | `/api/bookings/:id/reschedule` | Self or Staff | Reschedule booking to another slot |
| `PATCH` | `/api/bookings/:id/approve` | Manager/Admin | Approve pending reservation |
| `PATCH` | `/api/bookings/:id/reject` | Manager/Admin | Reject pending reservation with reason |
| `POST` | `/api/bookings/:id/check-out` | Manager/Admin | Handover physical asset with condition rating |
| `POST` | `/api/bookings/:id/return` | Manager/Admin | Accept asset return and mark completed |

### Maintenance & Analytics
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/maintenance` | Manager/Admin | Schedule maintenance window (blocks conflicting bookings) |
| `GET` | `/api/maintenance` | Manager/Admin | List maintenance records |
| `GET` | `/api/analytics/utilization` | Manager/Admin | Aggregated utilization statistics |

---

## 📊 Database Schemas & Indexes

1. **User Collection:**
   - Indexes: `{ email: 1 }` (unique), `{ studentId: 1 }` (unique, sparse), `{ role: 1 }`, `{ department: 1, year: 1 }`, `{ isActive: 1 }`.
2. **Resource Collection:**
   - Indexes: `{ category: 1, status: 1 }`, `{ location: 1 }`, text index on `{ name, description, location }`, `{ isDeleted: 1 }`.
3. **Booking Collection:**
   - Indexes: `{ resource: 1, status: 1, startAt: 1, endAt: 1 }` (compound conflict query), `{ user: 1, createdAt: -1 }`, `{ idempotencyKey: 1 }` (unique, sparse).
4. **AssetTransaction Collection:**
   - Indexes: `{ booking: 1, isActive: 1 }` (unique partial index to prevent duplicate active checkouts), `{ resource: 1 }`.
5. **MaintenanceRecord Collection:**
   - Indexes: `{ resource: 1, status: 1, startAt: 1, endAt: 1 }`.
6. **ResourceLock Collection:**
   - Indexes: `{ resource: 1 }` (unique mutex), `{ expiresAt: 1 }` (TTL index).

---

## 🧪 Automated Testing Suite

ResourceFlow includes a comprehensive automated test suite testing all phases:

```bash
cd backend
npm test
```

### Verified Test Suites (18 of 18 Passing):
```
✔ 1. MongoDB connection is active and responsive
✔ 2. Student registration hashes password and defaults role to student
✔ 3. Rejects duplicate email and duplicate student ID
✔ 4. Successful login returns token and safe user; invalid credentials are rejected
✔ 5. Deactivated user login is rejected with 403
✔ 6. Student can read and update their own allowed profile fields only
✔ 7. Student role is blocked from admin routes with 403 Forbidden
✔ 8. Student cannot view or edit another student profile via direct ID
✔ 9. Admin can list, filter, paginate users and toggle active status (with last-admin guard)
✔ 10. Resource CRUD and validation for managers and public availability
✔ 11. Booking lifecycle: create, reschedule, cancel, and manager approval
✔ 12. Overlapping booking is rejected with 409 Conflict
✔ 13. Concurrency test: Simultaneous requests for the exact same slot allow exactly one winner
✔ 14. Non-overlapping reservations succeed concurrently
✔ 15. Cancelled bookings release reservations for subsequent bookings
✔ 16. Maintenance windows block bookings for that period
✔ 17. Failed operations release resource lock cleanly
✔ 18. Repeated idempotent booking requests return existing booking without creating duplicates
```

---

## 🛡️ Security & Hardening Checklist

- [x] **Password Protection:** Plaintext passwords are never saved. Salted hashes generated via Bcrypt.
- [x] **Mass Assignment Defense:** Registration forces `role = 'student'`. Profile updates use strict allowlists (`name`, `department`, `year`).
- [x] **Sanitization:** Password hashes and refresh token hashes are explicitly excluded from model JSON serialization (`select: false`).
- [x] **Brute-Force Rate Limiting:** Authentication endpoints are rate-limited per IP.
- [x] **NoSQL Injection Defense:** Mongoose schema type-casting and Zod strict parsing neutralize query injection.
- [x] **Admin Safeguard:** Admins cannot deactivate their own accounts or demote the sole active administrator.
- [x] **Deactivated Account Invalidation:** Deactivated accounts cannot obtain new sessions or create bookings.
- [x] **CORS & HTTP Security:** Helmet sets security headers, and CORS strictly validates allowed frontend origins with credentials.

---

## 🚢 Known Limitations & Production Deployment

1. **HTTPS in Production:** In production deployments, ensure `COOKIE_SECURE=true` and `NODE_ENV=production` are set.
2. **Reverse Proxy:** If running behind NGINX or Cloudflare, add `app.set('trust proxy', 1);` in `app.js` to ensure IP rate limiting functions properly.
3. **MongoDB Transactions:** The locking engine works on standalone MongoDB without requiring a multi-server replica set. If deploying to MongoDB Atlas, full multi-document replica set transactions can be toggled in `database.js`.

---

*ResourceFlow is ready for deployment across college campus environments.*
