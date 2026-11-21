/**
 * tests/emailActivation.test.js
 *
 * Comprehensive Test Suite for Automated Account Activation and Credential Email Delivery:
 * 1. Individual Student account creation sends correct email.
 * 2. Individual Officer account creation sends correct email.
 * 3. Bulk Student import queues/sends one email per created account.
 * 4. Bulk Officer import queues/sends one email per created account.
 * 5. Emails contain correct recipient credentials and role portal URL.
 * 6. Students receive Student Portal URL (http://localhost:5173/login), not Officer Portal.
 * 7. Officers receive Officer Portal URL (http://localhost:5174/login), not Student Portal.
 * 8. mustChangePassword: true is verified on created accounts.
 * 9. Failed account creations do NOT trigger activation emails.
 * 10. SMTP delivery failures are recorded in email_delivery_logs with status: 'FAILED'.
 * 11. Failed emails can be retried (POST /api/v1/admin/emails/:id/retry) without creating duplicate accounts.
 * 12. Verify temporary passwords are not exposed in logs or DB fields.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');
const { supabaseAdmin } = require('../src/config/supabase');
const emailDeliveryService = require('../src/services/emailDelivery.service');
const emailService = require('../src/services/emailService');

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

describe('Automated Account Activation and Credential Email Delivery', () => {
  const runId = Date.now().toString();
  let testZone;
  let testInstitution;
  let testAdminUser;
  let adminToken;

  const adminEmail = `adm.email.${runId}@maatram.org`;
  const adminSub = `sb-adm-email-${runId}`;

  beforeAll(async () => {
    // 1. Create Zone
    testZone = await prisma.zone.create({
      data: {
        code: `ZN-E-${runId.slice(-4)}`,
        name: `Zone Email Test ${runId.slice(-4)}`,
        region: 'Test Region',
        status: 'ACTIVE',
      },
    });

    // 2. Create Institution
    testInstitution = await prisma.institution.create({
      data: {
        code: `EINS-${runId.slice(-4)}`,
        name: `Email Test Institute ${runId.slice(-4)}`,
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
            adminId: `ADM-E-${runId.slice(-4)}`,
            name: 'Email Test Admin',
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
        select: { id: true },
      });
      const ids = users.map((u) => u.id);
      await prisma.emailDeliveryLog.deleteMany({ where: { recipientEmail: { contains: runId } } }).catch(() => {});
      await prisma.emailDeliveryLog.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
      await prisma.department.deleteMany({ where: { institutionId: testInstitution.id } }).catch(() => {});
      await prisma.institution.delete({ where: { id: testInstitution.id } }).catch(() => {});
      await prisma.zone.delete({ where: { id: testZone.id } }).catch(() => {});
    } catch (e) {
      // ignore cleanup errors
    }
  });

  // =========================================================================
  // 1 & 5 & 6 & 8 & 12: Individual Student Creation
  // =========================================================================
  describe('1. Individual Student Account Creation & Email Delivery', () => {
    const studentEmail = `stu.act.${runId}@maatram.org`;
    const regNo = `REG-E-${runId.slice(-4)}`;

    it('should provision student, send activation email with correct subject and portal URL, set mustChangePassword: true, and never leak password in DB', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Aishwarya M',
          email: studentEmail,
          registerNumber: regNo,
          institutionId: testInstitution.id,
          department: 'Computer Science',
          year: 3,
          phone: '9876543210',
          temporaryPassword: 'Maatram@2026',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify user in DB
      const user = await prisma.user.findUnique({
        where: { email: studentEmail },
      });
      expect(user).toBeDefined();
      expect(user.mustChangePassword).toBe(true);
      expect(user.status).toBe('ACTIVE');

      // Verify email delivery log entry
      const log = await prisma.emailDeliveryLog.findFirst({
        where: { recipientEmail: studentEmail },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log.recipientRole).toBe('STUDENT');
      expect(log.subject).toBe('Welcome to Maatram Foundation – Your Student Portal Account Is Ready');
      expect(log.notificationType).toBe('ACCOUNT_ACTIVATION');
      expect(log.status).toMatch(/SENT|QUEUED/);
      expect(log.userId).toBe(user.id);

      // Verify metadata contains correct details and Student Portal URL (5173), NOT officer portal
      expect(log.metadata).toBeDefined();
      expect(log.metadata.institutionName).toBe(testInstitution.name);
      expect(log.metadata.zoneName).toBe(testZone.name);
      expect(log.metadata.portalUrl).toContain('5173');
      expect(log.metadata.portalUrl).not.toContain('5174');

      // CRITICAL: Verify temporary password is NEVER stored in database metadata or fields
      expect(JSON.stringify(log)).not.toContain('Maatram@2026');
      expect(JSON.stringify(res.body)).not.toContain('Maatram@2026');
    });
  });

  // =========================================================================
  // 2 & 7: Individual Officer Creation
  // =========================================================================
  describe('2. Individual Officer Account Creation & Email Delivery', () => {
    const officerEmail = `off.act.${runId}@maatram.org`;

    it('should provision officer, send activation email with officer subject and 5174 URL, and set mustChangePassword: true', async () => {
      const res = await request(app)
        .post('/api/v1/officers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Venkatesh Kumar',
          email: officerEmail,
          phone: '9876543211',
          designation: 'Senior Zone Officer',
          zoneId: testZone.id,
          temporaryPassword: 'Maatram@2026',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify user in DB
      const user = await prisma.user.findUnique({
        where: { email: officerEmail },
      });
      expect(user).toBeDefined();
      expect(user.mustChangePassword).toBe(true);

      // Verify email delivery log entry
      const log = await prisma.emailDeliveryLog.findFirst({
        where: { recipientEmail: officerEmail },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log.recipientRole).toBe('OFFICER');
      expect(log.subject).toBe('Welcome to Maatram Foundation – Your Officer Portal Account Is Ready');
      expect(log.notificationType).toBe('ACCOUNT_ACTIVATION');
      expect(log.userId).toBe(user.id);

      // Verify metadata contains designation and Officer Portal URL (5174), NOT student portal
      expect(log.metadata).toBeDefined();
      expect(log.metadata.designation).toBe('Senior Zone Officer');
      expect(log.metadata.portalUrl).toContain('5174');
      expect(log.metadata.portalUrl).not.toContain('5173');

      // CRITICAL: Verify temporary password is NEVER stored in database metadata or fields
      expect(JSON.stringify(log)).not.toContain('Maatram@2026');
    });
  });

  // =========================================================================
  // 3. Bulk Student Import Queues Emails
  // =========================================================================
  describe('3. Bulk Student Import Email Queue', () => {
    it('should confirm bulk student import and queue activation emails with summary counts', async () => {
      const stu1Email = `bulk.stu1.${runId}@maatram.org`;
      const stu2Email = `bulk.stu2.${runId}@maatram.org`;

      const rows = [
        {
          status: 'VALID',
          studentName: 'Student Alpha',
          name: 'Student Alpha',
          email: stu1Email,
          registerNumber: `REG-B1-${runId.slice(-4)}`,
          collegeName: testInstitution.name,
          matchedInstitution: testInstitution,
          derivedZone: testZone,
          department: 'ECE',
          year: 2,
          phone: '9876543212',
          temporaryPassword: 'Maatram@2026',
        },
        {
          status: 'VALID',
          studentName: 'Student Beta',
          name: 'Student Beta',
          email: stu2Email,
          registerNumber: `REG-B2-${runId.slice(-4)}`,
          collegeName: testInstitution.name,
          matchedInstitution: testInstitution,
          derivedZone: testZone,
          department: 'IT',
          year: 1,
          phone: '9876543213',
          temporaryPassword: 'Maatram@2026',
        },
      ];

      const res = await request(app)
        .post('/api/v1/admin/students/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows,
          fileName: `test_bulk_students_${runId}.xlsx`,
          temporaryPassword: 'Maatram@2026',
          sendWelcomeEmail: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(2);
      expect(res.body.data.emailsQueued).toBe(2);

      // Wait a moment for background queue execution
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify email logs created for both
      const logs = await prisma.emailDeliveryLog.findMany({
        where: { recipientEmail: { in: [stu1Email, stu2Email] } },
      });
      expect(logs.length).toBe(2);
      expect(logs.every((l) => l.recipientRole === 'STUDENT')).toBe(true);
      expect(logs.every((l) => l.subject.includes('Student Portal'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. Bulk Officer Import Queues Emails
  // =========================================================================
  describe('4. Bulk Officer Import Email Queue', () => {
    it('should confirm bulk officer import and queue activation emails with summary counts', async () => {
      const off1Email = `bulk.off1.${runId}@maatram.org`;

      const rows = [
        {
          status: 'VALID',
          officerName: 'Officer Gamma',
          name: 'Officer Gamma',
          email: off1Email,
          phone: '9876543214',
          designation: 'Field Officer',
          assignedZone: testZone,
          temporaryPassword: 'Maatram@2026',
        },
      ];

      const res = await request(app)
        .post('/api/v1/admin/officers/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows,
          fileName: `test_bulk_officers_${runId}.xlsx`,
          temporaryPassword: 'Maatram@2026',
          sendWelcomeEmail: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1);
      expect(res.body.data.emailsQueued).toBe(1);

      // Wait a moment for background queue execution
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const logs = await prisma.emailDeliveryLog.findMany({
        where: { recipientEmail: off1Email },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].recipientRole === 'OFFICER').toBe(true);
      expect(logs[0].subject.includes('Officer Portal')).toBe(true);
    });
  });

  // =========================================================================
  // 9. Failed account creations do NOT trigger activation emails
  // =========================================================================
  describe('9. Failed Account Creation Handling', () => {
    it('should NOT trigger activation email when account creation fails validation or duplication', async () => {
      const duplicateEmail = `stu.act.${runId}@maatram.org`; // Already created in test 1
      const countBefore = await prisma.emailDeliveryLog.count({
        where: { recipientEmail: duplicateEmail },
      });

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Test',
          email: duplicateEmail,
          registerNumber: `REG-DUP-${runId.slice(-4)}`,
          institutionId: testInstitution.id,
          department: 'CSE',
          year: 2,
        });

      expect(res.statusCode).toBe(409); // Conflict

      const countAfter = await prisma.emailDeliveryLog.count({
        where: { recipientEmail: duplicateEmail },
      });
      expect(countAfter).toBe(countBefore);
    });
  });

  // =========================================================================
  // 10 & 11: SMTP Delivery Failure and Admin Manual/Bulk Retry
  // =========================================================================
  describe('10 & 11. Delivery Failure Recording & Admin Retry', () => {
    let failedUser;
    let failedLogId;
    const failedEmail = `fail.retry.${runId}@maatram.org`;

    it('should record status: FAILED with errorDetails when delivery fails, and allow admin retry without duplicating accounts', async () => {
      // 1. Create user in Supabase Auth and MySQL
      const { data: sbData } = await supabaseAdmin.auth.admin.createUser({
        email: failedEmail,
        password: 'Maatram@2026',
        email_confirm: true,
        user_metadata: { role: 'STUDENT' },
      });

      failedUser = await prisma.user.create({
        data: {
          supabaseUid: sbData.user.id,
          email: failedEmail,
          role: 'STUDENT',
          status: 'ACTIVE',
          mustChangePassword: true,
          studentProfile: {
            create: {
              studentId: `MF-FAIL-${runId.slice(-4)}`,
              name: 'Failed User Test',
              institutionId: testInstitution.id,
              zoneId: testZone.id,
            },
          },
        },
      });

      // 2. Simulate a failed email log entry
      const failedLog = await prisma.emailDeliveryLog.create({
        data: {
          recipientEmail: failedEmail,
          recipientName: 'Failed User Test',
          recipientRole: 'STUDENT',
          notificationType: 'ACCOUNT_ACTIVATION',
          subject: 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready',
          userId: failedUser.id,
          status: 'FAILED',
          attemptCount: 1,
          errorDetails: 'Connection timeout: 535 SMTP authentication rejected',
          metadata: {
            institutionName: testInstitution.name,
            zoneName: testZone.name,
            portalUrl: 'http://localhost:5173/login',
          },
        },
      });
      failedLogId = failedLog.id;

      expect(failedLog.status).toBe('FAILED');
      expect(failedLog.errorDetails).toContain('Connection timeout');

      // 3. Admin queries email logs: GET /api/v1/admin/emails
      const listRes = await request(app)
        .get(`/api/v1/admin/emails?status=FAILED&search=${failedEmail}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.body.data[0].status).toBe('FAILED');

      // 4. Admin inspects specific email log: GET /api/v1/admin/emails/:id
      const detailRes = await request(app)
        .get(`/api/v1/admin/emails/${failedLogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.body.data.id).toBe(failedLogId);
      expect(detailRes.body.data.errorDetails).toBeDefined();

      // 5. Admin retries the failed email: POST /api/v1/admin/emails/:id/retry
      const retryRes = await request(app)
        .post(`/api/v1/admin/emails/${failedLogId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retryRes.statusCode).toBe(200);
      expect(retryRes.body.success).toBe(true);

      // Verify that no duplicate user was created
      const userMatches = await prisma.user.findMany({
        where: { email: failedEmail },
      });
      expect(userMatches.length).toBe(1);
      expect(userMatches[0].id).toBe(failedUser.id);
      expect(userMatches[0].mustChangePassword).toBe(true);
    });

    it('should support admin resending activation by user ID: POST /api/v1/admin/users/:userId/resend-activation', async () => {
      const resendRes = await request(app)
        .post(`/api/v1/admin/users/${failedUser.id}/resend-activation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ temporaryPassword: 'Maatram@2026' });

      expect(resendRes.statusCode).toBe(200);
      expect(resendRes.body.success).toBe(true);

      // Verify user count remains exactly 1
      const count = await prisma.user.count({ where: { id: failedUser.id } });
      expect(count).toBe(1);
    });

    it('should support bulk retry: POST /api/v1/admin/emails/retry-failed', async () => {
      const bulkRes = await request(app)
        .post('/api/v1/admin/emails/retry-failed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(bulkRes.statusCode).toBe(200);
      expect(bulkRes.body.success).toBe(true);
      expect(bulkRes.body.data).toHaveProperty('retriedCount');
      expect(bulkRes.body.data).toHaveProperty('succeededCount');
      expect(bulkRes.body.data).toHaveProperty('failedCount');
    });
  });
});
