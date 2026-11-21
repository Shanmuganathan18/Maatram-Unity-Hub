# Maatram Student Availability Planner (MH26-03)

> **Enterprise Multi-Portal Availability Planning & Regional Event Coordination Platform**  
> Three dedicated React frontends + One centralized Node.js/Express backend + MySQL (Prisma ORM) + Supabase Auth + Nodemailer SMTP.

---

## 1. System Architecture

The **Maatram Student Availability Planner** solves the complex coordination challenge of scheduling training boot camps, mock interviews, college visits, and document verifications for hundreds of scholarship students across regional zones.

```text
                                MAATRAM FOUNDATION PLATFORM
                                             |
            -------------------------------------------------------------------
            |                                 |                               |
            v                                 v                               v
     STUDENT PORTAL                    OFFICER PORTAL                   ADMIN PORTAL
   React + Vite (:5173)              React + Vite (:5174)             React + Vite (:5175)
            |                                 |                               |
            -------------------------------------------------------------------
                                             |
                                             v
                                    SHARED REST BACKEND API
                                 Node.js + Express.js (:5000)
                                             |
      ---------------------------------------------------------------------------------
      |                        |                         |                            |
      v                        v                         v                            v
  Supabase Auth        Zone Isolation &          Email Delivery Queue          Background Jobs &
  & Google OAuth          RBAC Engine             (Gmail SMTP 587)              Audit Logging
      |                        |                         |                            |
      ---------------------------------------------------------------------------------
                                             |
                                             v
                                         PRISMA ORM
                                             |
                                             v
                                      MYSQL DB (:3306)
                                       (maatram_db)
```

---

## 2. Port Allocation Reference

| Application / Service | Local Port | URL | Role & Purpose |
|---|---|---|---|
| **Student Portal** | `5173` | `http://localhost:5173` | Weekly availability submission, event RSVPs, notifications, profile |
| **Officer Portal** | `5174` | `http://localhost:5174` | Zonal student heatmap, event scheduling, attendance tracking, zone isolation |
| **Admin Portal** | `5175` | `http://localhost:5175` | Unified system administration, single & bulk provisioning, email audit logs |
| **Backend REST API** | `5000` | `http://localhost:5000/api/v1` | Central API, auth, business logic, jobs, SSE |
| **Backend Health** | `5000` | `http://localhost:5000/health` | Diagnostic status (200 OK) |
| **MySQL Database** | `3306` | `localhost:3306` | Relational storage (`maatram_db`) |

---

## 3. Core Business & Security Rules

1. **Admin-Controlled Account Provisioning**:
   - There is **no public self-registration**. Only authorized Administrators can provision Student and Officer accounts.
   - Public registration links are not exposed on the login portals.
2. **Existing-Account-Only Authentication**:
   - Users must have a pre-provisioned application record in MySQL matching their registered email address.
   - Any unrecognized or unapproved personal Gmail/Google login attempt is rejected with HTTP `403 Forbidden`.
3. **Mandatory First-Time Password Change**:
   - New accounts are provisioned with temporary passwords (e.g. `Maatram@2026`) and flagged with `mustChangePassword = true`.
   - On first login, students and officers are immediately guided to set a new password complying with security complexity policies.
4. **Strong Password Policy**:
   - Minimum 8 characters.
   - At least 1 uppercase letter (`A-Z`).
   - At least 1 lowercase letter (`a-z`).
   - At least 1 numeric digit (`0-9`).
   - At least 1 special character (`!@#$%^&*...`).
5. **Officer Regional Zone Isolation**:
   - Officers can only view students, colleges, availability heatmaps, and events within their assigned Zone.
   - Zone context is derived strictly from the database profile, never from client input. Cross-zone access is rejected with `403 ZoneAccessError`.
6. **Unified Single Admin Architecture**:
   - All administrative functions are managed under the unified `ADMIN` role. No artificial super-admin hierarchy is required.
7. **Zero Plaintext Password Exposure**:
   - Temporary passwords exist only in-memory during SMTP dispatch. They are **never** stored in database logs, audit entries, or API responses.
