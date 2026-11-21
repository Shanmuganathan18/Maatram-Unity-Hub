# Maatram Student Availability Planner — Backend API & Full-Stack System

## 1. Project Title
**MH26-03 — Maatram Student Availability Planner (Full-Stack Platform)**

---

## 2. Project Overview
The **Maatram Student Availability Planner** is a mission-critical platform designed for the **Maatram Foundation** to coordinate higher-education scholarship students, regional zone officers, and central foundation administrators.

### Core Problems Solved:
1. **Student Availability Coordination**: Students declare their weekly availability (Available vs. Unavailable, morning/afternoon/evening slots) before a strict deadline (Friday 6:00 PM IST).
2. **Regional Event Planning**: Zone Officers monitor availability heatmaps to schedule Boot Camps, Mock Interviews, College Visits, and Physical Document Verification on dates when the highest number of eligible students are free.
3. **Zone Isolation**: Regional data is strictly partitioned. Zone Officers can only view and manage institutions, students, events, and reports within their assigned zone.
4. **End-to-End Execution**: Streamlined event invitations, RSVP tracking, waitlist management, and attendance verification.

---

## 3. System Architecture

```mermaid
flowchart TD
    subgraph Frontends ["Frontend Applications (React + Vite + Tailwind)"]
        SP["Student Portal\n(Port 5173)"]
        OP["Officer Portal\n(Port 5174)"]
        AP["Admin Portal\n(Port 5175)"]
    end

    subgraph Identity ["Identity & Auth Provider"]
        SB["Supabase Auth\n(JWT Provider)"]
    end

    subgraph BackendAPI ["Shared Central Backend (Node.js + Express)"]
        MW["Security Middleware\n(Helmet, CORS, RateLimiter, JWT Verify)"]
        AUTH_MW["Authorization & Zone Scope Middleware"]
        MODS["REST API Modules\n(Auth, Availability, Events, Attendance, etc.)"]
        NOTIF["Notification Engine & SSE Stream"]
        JOBS["Background Schedulers (node-cron)"]
    end

    subgraph DatabaseLayer ["Data Tier"]
        PRISMA["Prisma ORM Client"]
        MYSQL[("MySQL 8.x Database")]
    end

    SP -->|"JWT Auth"| SB
    OP -->|"JWT Auth"| SB
    AP -->|"JWT Auth"| SB

    SP -->|"REST /api/v1"| MW
    OP -->|"REST /api/v1"| MW
    AP -->|"REST /api/v1"| MW

    MW --> AUTH_MW
    AUTH_MW --> MODS
    MODS --> NOTIF
    MODS --> PRISMA
    JOBS --> PRISMA
    PRISMA --> MYSQL
```

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js (v20+ / v24) | High-performance asynchronous execution |
| **Server Framework** | Express.js 4.x | REST API routing and middleware pipeline |
| **Database** | MySQL 8.x | Centralized ACID-compliant relational storage |
| **ORM** | Prisma 5.22+ | Type-safe queries, migrations, and declarative schema |
| **Authentication** | Supabase Auth + jsonwebtoken | Identity management, email verification, JWT signature validation |
| **Security** | Helmet, CORS, express-rate-limit | HTTP protection, origin allowlisting, brute-force defense |
| **Validation** | express-validator & Zod | Strict input sanitization and payload validation |
| **Background Jobs** | node-cron | Scheduled deadline locking, reminders, and retry queues |
| **Email Delivery** | Nodemailer | Transactional email notifications |
| **Real-time** | Server-Sent Events (SSE) | Live in-app notifications without WebSocket overhead |
| **Testing** | Jest & Supertest | Comprehensive unit, API, and authorization tests |

---

## 5. Project Folder Structure

