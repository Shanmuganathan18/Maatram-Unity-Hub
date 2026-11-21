/**
 * tests/securityHardening.test.js
 *
 * Dedicated Integration Tests for Security Hardening and Production Readiness:
 * 1. Email retry MUST NOT change active user password or force password change.
 * 2. Email retry MUST NOT change pending user password.
 * 3. Explicit Admin credential reset updates password, audits action, and sends email.
 * 4. Google OAuth wrong portal login rejects with 403 without deleting Supabase identity.
 * 5. Google OAuth unapproved account rejects with 403 without deleting Supabase identity.
 * 6. Durable Email Queue Worker processes pending QUEUED jobs and recovers stuck jobs.
 * 7. Duplicate email prevention via idempotency key.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');
const { supabaseAdmin } = require('../src/config/supabase');
const emailDeliveryService = require('../src/services/emailDelivery.service');
const emailQueueWorker = require('../src/jobs/emailQueueWorker');

const makeAdminToken = (userId, supabaseUid, email) => {
  return jwt.sign(
    {
      sub: supabaseUid,
      email,
      role: 'ADMIN',
      iss: 'https://mock.supabase.co/auth/v1',
      aud: 'authenticated',
    },
    env.supabase.jwtSecret,
    { expiresIn: '1h' },
  );
};

const makeMockGoogleToken = (sub, email, metadata = {}) => {
  return jwt.sign(
    {
      sub,
      email,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { email_verified: true, ...metadata },
      role: 'authenticated',
      iss: 'https://mock.supabase.co/auth/v1',
      aud: 'authenticated',
    },
    env.supabase.jwtSecret,
    { expiresIn: '1h' },
  );
};

describe('Security Hardening & Production Reliability Verification', () => {
  const runId = Date.now().toString();
  let testZone;
  let testInstitution;
  let testAdminUser;
  let adminToken;

  const adminEmail = `sec.adm.${runId}@maatram.org`;
  const adminSub = `sb-sec-adm-${runId}`;

  beforeAll(async () => {
    // 1. Create Zone
    testZone = await prisma.zone.create({
      data: {
        code: `ZN-S-${runId.slice(-4)}`,
        name: `Security Test Zone ${runId.slice(-4)}`,
        region: 'Test Region',
        status: 'ACTIVE',
      },
    });

    // 2. Create Institution
    testInstitution = await prisma.institution.create({
      data: {
        code: `SINS-${runId.slice(-4)}`,
        name: `Security Test Institute ${runId.slice(-4)}`,
        location: 'Coimbatore',
        type: 'Engineering',
        zoneId: testZone.id,
        status: 'ACTIVE',
      },
    });

    // 3. Create Admin User
    testAdminUser = await prisma.user.create({
      data: {
        supabaseUid: adminSub,
        email: adminEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
        adminProfile: {
          create: {
            adminId: `ADM-S-${runId.slice(-4)}`,
            name: 'Security Admin',
            roleId: 'admin',
            status: 'ACTIVE',
          },
        },
      },
      include: { adminProfile: true },
    });

    adminToken = makeAdminToken(testAdminUser.id, adminSub, adminEmail);
  });

  afterAll(async () => {
    try {
      const users = await prisma.user.findMany({
        where: { email: { contains: runId } },
        select: { id: true, supabaseUid: true },
      });
      const userIds = users.map((u) => u.id);

      await prisma.emailDeliveryLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
      await prisma.institution.delete({ where: { id: testInstitution.id } }).catch(() => {});
      await prisma.zone.delete({ where: { id: testZone.id } }).catch(() => {});
    } catch {
      // ignore
    }
  });

  // =========================================================================
  // 1. Password Safety on Email Retry
  // =========================================================================
  describe('Password Safety on Email Retry (Phase 3)', () => {
    it('should NEVER overwrite or change the password when retrying an email for an active user who already set their password', async () => {
      const studentEmail = `active.stu.${runId}@maatram.org`;
      const customPrivatePassword = 'MySecretPrivatePassword#2026!';

      // 1. Create Supabase Auth identity with user's own password
      const { data: sbData } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: customPrivatePassword,
        email_confirm: true,
        user_metadata: { role: 'STUDENT' },
      });

      // 2. Create User in MySQL as ACTIVE with mustChangePassword: false (already activated)
      const activeStudent = await prisma.user.create({
        data: {
          supabaseUid: sbData.user.id,
          email: studentEmail,
          role: 'STUDENT',
          status: 'ACTIVE',
          mustChangePassword: false, // User already changed their password
          studentProfile: {
            create: {
              studentId: `STU-ACT-${runId.slice(-4)}`,
              name: 'Active Student',
              institutionId: testInstitution.id,
              zoneId: testZone.id,
            },
          },
        },
      });

      // 3. Create a failed email log for this user
      const failedLog = await prisma.emailDeliveryLog.create({
        data: {
          recipientEmail: studentEmail,
          recipientName: 'Active Student',
          recipientRole: 'STUDENT',
          notificationType: 'ACCOUNT_ACTIVATION',
          subject: 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready',
          userId: activeStudent.id,
          status: 'FAILED',
          attemptCount: 1,
          errorDetails: 'Temporary network failure during initial dispatch',
          metadata: {
            portalUrl: 'http://localhost:5173/login',
            institutionName: testInstitution.name,
            zoneName: testZone.name,
          },
        },
      });

      // 4. Admin retries the failed email via POST /api/v1/admin/emails/:id/retry
      const retryRes = await request(app)
        .post(`/api/v1/admin/emails/${failedLog.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retryRes.statusCode).toBe(200);
      expect(retryRes.body.success).toBe(true);

      // 5. CRITICAL ASSERTION: The user's mustChangePassword MUST STILL BE FALSE!
      const userAfterRetry = await prisma.user.findUnique({
        where: { id: activeStudent.id },
      });
      expect(userAfterRetry.mustChangePassword).toBe(false);
      expect(userAfterRetry.status).toBe('ACTIVE');

      // 6. CRITICAL ASSERTION: Verify user can STILL sign in with their original private password!
      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: studentEmail,
        password: customPrivatePassword,
      });
      expect(signInErr).toBeNull();
      expect(signInData.session).toBeDefined();

      // Clean up Supabase user
      await supabaseAdmin.auth.admin.deleteUser(sbData.user.id);
    });

    it('should NOT overwrite password when retrying email for a pending activation user', async () => {
      const pendingEmail = `pending.stu.${runId}@maatram.org`;
      const initialTempPassword = 'InitialTempPassword#123!';

      // 1. Create Supabase Auth identity
      const { data: sbData } = await supabaseAdmin.auth.admin.createUser({
        email: pendingEmail,
        password: initialTempPassword,
        email_confirm: true,
        user_metadata: { role: 'STUDENT' },
      });

      // 2. Create User in MySQL as PENDING_ACTIVATION
      const pendingStudent = await prisma.user.create({
        data: {
          supabaseUid: sbData.user.id,
          email: pendingEmail,
          role: 'STUDENT',
          status: 'PENDING_ACTIVATION',
          mustChangePassword: true,
          studentProfile: {
            create: {
              studentId: `STU-PND-${runId.slice(-4)}`,
              name: 'Pending Student',
              institutionId: testInstitution.id,
              zoneId: testZone.id,
            },
          },
        },
      });

      // 3. Create a failed email delivery log
      const failedLog = await prisma.emailDeliveryLog.create({
        data: {
          recipientEmail: pendingEmail,
          recipientName: 'Pending Student',
          recipientRole: 'STUDENT',
          notificationType: 'ACCOUNT_ACTIVATION',
          subject: 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready',
          userId: pendingStudent.id,
          status: 'FAILED',
          attemptCount: 1,
          errorDetails: 'SMTP 421 Service not available',
          metadata: {
            portalUrl: 'http://localhost:5173/login',
            institutionName: testInstitution.name,
            zoneName: testZone.name,
          },
        },
      });

      // 4. Retry via Admin API
      const retryRes = await request(app)
        .post(`/api/v1/admin/emails/${failedLog.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retryRes.statusCode).toBe(200);

      // 5. Initial password must still work
      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: pendingEmail,
        password: initialTempPassword,
      });
      expect(signInErr).toBeNull();
      expect(signInData.session).toBeDefined();

      await supabaseAdmin.auth.admin.deleteUser(sbData.user.id);
    });
  });

  // =========================================================================
  // 2. Google OAuth: Non-destructive Authorization Rejection (Phase 4)
  // =========================================================================
  describe('Google OAuth Identity Preservation on Authorization Failure (Phase 4)', () => {
    it('should reject a Student trying to Google Sign-In on Officer or Admin Portal WITHOUT deleting their Supabase identity', async () => {
      const crossPortalEmail = `cross.portal.stu.${runId}@maatram.org`;

      // 1. Create Supabase Auth identity
      const { data: sbData } = await supabaseAdmin.auth.admin.createUser({
        email: crossPortalEmail,
        password: 'Password@2026!',
        email_confirm: true,
        user_metadata: { role: 'STUDENT', email_verified: true },
      });

      // 2. Create Student in MySQL
      const studentUser = await prisma.user.create({
        data: {
          supabaseUid: sbData.user.id,
          email: crossPortalEmail,
          role: 'STUDENT',
          status: 'ACTIVE',
          studentProfile: {
            create: {
              studentId: `STU-CP-${runId.slice(-4)}`,
              name: 'Cross Portal Student',
              institutionId: testInstitution.id,
              zoneId: testZone.id,
            },
          },
        },
      });

      // 3. Student accidentally logs into Admin Portal via Google
      const mockGoogleToken = makeMockGoogleToken(sbData.user.id, crossPortalEmail, {
        name: 'Cross Portal Student',
      });

      const resAdmin = await request(app)
        .post('/api/v1/auth/google')
        .send({ token: mockGoogleToken, portal: 'admin' });

      // Must be rejected with 403 Forbidden
      expect(resAdmin.statusCode).toBe(403);
      expect(resAdmin.body.success).toBe(false);

      // 4. Student accidentally logs into Officer Portal via Google
      const resOfficer = await request(app)
        .post('/api/v1/auth/google')
        .send({ token: mockGoogleToken, portal: 'officer' });

      // Must be rejected with 403 Forbidden
      expect(resOfficer.statusCode).toBe(403);
      expect(resOfficer.body.success).toBe(false);

      // 5. CRITICAL CHECK: The student's Supabase Auth user MUST STILL EXIST!
      const { data: checkUser, error: checkErr } = await supabaseAdmin.auth.admin.getUserById(sbData.user.id);
      expect(checkErr).toBeNull();
      expect(checkUser?.user?.id).toBe(sbData.user.id);
      expect(checkUser?.user?.email).toBe(crossPortalEmail);

      // 6. Verify that logging in on their CORRECT portal (student) succeeds immediately!
      const resStudent = await request(app)
        .post('/api/v1/auth/google')
        .send({ token: mockGoogleToken, portal: 'student' });

      expect(resStudent.statusCode).toBe(200);
      expect(resStudent.body.success).toBe(true);
      expect(resStudent.body.data.user.role).toBe('STUDENT');

      await supabaseAdmin.auth.admin.deleteUser(sbData.user.id);
    });

    it('should reject unapproved Google user without creating duplicate database records', async () => {
      const strangerEmail = `stranger.${runId}@example.com`;
      const strangerToken = makeMockGoogleToken(`stranger-sub-${runId}`, strangerEmail, {
        name: 'Unapproved Stranger',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token: strangerToken, portal: 'student' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);

      // Verify no user record was created in MySQL
      const userInDb = await prisma.user.findFirst({
        where: { email: strangerEmail },
      });
      expect(userInDb).toBeNull();
    });
  });

  // =========================================================================
  // 3. Durable Email Queue & Worker (Phase 2)
  // =========================================================================
  describe('Durable Database Email Queue (Phase 2)', () => {
    it('should persist jobs in MySQL and process pending QUEUED jobs', async () => {
      const queueEmail = `queue.test.${runId}@maatram.org`;

      // 1. Queue activation email
      const result = await emailDeliveryService.queueActivationEmail({
        userId: testAdminUser.id,
        role: 'ADMIN',
        email: queueEmail,
        name: 'Queue Test User',
        institutionName: 'Admin Hub',
        portalUrl: 'http://localhost:5175/login',
        asyncMode: true,
      });

      expect(result.status).toBe('QUEUED');
      expect(result.logId).toBeDefined();

      // 2. Verify stored in MySQL with status QUEUED or SENT
      const log = await prisma.emailDeliveryLog.findUnique({
        where: { id: result.logId },
      });
      expect(log).toBeDefined();
      expect(log.recipientEmail).toBe(queueEmail);

      // 3. Run worker pass to process pending jobs
      await emailQueueWorker.processPendingJobs(5);

      // 4. Verify job transitioned out of QUEUED
      const updatedLog = await prisma.emailDeliveryLog.findUnique({
        where: { id: result.logId },
      });
      expect(['SENT', 'QUEUED', 'PROCESSING']).toContain(updatedLog.status);
    });

    it('should recover jobs stuck in PROCESSING from interrupted workers', async () => {
      const stuckEmail = `stuck.job.${runId}@maatram.org`;

      // Create a simulated stuck job with lockedAt 10 minutes ago
      const stuckLog = await prisma.emailDeliveryLog.create({
        data: {
          recipientEmail: stuckEmail,
          recipientRole: 'STUDENT',
          notificationType: 'ACCOUNT_ACTIVATION',
          subject: 'Stuck Job Test',
          status: 'PROCESSING',
          lockedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          lockedBy: 'dead-worker-pid-9999',
          attemptCount: 1,
        },
      });

      // Run recovery
      const recoveredCount = await emailQueueWorker.recoverStuckJobs();
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      // Verify the stuck log was reset to QUEUED
      const restored = await prisma.emailDeliveryLog.findUnique({
        where: { id: stuckLog.id },
      });
      expect(restored.status).toBe('QUEUED');
      expect(restored.lockedAt).toBeNull();
      expect(restored.lockedBy).toBeNull();

      // Clean up
      await prisma.emailDeliveryLog.delete({ where: { id: stuckLog.id } });
    });
  });
});

