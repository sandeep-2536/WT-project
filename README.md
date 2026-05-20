# HARMS — Hospital Appointment & Resource Management System

A production-ready full-stack MERN application for managing hospital appointments with role-based access for Patients, Doctors, Nurses, and Admins.

---

## Architecture Overview

### Why Context API over Redux?
This project uses **React Context API + TanStack Query** instead of Redux Toolkit because:
- Server state (appointments, doctors, users) is managed by TanStack Query (caching, refetching, mutations)
- Client/UI state is minimal (auth user, loading flags) — Context is sufficient
- Redux adds boilerplate without meaningful benefit at this scale
- TanStack Query handles background refresh, stale data, pagination natively

### Backend MVC Structure
```
server/
├── controllers/      ← HTTP layer: parse req, call service, send res
├── services/         ← Business logic: appointment lifecycle, nurse allocation
├── models/           ← Mongoose schemas with indexes and virtuals
├── routes/           ← Express routers with middleware chains
├── middleware/       ← auth, role guard, validation, error handler
├── utils/            ← jwt helpers, response helpers
├── config/           ← DB connection
└── server.js         ← HTTP + Socket.io server bootstrap
```

### Appointment Lifecycle (Critical Flow)
```
Patient books → pending appointment created
     ↓
Doctor approves/rejects
     ↓ (on approve)
NurseAllocationService finds available nurse (lowest load, available day)
     ↓
appointment.status = 'confirmed'
appointment.nurseId = assigned nurse
nurse.currentLoad++
     ↓
Notifications sent to patient + nurse via DB + Socket.io
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form v7 |
| HTTP client | Axios (with refresh interceptor) |
| Charts | Recharts |
| Real-time | Socket.io client |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Real-time server | Socket.io |
| Validation | express-validator |
| Security | helmet, express-rate-limit, cors |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone & Install

```bash
git clone <your-repo>
cd harms

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/harms
JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:5173
PORT=5000
```

### 3. Seed the Database

```bash
cd server
npm run seed
```

This creates demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@harms.dev | Admin@1234 |
| Doctor | priya@harms.dev | Doctor@1234 |
| Doctor | rajan@harms.dev | Doctor@1234 |
| Nurse | deepa@harms.dev | Nurse@1234 |
| Patient | amit@harms.dev | Patient@1234 |

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd server && npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173 and log in with any demo account.

---

## API Reference

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, returns JWT pair |
| POST | `/refresh` | — | Refresh access token |
| POST | `/logout` | ✓ | Invalidate refresh token |
| GET | `/me` | ✓ | Get current user |

### Appointments — `/api/appointments`
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/book` | patient | Book appointment request |
| PATCH | `/:id/approve` | doctor | Approve + auto-assign nurse |
| PATCH | `/:id/reject` | doctor | Reject with reason |
| PATCH | `/:id/cancel` | patient | Cancel appointment |
| GET | `/my` | patient | Patient's appointments |
| GET | `/doctor` | doctor | Doctor's queue |
| GET | `/nurse` | nurse | Nurse's assigned list |
| GET | `/all` | admin | All appointments (paginated) |

### Doctors — `/api/doctor`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/list` | public | List doctors with filters |
| GET | `/:id/slots?date=` | public | Get available time slots |
| GET | `/profile` | doctor | Own profile |
| PUT | `/profile` | doctor | Update profile |
| PUT | `/availability` | doctor | Set weekly availability |

### Admin — `/api/admin`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | admin | All users (paginated, filtered) |
| PATCH | `/users/:id/toggle` | admin | Activate/deactivate user |
| GET | `/doctors` | admin | All doctors |
| POST | `/doctors` | admin | Create doctor profile |
| DELETE | `/doctors/:id` | admin | Remove doctor |
| GET | `/nurses` | admin | All nurses |
| GET | `/analytics` | admin | System analytics |

---

## Features

### Patient
- Register / Login
- Search doctors by specialization
- View doctor availability and open slots for a date
- 3-step appointment booking (Doctor → Slot → Confirm)
- Alternate slot suggestions when chosen slot is booked
- View appointment history with status filters
- Cancel pending/confirmed appointments
- Real-time toast when appointment is confirmed/rejected

### Doctor
- View all appointment requests with status filters
- Approve appointments (triggers nurse auto-assignment)
- Reject appointments with optional reason (patient notified)
- Set weekly availability (days, hours, slot duration)
- Dashboard with summary stats

### Nurse
- View all assigned appointments
- Filter by date
- Dashboard with today's appointments and load indicator