8. **Durable Database Email Queue & Crash Recovery**:
   - Outbox pattern backed by MySQL `email_delivery_logs`.
   - Atomic job locking with worker identification and timestamps.
   - Automatic recovery of abandoned/stuck jobs (`lockedAt > 5 min`).
   - Exponential retry backoff ($30\text{s} \times 2^{\text{attempt}}$) capped at 5 max attempts.
   - Unique idempotency keys prevent duplicate email dispatch.
9. **Strict Password Safety on Email Retries**:
   - Email retries **never** alter or reset passwords in Supabase Auth or MySQL.
   - Users who already activated their accounts are sent reminder instructions without invalidating their existing password.
   - Re-issuing credentials requires an explicit Admin-initiated credential reset action.
10. **Non-Destructive OAuth Role Enforcement**:
    - Users attempting to authenticate to an unauthorized portal (e.g. Student signing into Admin Portal) are denied with HTTP `403 Forbidden`.
    - Supabase Auth identities are preserved; legitimate accounts are never deleted on portal mismatch.

---

## 4. Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **MySQL Server**: `v8.0` or higher (running locally on port `3306`)
- **Supabase Account**: Project configured with Authentication & Service Role
- **Google Cloud Platform Account**: For Google OAuth 2.0 Client credentials
- **Gmail Account**: With an App Password enabled for transactional SMTP emails

---

## 5. Environment Variables Configuration

### 5.1 Backend (`backend/.env`)

Create or update `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Database Connection (URL encoded password for special characters)
DATABASE_URL="mysql://root:<DB_PASSWORD>@localhost:3306/maatram_db"

# Supabase Auth Configuration
SUPABASE_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co"
SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>"
SUPABASE_JWT_SECRET="<YOUR_SUPABASE_JWT_SECRET>"

# Email Configuration (Nodemailer / Gmail SMTP Port 587 STARTTLS)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="<YOUR_SMTP_USER_EMAIL>"
SMTP_PASS="<YOUR_GMAIL_APP_PASSWORD>"
EMAIL_FROM="Maatram Foundation <<YOUR_SMTP_USER_EMAIL>>"

# Frontend URLs for CORS & Redirects
FRONTEND_STUDENT_URL="http://localhost:5173"
FRONTEND_OFFICER_URL="http://localhost:5174"
FRONTEND_ADMIN_URL="http://localhost:5175"

# App Settings
APP_TIMEZONE="Asia/Kolkata"
API_BASE_URL="http://localhost:5000"
STORAGE_PROVIDER="local"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
LOG_LEVEL="debug"
LOG_TO_FILE="false"
```

### 5.2 Student Portal (`frontend/student-portal/.env`)

```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
VITE_SUPABASE_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
```

### 5.3 Officer Portal (`frontend/officer-portal/.env`)

```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
VITE_SUPABASE_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
```

### 5.4 Admin Portal (`frontend/admin-portal/.env`)

```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
VITE_SUPABASE_URL="https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
```

---

## 6. Database Setup & Seeding

1. Open MySQL and ensure the database exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS maatram_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Push the Prisma schema to create all tables, indexes, and enums:
   ```bash
   cd backend
   npx prisma db push
   ```
3. Seed default administrative roles, regional zones, institutions, and demo accounts:
   ```bash
   npm run db:seed
   ```
4. *(Optional)* Bootstrap a primary Administrator account:
   ```bash
   npm run bootstrap:admin
   ```

---

## 7. Google OAuth & Supabase Configuration

To enable **Google Sign-In** across all three portals without `redirect_uri_mismatch` errors:

### Step 1: Google Cloud Console
1. Navigate to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create or select your project.
3. In **OAuth consent screen**, set User Type to **External** and provide App name and support email.
4. Under **Credentials** → **Create Credentials** → **OAuth client ID**:
   - **Application type**: Web application.
   - **Name**: Maatram Multi-Portal Client.
   - **Authorized redirect URIs** (CRITICAL): Add the Supabase Auth callback URL:
     ```text
     https://buaxnjwzowvssfnhqwcx.supabase.co/auth/v1/callback
     ```
5. Click **Create** and copy your **Client ID** and **Client Secret**.

### Step 2: Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Google**:
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.
2. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: Add all three portal origins with wildcards:
     ```text
     http://localhost:5173/**
     http://localhost:5174/**
     http://localhost:5175/**
     ```
   - Click **Save**.

---

## 8. Starting All Portals & Backend