```text
Student Availability Planner App/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Complete normalized MySQL schema (25+ models)
│   │   └── seed.js              # Deterministic database seeder with demo accounts
│   │
│   ├── src/
│   │   ├── config/              # env.js, database.js, supabase.js, cors.js
│   │   ├── middleware/          # authenticate.js, authorize.js, validateRequest.js, errorHandler.js, rateLimiter.js
│   │   ├── modules/
│   │   │   ├── auth/            # Login, registration, token verification, profile
│   │   │   ├── availability/    # 5-state weekly availability engine & zone monitoring
│   │   │   ├── events/          # Event lifecycle, categories, targeting, capacity
│   │   │   ├── invitations/     # Student RSVPs, questions/answers, waitlist promotion
│   │   │   ├── attendance/      # Single & bulk participant attendance tracking
│   │   │   ├── calendar/        # FullCalendar JSON feeds for students and officers
│   │   │   ├── notifications/   # In-app notification inbox, preferences, SSE stream
│   │   │   ├── announcements/   # Foundation-wide broadcast system
│   │   │   ├── reports/         # Zone & system reports with CSV export
│   │   │   ├── support/         # Support ticketing and message threads
│   │   │   ├── activity/        # Zone officer audit activity
│   │   │   ├── audit/           # Immutable administrative audit logs
│   │   │   ├── roles/           # RBAC permissions assignment
│   │   │   ├── permissions/     # Permission catalog & history
│   │   │   ├── settings/        # System configuration settings
│   │   │   ├── zones/           # Zone definitions & institution mapping
│   │   │   ├── institutions/    # College & institution management
│   │   │   ├── departments/     # Academic department tracking
│   │   │   ├── students/        # Student profiles & zone boundaries
│   │   │   ├── officers/        # Officer profiles & dashboard statistics
│   │   │   ├── admins/          # Admin profiles & system dashboard
│   │   │   ├── users/           # User account activation/deactivation
│   │   │   └── uploads/         # Safe file upload handling
│   │   ├── services/            # emailService, notificationService, storageService
│   │   ├── jobs/                # availabilityReminderJob, deadlineJob, eventReminderJob, notificationRetryJob
│   │   ├── utils/               # logger.js, response.js, dates.js, errors.js
│   │   ├── app.js               # Express application pipeline
│   │   └── server.js            # Server entrypoint and lifecycle hooks
│   │
│   ├── tests/                   # Jest test suites (health, auth, zone isolation, availability)
│   ├── uploads/                 # Local directory for uploaded files
│   ├── .env.example             # Documented environment variables template
│   └── package.json
│
└── frontend/
    ├── student-portal/          # React App (Port 5173)
    ├── officer-portal/          # React App (Port 5174)
    └── admin-portal/            # React App (Port 5175)
```

---

## 6. Prerequisites

Ensure you have installed:
- **Node.js**: `v20.0.0` or higher (`v24.x` recommended)
- **npm**: `v10.x` or higher
- **MySQL Server**: `v8.0` or higher (running on port `3306`)
- **Supabase Account**: (or local Supabase instance) for Auth credentials

---

## 7. Installation

### 1. Backend Dependencies
```bash
cd backend
npm install
```

### 2. Frontend Applications
Open separate terminals for each frontend:
```bash
# Student Portal
cd frontend/student-portal
npm install

# Officer Portal
cd frontend/officer-portal
npm install

# Admin Portal
cd frontend/admin-portal
npm install
```

---

## 8. Environment Configuration

Copy `.env.example` in `backend` to `.env`:
```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Application environment | `development` |
| `DATABASE_URL` | MySQL connection string | `mysql://root:password@localhost:3306/maatram_db` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | `eyJhbGciOi...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT Secret | Found in Settings → API → JWT Settings |
| `FRONTEND_STUDENT_URL` | Allowed Student Portal URL | `http://localhost:5173` |
| `FRONTEND_OFFICER_URL` | Allowed Officer Portal URL | `http://localhost:5174` |
| `FRONTEND_ADMIN_URL` | Allowed Admin Portal URL | `http://localhost:5175` |
| `APP_TIMEZONE` | Timezone for deadlines & jobs | `Asia/Kolkata` |
| `SMTP_HOST` | Email SMTP host | `smtp.gmail.com` (optional) |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Email username | `you@gmail.com` |
| `SMTP_PASS` | Email app password | `app-specific-password` |

---

## 9. MySQL Database Setup & Seeding

