/**
 * src/app.js
 * Express application factory.
 * Registers global middleware and all API route modules.
 * Does NOT start the server — that is server.js's job.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const corsOptions = require('./config/cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const studentRoutes = require('./modules/students/student.routes');
const officerRoutes = require('./modules/officers/officer.routes');
const adminRoutes = require('./modules/admins/admin.routes');
const zoneRoutes = require('./modules/zones/zone.routes');
const institutionRoutes = require('./modules/institutions/institution.routes');
const departmentRoutes = require('./modules/departments/department.routes');
const availabilityRoutes = require('./modules/availability/availability.routes');
const eventRoutes = require('./modules/events/event.routes');
const invitationRoutes = require('./modules/invitations/invitation.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const calendarRoutes = require('./modules/calendar/calendar.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const announcementRoutes = require('./modules/announcements/announcement.routes');
const reportRoutes = require('./modules/reports/report.routes');
const supportRoutes = require('./modules/support/support.routes');
const activityRoutes = require('./modules/activity/activity.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const roleRoutes = require('./modules/roles/role.routes');
const permissionRoutes = require('./modules/permissions/permission.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const uploadRoutes = require('./modules/uploads/upload.routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images served from /uploads
    contentSecurityPolicy: false, // SPA clients handle their own CSP
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging ──────────────────────────────────────────────────────
if (!env.isTest) {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: (req) => req.url === '/health', // Don't log health checks
    }),
  );
}

// ── Request ID (for log correlation) ─────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || require('crypto').randomUUID();
  next();
});

// ── Static file serving for local uploads ────────────────────────────────────
if (env.storage.provider === 'local') {
  app.use(
    '/uploads',
    express.static(path.resolve(env.storage.uploadDir), {
      dotfiles: 'deny',
      index: false,
    }),
  );
}

// ── Rate limiting (all API routes) ───────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health check (no auth, no rate limit) ────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'Maatram Student Availability Planner API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ── API v1 routes ─────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/students`, studentRoutes);
app.use(`${API}/officers`, officerRoutes);
app.use(`${API}/admins`, adminRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/zones`, zoneRoutes);
app.use(`${API}/institutions`, institutionRoutes);
app.use(`${API}/departments`, departmentRoutes);
app.use(`${API}/availability`, availabilityRoutes);
app.use(`${API}/events`, eventRoutes);
app.use(`${API}/invitations`, invitationRoutes);
app.use(`${API}/attendance`, attendanceRoutes);
app.use(`${API}/calendar`, calendarRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/support`, supportRoutes);
app.use(`${API}/activity`, activityRoutes);
app.use(`${API}/audit-logs`, auditRoutes);
app.use(`${API}/roles`, roleRoutes);
app.use(`${API}/permissions`, permissionRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/uploads`, uploadRoutes);

// ── 404 handler for unmatched API routes ─────────────────────────────────────
app.use(`${API}/*`, (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    errors: [],
  });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;