Run the backend and all three frontend portals in separate terminal windows:

### Terminal 1: Backend API Server
```bash
cd backend
npm run dev
```
*Accessible at: `http://localhost:5000/api/v1` (Health: `http://localhost:5000/health`)*

### Terminal 2: Student Portal
```bash
cd frontend/student-portal
npm run dev
```
*Accessible at: `http://localhost:5173`*

### Terminal 3: Officer Portal
```bash
cd frontend/officer-portal
npm run dev
```
*Accessible at: `http://localhost:5174`*

### Terminal 4: Admin Portal
```bash
cd frontend/admin-portal
npm run dev
```
*Accessible at: `http://localhost:5175`*

#### Simplified 9-Menu Admin Navigation:
1. **Dashboard** (`/dashboard`): System metrics, account health, weekly availability overview.
2. **People & Access** (`/people`): Students (`?tab=students`), Officers (`?tab=officers`), Admins (`?tab=admins`), Account Activation & Credentials (`?tab=activation`).
3. **Institutions & Zones** (`/institutions-zones`): Regional Zones (`?tab=zones`), Partner Institutions (`?tab=institutions`), Academic Departments (`?tab=departments`).
4. **Events & Availability** (`/events-availability`): Availability Monitoring (`?tab=availability`), Events & Drives (`?tab=events`), Attendance Records (`?tab=attendance`).
5. **Notifications & Communication** (`/communication`): Credential Email Centre (`?tab=emails`), In-App Notifications (`?tab=notifications`), Announcements Broadcast (`?tab=announcements`).
6. **Reports & Analytics** (`/reports`): Performance Overview (`?tab=overview`), Compliance Export Centre (`?tab=export`).
7. **System Settings** (`/settings`): General (`?tab=general`), Security (`?tab=security`), Roles & Permissions (`?tab=permissions`), Configuration (`?tab=system`).
8. **Activity & Audit Logs** (`/activity-logs`): Full system audit history.
9. **Help & Support** (`/support`): Ticket triage and user assistance.

---

## 9. Demo Accounts & Credentials

| Role | Email Address | Default Password | Initial Action |
|---|---|---|---|
| **Administrator** | `hemeshkumar576@gmail.com` | `Maatram@2026` | Full system governance across all zones & records |
| **Zone A Officer (Chennai)** | `officer.a@maatram-demo.example` | `Maatram@2026` | Manages Chennai zone students, events & attendance |
| **Zone B Officer (Coimbatore)** | `officer.b@maatram-demo.example` | `Maatram@2026` | Manages Coimbatore zone students, events & attendance |
| **Student (Ananya - CIT)** | `ananya.demo@example.org` | `Maatram@2026` | Availability submission & event RSVPs |
| **Student (Karthik - CIT)** | `karthik.demo@example.org` | `Maatram@2026` | Availability submission & event RSVPs |

> **Note**: Accounts created with temporary passwords will display a **Mandatory Password Change** modal on their first login. Enter a new password complying with the complexity policy to complete activation.

---

## 10. Automated Test Suite Execution

Run the complete backend integration and unit test suite (**82 tests across 10 test suites**, 100% passing):

```bash
cd backend
npm test
```

### Test Suites Included:
- `tests/securityHardening.test.js`: **Security & Reliability Hardening**: Verifies email retries never overwrite user passwords (active vs pending), verifies durable database queue processing, verifies crash recovery for interrupted/stuck worker jobs, and verifies Google OAuth portal mismatch rejection does not delete Supabase Auth identities.
- `tests/e2eVerification.test.js`: Full end-to-end integration covering database CRUD, password policies, Google OAuth, RBAC, zone isolation, and error handling.
- `tests/emailActivation.test.js`: Automatic account activation email queueing, branded templates, failure handling, and Admin retry flows.
- `tests/adminProvisioning.test.js`: Single & bulk CSV/Excel provisioning, zone derivation, and template generation.
- `tests/googleAuth.test.js`: Multi-portal Google OAuth verification, profile completion, and unauthorized account denial.
- `tests/zoneIsolation.test.js`: Officer regional isolation middleware security.
- `tests/auth.test.js`: Login, JWT authentication, and token refresh.
- `tests/availability.test.js`: Weekly availability draft saving, submission, and template management.
- `tests/adminRbac.test.js`: Role and permission access gates.
- `tests/health.test.js`: Server health diagnostics.