1. Start your local MySQL service.
2. Create the database:
   ```sql
   CREATE DATABASE maatram_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Generate the Prisma Client:
   ```bash
   npm run db:generate
   ```
4. Push the schema to MySQL:
   ```bash
   npx prisma db push
   ```
5. Seed the database with demo accounts, zones, institutions, and events:
   ```bash
   npm run db:seed
   ```
6. (Optional) Open Prisma Studio to inspect tables in your browser:
   ```bash
   npm run db:studio
   ```

---

## 10. Demo Accounts & Credentials

The seed script creates the following pre-configured demo users matching the canonical 3-role model:

| Role | Name | Email | Password | Scope / Zone |
|---|---|---|---|---|
| **Admin** | Sunita Rao | `admin@maatram-demo.example` | `Demo@123` | System-wide (All zones & permissions) |
| **Admin** | Rajesh Menon | `admin2@maatram-demo.example` | `Demo@123` | System-wide (All zones & permissions) |
| **Zone Officer A** | Arun Kumar | `officer.a@maatram-demo.example` | `Demo@123` | **Zone A (Chennai)** only |
| **Zone Officer B** | Priya Ramesh | `officer.b@maatram-demo.example` | `Demo@123` | **Zone B (Coimbatore)** only |
| **Student 1** | Ananya S. | `ananya.demo@example.org` | `Demo@123` | Zone A, SVIT, 3rd Year |
| **Student 2** | Karthik R. | `karthik.demo@example.org` | `Demo@123` | Zone A, MCE, 2nd Year |
| **Student 3** | Meera V. | `meera.demo@example.org` | `Demo@123` | Zone B, NCAS, 4th Year |

---

## 11. Single Admin Role Model & Bootstrap Architecture

### Role Architecture
The platform enforces strictly three application roles:
- **`STUDENT`**: Access only own profile, availability submission, and event invitations.
- **`OFFICER`**: Access only information and events belonging strictly to their assigned zone.
- **`ADMIN`**: Complete, unified system-wide access across all zones, institutions, officers, students, events, reports, settings, and administrators.

There are:
- **No Super Admin role**.
- **No Read-only Admin role**.
- **No admin hierarchy or permission tiers**.
- Multiple Admin accounts may exist, but every Admin account has identical system-wide access.

### Secure Initial Admin Bootstrap
Because there are no initial admin credentials in source code and no public admin registration endpoint:
1. Run the secure bootstrap script from the terminal:
   ```bash
   cd backend
   npm run bootstrap:admin -- --email admin@maatram.org --password YourSecurePassword123! --name "System Administrator"
   ```
2. **Security Protections Built-in**:
   - **Tamper Prevention**: The script checks if an `ADMIN` account already exists in the database. If one exists, execution terminates immediately with an error, preventing unauthorized backdoor creation.
   - **Identity Linking**: Creates/locates the user in Supabase Auth and links the Supabase UID to the MySQL `users` and `admin_profiles` tables with `adminId: ADM-001`.
   - **Audit Trail**: Generates a permanent `admin.bootstrap` record in `audit_logs`.

### Creating Additional Admin Accounts
Additional Administrators can **only** be created by an already authenticated Administrator through the Admin Portal (`/admins`):
1. Admin logs in to the Admin Portal (`http://localhost:5175`).
2. Navigates to **Admin Management** (`/admins`).
3. Clicks **Create Admin** and enters Name, Email, and Phone.
4. Backend validates input, checks for duplicates, creates the Supabase Auth account, creates the MySQL `ADMIN` profile, sends an onboarding invitation email, and audits the event.
5. **Protection Rules**:
   - Self-deactivation is strictly forbidden.
   - Deactivation of the last active Administrator is blocked.
   - Neither Students nor Officers can access admin creation endpoints (403 Forbidden).

---

## 12. Running the System

### Start the Backend:
```bash
cd backend
npm run dev
```
- Server URL: `http://localhost:5000`
- Health check: `http://localhost:5000/health`
- Base API: `http://localhost:5000/api/v1`

### Start the Frontends:
In separate terminal windows:
```bash
# Student Portal -> http://localhost:5173
cd frontend/student-portal
npm run dev

# Officer Portal -> http://localhost:5174
cd frontend/officer-portal
npm run dev

# Admin Portal -> http://localhost:5175
cd frontend/admin-portal
npm run dev
```

---

## 13. Automated Testing

Run the automated test suite with Jest:
```bash
cd backend
npm test
```

### Tests Covered:
- **Health Check**: Server uptime, versioning, 404 handler.
- **Authentication**: Email/password validation, missing tokens, malformed tokens, forged tokens.
- **Admin Role RBAC & Access Control**: Verifies the unified `ADMIN` model, tests that both Admin accounts have identical permissions, rejects obsolete Super/Read-only Admin tiers, tests that students and officers are forbidden from creating Admins (403), verifies that deactivated Admins are blocked, and validates that self-deactivation and last-admin deactivation are prevented.
- **Zone Isolation**: Verifies that zone officers cannot access records from outside their zone.
- **Availability Rules**: Monday-Sunday calculations, Friday 18:05 IST deadline enforcement, draft and locking states.

---

## 14. Zone-Based Data Isolation Security Guarantee

Every Officer API endpoint applies strict server-side zone isolation:
1. The officer's JWT token is verified on the backend.
2. The officer's profile is loaded from MySQL to extract their official `zoneId`.
3. All database queries for students, institutions, availability, events, and attendance append:
   ```sql
   WHERE zone_id = <authenticated_officer_zone_id>
   ```
4. **Any attempt to manipulate IDs** in URL parameters (e.g. attempting to read a student from another zone) immediately throws a `403 Forbidden` (`ZONE_ACCESS_DENIED`).

---

## 15. Background Jobs (Scheduled Tasks)