### Admin
- Full user management (view, activate/deactivate, filter by role)
- Doctor management (view all, remove)
- Nurse management (view all)
- All appointments view with status and date filters
- Analytics dashboard with:
  - System-wide counts (patients, doctors, nurses, appointments)
  - Appointments by status (pie chart)
  - Monthly appointment trend (bar chart, last 6 months)

### Real-time (Socket.io)
- Patients receive live notification when appointment is confirmed or rejected
- Nurses receive live notification when assigned to an appointment
- Doctors receive live notification for new booking requests
- All notifications also persisted in DB

---

## Database Schema

### User
```js
{ name, email, password (hashed), role, isActive, refreshToken }
```

### Doctor
```js
{ userId (→User), specialization, qualifications[], experience, consultationFee, availability[], bio, rating }
// availability[]: { day, startTime, endTime, slotDuration, isAvailable }
```

### Nurse
```js
{ userId (→User), department, qualifications[], availability[], currentLoad, maxLoad }
```

### Appointment
```js
{ patientId (→User), doctorId (→Doctor), nurseId (→Nurse), date, time, status, reason,
  rejectionReason, cancellationReason, notes }
// Compound unique index: (doctorId, date, time) where status IN (pending, confirmed)
```

### Notification
```js
{ userId (→User), title, message, type, relatedAppointment, isRead }
```

### AuditLog
```js
{ userId, action, entity, entityId, details, ip, userAgent }
```

---

## Security

- **JWT access tokens** — 15 min expiry, stored in memory (localStorage only for refresh)
- **Refresh tokens** — 7-day expiry, stored in DB; rotated on each use
- **bcryptjs** — passwords hashed with cost factor 12
- **helmet** — sets security HTTP headers
- **express-rate-limit** — 200 requests per 15 min per IP
- **Role guards** — every protected route checks `req.user.role`
- **Input validation** — express-validator on all write endpoints
- **Mongoose compound index** — prevents double-booking at DB level

---

## Deployment

### Backend → Render

1. Push `server/` to GitHub
2. Create new **Web Service** on Render
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables (MONGO_URI, JWT_SECRET, etc.)
6. Set `CLIENT_URL` to your Vercel frontend URL

### Frontend → Vercel

1. Push `client/` to GitHub
2. Import project on Vercel
3. Framework preset: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-render-service.onrender.com`
5. Update `client/src/api/axios.js` baseURL to use `import.meta.env.VITE_API_URL`

### Database → MongoDB Atlas

1. Create free M0 cluster on mongodb.com
2. Add IP whitelist: `0.0.0.0/0` (allow all) for Render
3. Create DB user and copy connection string to `MONGO_URI`

---

## Project Structure (Full)

```
harms/
├── server/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── appointmentController.js
│   │   ├── doctorController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validationMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Doctor.js
│   │   ├── Nurse.js
│   │   ├── Appointment.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── nurseRoutes.js
│   │   ├── patientRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   ├── appointmentService.js   ← core business logic
│   │   ├── notificationService.js
│   │   ├── socketService.js
│   │   └── auditLogger.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── response.js
│   │   └── seed.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── client/
    ├── src/
    │   ├── api/
    │   │   ├── axios.js            ← interceptor + refresh
    │   │   ├── services.js         ← all API calls
    │   │   └── socket.js           ← socket.io client
    │   ├── context/
    │   │   └── AuthContext.jsx     ← global auth state
    │   ├── routes/
    │   │   └── ProtectedRoute.jsx  ← role guards
    │   ├── layouts/
    │   │   ├── SidebarLayout.jsx
    │   │   ├── PatientLayout.jsx
    │   │   ├── DoctorLayout.jsx
    │   │   ├── NurseLayout.jsx
    │   │   └── AdminLayout.jsx
    │   ├── components/
    │   │   └── ui.jsx              ← StatCard, Badge, Pagination, Modal...
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── patient/
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── BookAppointment.jsx
    │   │   │   └── MyAppointments.jsx
    │   │   ├── doctor/
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── Appointments.jsx
    │   │   │   └── Availability.jsx
    │   │   ├── nurse/
    │   │   │   ├── Dashboard.jsx
    │   │   │   └── Schedule.jsx
    │   │   └── admin/
    │   │       ├── Dashboard.jsx
    │   │       ├── Users.jsx
    │   │       ├── Doctors.jsx
    │   │       ├── Nurses.jsx
    │   │       └── Appointments.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## License
MIT