---

## 11. Core API Endpoints

### Authentication & Password Management
- `POST /api/v1/auth/login` — Email & password login.
- `POST /api/v1/auth/google` — Google OAuth session verification with role enforcement.
- `POST /api/v1/auth/change-password` — Authenticated password update (clears `mustChangePassword`).
- `POST /api/v1/auth/forgot-password` — Dispatches branded recovery email.
- `POST /api/v1/auth/reset-password` — Finalizes password reset with token.
- `GET /api/v1/auth/me` — Authenticated user profile, permissions, and password status.
- `POST /api/v1/auth/logout` — Revokes session.

### Student Management
- `GET /api/v1/students` — List students (filtered to officer's zone if caller is an officer).
- `GET /api/v1/students/:id` — Get student profile (enforces zone isolation).
- `POST /api/v1/students` — Admin single student provisioning (derives zone from institution).
- `PATCH /api/v1/students/:id` — Update student details.
- `POST /api/v1/students/:id/toggle-status` — Toggle status (`ACTIVE`, `INACTIVE`, `SUSPENDED`).

### Officer Management
- `GET /api/v1/officers` — List officers.
- `POST /api/v1/officers` — Admin single officer provisioning.
- `GET /api/v1/officers/dashboard` — Regional zone metrics and activity.
- `POST /api/v1/officers/:id/resend-invite` — Resend activation credentials.

### Admin Provisioning & Email Delivery Management
- `POST /api/v1/admin/students/import/preview` — Parse CSV/Excel, derive zones, detect duplicates.
- `POST /api/v1/admin/students/import/confirm` — Commit validated students and queue activation emails.
- `GET /api/v1/admin/students/import/template` — Download sample CSV/Excel template.
- `GET /api/v1/admin/dashboard` — Unified system metrics and recent audit logs.
- `GET /api/v1/admin/emails` — Paginated email delivery logs with role/status filters.
- `GET /api/v1/admin/emails/:id` — Inspect email delivery trace and error details.
- `POST /api/v1/admin/emails/:id/retry` — Retry an individual failed email dispatch via durable background queue without modifying passwords.
- `POST /api/v1/admin/emails/retry-failed` — Bulk retry eligible failed deliveries via durable queue.
- `POST /api/v1/admin/users/:userId/resend-activation` — Safe resend of activation instructions without altering user credentials.
- `POST /api/v1/admin/users/:userId/reset-credentials` — Explicit Admin action to generate or set a custom temporary password and dispatch updated credentials.

---

## 12. Troubleshooting & FAQ

### Issue: Google Sign-In displays `Error 400: redirect_uri_mismatch`
- **Cause**: Google Cloud Console is missing the Supabase OAuth callback URL.
- **Fix**: Open Google Cloud Console → **APIs & Services** → **Credentials** → Select your OAuth Client → Under **Authorized redirect URIs**, add:
  ```text
  https://buaxnjwzowvssfnhqwcx.supabase.co/auth/v1/callback
  ```
  Save and wait 60 seconds.

### Issue: "Selected institution is not valid or currently inactive"
- **Cause**: The selected college does not exist in the database or has status `INACTIVE`.
- **Fix**: Verify the institution exists in MySQL:
  ```sql
  SELECT id, code, name, zoneId, status FROM institutions;
  ```
  Ensure the institution has an assigned `zoneId` and `status = 'ACTIVE'`.

### Issue: Gmail SMTP Authentication Failed (`535 5.7.8 Bad Credentials`)
- **Cause**: Using a regular Gmail account password instead of an **App Password**.
- **Fix**: 
  1. Open your Google Account → **Security** → **2-Step Verification**.
  2. At the bottom, click **App passwords**.
  3. Create an app named "Maatram SMTP" and copy the 16-character password into `backend/.env` under `SMTP_PASS`.

### Issue: Officer denied viewing a student (`403 ZoneAccessError`)
- **Cause**: The officer is assigned to Zone A, but the requested student belongs to Zone B.
- **Explanation**: This is an intentional security control. Officers are strictly isolated to their assigned regional zone. Only Administrators can inspect students across all zones.


# Maatram-Unity-Hub