The backend runs scheduled jobs in the `Asia/Kolkata` timezone:
- **Availability Reminders**: Runs Wednesday and Friday mornings to notify students who have not yet submitted availability.
- **Deadline Lock**: Runs Friday at 18:05 IST to automatically lock passed week submissions.
- **Event Reminders**: Runs daily at 07:00 AM IST to remind students of confirmed events in the next 24 hours.
- **Notification Retry**: Runs every 15 minutes to retry failed email deliveries.

---

## 16. Google Sign-In & Supabase OAuth Integration

All three portals (Student, Officer, Admin) support Google Sign-In through Supabase OAuth 2.0 connected to the shared backend.

### Architecture & Security Workflow:
1. **Frontend Initiation**: Each portal initiates Google Sign-In via `@supabase/supabase-js`:
   ```javascript
   supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/callback` }
   });
   ```
2. **Supabase Callback**: Google redirects to Supabase's managed OAuth callback:
   `https://buaxnjwzowvssfnhqwcx.supabase.co/auth/v1/callback`
3. **Portal Return**: Supabase redirects back to the originating portal's `/auth/callback`:
   - Student Portal: `http://localhost:5173/auth/callback`
   - Officer Portal: `http://localhost:5174/auth/callback`
   - Admin Portal: `http://localhost:5175/auth/callback`
4. **Backend Token Exchange (`POST /api/v1/auth/google`)**:
   - The portal sends `{ token: session.access_token, portal: 'student'|'officer'|'admin' }`.
   - The backend validates the Supabase access token and extracts the Google user's verified email and identity.
   - **Admin Portal (`:5175`)**: Strictly checks that an existing, active `ADMIN` account matches the Google email. Unauthorized users receive `403 Forbidden`. No self-registration.
   - **Officer Portal (`:5174`)**: Strictly checks that an existing, active `OFFICER` account matches the Google email and derives their assigned `zoneId` server-side from MySQL. Unauthorized users receive `403 Forbidden`. No self-registration.
   - **Student Portal (`:5173`)**: Existing students with completed profiles enter immediately (`isComplete: true`). New Google students receive `isComplete: false` and are routed to `/complete-profile` to select their Institution, Department, Year, and Phone. The server derives their assigned `zoneId` from the selected institution.

### Google Cloud Console Setup:
1. Open [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Configure **OAuth Consent Screen** (User Type: External, App Name: *Maatram Student Availability Planner*).
3. Create **OAuth 2.0 Client IDs** (Web Application):
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `http://localhost:5175`
     - `https://buaxnjwzowvssfnhqwcx.supabase.co`
   - **Authorized redirect URIs**:
     - `https://buaxnjwzowvssfnhqwcx.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** and **Client Secret**.

### Supabase Dashboard Setup:
1. Open Supabase Project -> **Authentication** -> **Providers** -> **Google**.
2. Toggle **Enable Google provider** to ON.
3. Paste **Client ID** and **Client Secret** from Google Cloud Console.
4. Under **Authentication** -> **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs (Allowlist)**:
     - `http://localhost:5173/**`
     - `http://localhost:5174/**`
     - `http://localhost:5175/**`




---

## 13. Admin Bulk Account Provisioning & Temporary Password Lifecycle

### 1. Zero Public Registration
Self-registration is completely disabled across all three portals. Only an authorized Admin can create Student or Officer accounts.

### 2. Supported Import Formats & Template Endpoints
- **Student Templates**:
  - `GET /api/v1/admin/students/import/template?format=csv`
  - `GET /api/v1/admin/students/import/template?format=xlsx`
- **Officer Templates**:
  - `GET /api/v1/admin/officers/import/template?format=csv`
  - `GET /api/v1/admin/officers/import/template?format=xlsx`

### 3. Automatic College-to-Zone Derivation
Client-supplied zone assignments are strictly disallowed for students. The backend resolves the student's College / Institution against the database (`Institution` table) and dynamically assigns the correct `zoneId`.

### 4. Duplicate Detection & Compensation Rollback
- In-file duplicate checking (email, register number, employee ID).
- Database duplicate checking against existing users and profiles.
- When creating accounts via Supabase Admin API and MySQL, if database persistence fails, a compensation rollback immediately purges the newly created Supabase Auth user.

### 5. Temporary Passwords & Forced First-Login Change
- Common temporary password (default: `Maatram@2026`).
- All provisioned accounts are created with `must_change_password = true`.
- When users sign in (via password or Google OAuth), both backend and frontend route guards lock navigation to `/change-password` until a permanent password complying with complexity policy (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char) is saved.
- Welcome emails containing credentials and login links are automatically dispatched via Nodemailer Gmail SMTP.
