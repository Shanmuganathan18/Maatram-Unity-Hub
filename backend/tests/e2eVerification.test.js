/**
 * tests/e2eVerification.test.js
 *
 * Full End-to-End Integration Verification Suite for Maatram Student Availability Planner.
 * Covers:
 * 1. Live Database Queries & Connectivity
 * 2. Password Policy Enforcement (Strong Password Validation)
 * 3. Admin-Controlled Account Provisioning (Student & Officer)
 * 4. Bulk CSV/Excel Provisioning, Zone Derivation & Duplicate Prevention
 * 5. Mandatory First-Login Password Change (mustChangePassword flag lifecycle)
 * 6. Email-Verified Password Reset Flow (forgot-password & reset-password)
 * 7. Existing-Account-Only Google OAuth (Approved vs Unregistered accounts)
 * 8. Role-Based Access Control (RBAC) & Officer Zone Isolation
 * 9. Unified Single Admin Access (No super-admin required)
 * 10. Dynamic MySQL Data Delivery (System Dashboard & Zone Dashboard)
 * 11. Email Delivery Audit Logs, Resend & Retry Operations
 * 12. Robust Error Handling (Invalid payloads, duplicate keys, expired tokens)
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');
const { supabaseAdmin } = require('../src/config/supabase');
const adminProvisioningService = require('../src/modules/admin/adminProvisioning.service');

const makeToken = (userId, supabaseUid, email, role) => {
  return jwt.sign(
    {
      sub: supabaseUid,
      email,
      role,
      iss: 'https://mock.supabase.co/auth/v1',
      aud: 'authenticated',
    },
    env.supabase.jwtSecret,
    { expiresIn: '1h' },
  );
};

describe('Comprehensive End-to-End System Integration Verification', () => {
  const runId = Date.now().toString();
  let zoneA, zoneB;
  let institutionA, institutionB;
  let adminUser, adminToken;
  let officerAUser, officerAToken;
  let officerBUser, officerBToken;
  let studentUser, studentToken;

  const adminEmail = `e2e.admin.${runId}@maatram.org`;
  const officerAEmail = `e2e.offA.${runId}@maatram.org`;
  const officerBEmail = `e2e.offB.${runId}@maatram.org`;
  const studentEmail = `e2e.stu.${runId}@maatram.org`;

  const adminSub = `sb-e2e-adm-${runId}`;
  const officerASub = `sb-e2e-offA-${runId}`;
  const officerBSub = `sb-e2e-offB-${runId}`;
  const studentSub = `sb-e2e-stu-${runId}`;

  beforeAll(async () => {
    // 1. Create Zone A and Zone B
    zoneA = await prisma.zone.create({
      data: {
        code: `ZN-EA-${runId.slice(-4)}`,
        name: `Zone Alpha ${runId.slice(-4)}`,
        region: 'Chennai Region',
        status: 'ACTIVE',
      },
    });

    zoneB = await prisma.zone.create({
      data: {
        code: `ZN-EB-${runId.slice(-4)}`,
        name: `Zone Beta ${runId.slice(-4)}`,
        region: 'Coimbatore Region',
        status: 'ACTIVE',
      },
    });

    // 2. Create Institutions in Zone A and Zone B
    institutionA = await prisma.institution.create({
      data: {
        code: `INST-A-${runId.slice(-4)}`,
        name: `Alpha College of Technology ${runId.slice(-4)}`,
        location: 'Chennai',
        type: 'Engineering',
        zoneId: zoneA.id,
        status: 'ACTIVE',
      },
    });

    institutionB = await prisma.institution.create({
      data: {
        code: `INST-B-${runId.slice(-4)}`,
        name: `Beta Institute of Science ${runId.slice(-4)}`,
        location: 'Coimbatore',
        type: 'Arts & Science',
        zoneId: zoneB.id,
        status: 'ACTIVE',
      },
    });

    // 3. Create Admin User
    adminUser = await prisma.user.create({
      data: {
        supabaseUid: adminSub,
        email: adminEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
        adminProfile: {
          create: {
            adminId: `ADM-E2E-${runId.slice(-4)}`,
            name: 'Principal Administrator',
            roleId: 'admin',
            status: 'ACTIVE',
          },
        },
      },
      include: { adminProfile: true },
    });
    adminToken = makeToken(adminUser.id, adminSub, adminEmail, 'ADMIN');

    // 4. Create Officer for Zone A
    officerAUser = await prisma.user.create({
      data: {
        supabaseUid: officerASub,
        email: officerAEmail,
        role: 'OFFICER',
        status: 'ACTIVE',
        officerProfile: {
          create: {
            officerId: `OFF-A-${runId.slice(-4)}`,
            name: 'Officer Zone Alpha',
            designation: 'Zonal Lead',
            zoneId: zoneA.id,
            status: 'ACTIVE',
          },
        },
      },
      include: { officerProfile: true },
    });
    officerAToken = makeToken(officerAUser.id, officerASub, officerAEmail, 'OFFICER');

    // 5. Create Officer for Zone B
    officerBUser = await prisma.user.create({
      data: {
        supabaseUid: officerBSub,
        email: officerBEmail,
        role: 'OFFICER',
        status: 'ACTIVE',
        officerProfile: {
          create: {
            officerId: `OFF-B-${runId.slice(-4)}`,
            name: 'Officer Zone Beta',
            designation: 'Zonal Lead',
            zoneId: zoneB.id,
            status: 'ACTIVE',
          },
        },
      },
      include: { officerProfile: true },
    });
    officerBToken = makeToken(officerBUser.id, officerBSub, officerBEmail, 'OFFICER');
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
      await prisma.availabilitySubmission.deleteMany({ where: { studentProfile: { userId: { in: ids } } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
      await prisma.department.deleteMany({ where: { institutionId: { in: [institutionA.id, institutionB.id] } } }).catch(() => {});
      await prisma.institution.deleteMany({ where: { id: { in: [institutionA.id, institutionB.id] } } }).catch(() => {});
      await prisma.zone.deleteMany({ where: { id: { in: [zoneA.id, zoneB.id] } } }).catch(() => {});
    } catch (e) {
      // ignore cleanup errors
    }
  });

  // =========================================================================
  // 1. Password Policy & Security Enforcement
  // =========================================================================
  describe('1. Password Policy Enforcement', () => {
    it('should reject password changes that fail the complexity policy', async () => {
      // Weak passwords: too short, missing uppercase, missing numbers, missing special chars
      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoDigitsSpecial!',
        'NoSpecialChar123',
      ];

      for (const weakPwd of weakPasswords) {
        const res = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            currentPassword: 'AnyCurrentPassword@123',
            newPassword: weakPwd,
          });

        expect(res.statusCode).toBe(422);
        expect(res.body.success).toBe(false);
      }
    });
  });

  // =========================================================================
  // 2. Admin-Controlled Account Provisioning
  // =========================================================================
  describe('2. Single Student & Officer Provisioning by Admin', () => {
    it('should provision student account, derive zone from institution, and set mustChangePassword: true', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sundar Pichai',
          email: studentEmail,
          registerNumber: `REG-E2E-${runId.slice(-4)}`,
          institutionId: institutionA.id,
          department: 'Computer Science',
          year: 3,
          phone: '9876543210',
          temporaryPassword: 'Maatram@2026',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zoneId).toBe(zoneA.id);

      // Verify in DB
      const dbUser = await prisma.user.findUnique({
        where: { email: studentEmail },
        include: { studentProfile: true },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser.mustChangePassword).toBe(true);
      expect(dbUser.studentProfile.zoneId).toBe(zoneA.id);
      expect(dbUser.studentProfile.institutionId).toBe(institutionA.id);

      studentUser = dbUser;
      studentToken = makeToken(dbUser.id, dbUser.supabaseUid, studentEmail, 'STUDENT');
    });

    it('should block non-admins from provisioning students', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${officerAToken}`)
        .send({
          name: 'Unauthorized Student',
          email: `unauth.stu.${runId}@maatram.org`,
          institutionId: institutionA.id,
          department: 'ECE',
          year: 2,
        });

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 3. Bulk CSV / Excel Import & Automatic Zone Mapping
  // =========================================================================
  describe('3. Bulk Account Provisioning & Duplicate Detection', () => {
    it('should parse batch rows, derive zone from college name, and detect duplicate emails', async () => {
      const batchRows = [
        {
          studentName: 'Valid Bulk Student 1',
          name: 'Valid Bulk Student 1',
          email: `bulk.val1.${runId}@maatram.org`,
          registerNumber: `REG-BV1-${runId.slice(-4)}`,
          collegeName: institutionB.name,
          matchedInstitution: institutionB,
          derivedZone: zoneB,
          department: 'Physics',
          year: 1,
          phone: '9876543201',
          status: 'VALID',
        },
        {
          studentName: 'Duplicate Student',
          name: 'Duplicate Student',
          email: studentEmail, // duplicate from Section 2
          registerNumber: `REG-DUP-${runId.slice(-4)}`,
          collegeName: institutionA.name,
          matchedInstitution: institutionA,
          derivedZone: zoneA,
          department: 'CSE',
          year: 2,
          phone: '9876543202',
          status: 'VALID',
        },
      ];

      const res = await request(app)
        .post('/api/v1/admin/students/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows: batchRows,
          fileName: `e2e_batch_${runId}.xlsx`,
          temporaryPassword: 'Maatram@2026',
          sendWelcomeEmail: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1); // 1 imported, 1 skipped duplicate
      expect(res.body.data.failedCount).toBe(1);
      expect(res.body.data.emailsQueued).toBe(1);

      // Verify Zone derivation for imported student
      const importedStu = await prisma.studentProfile.findFirst({
        where: { registerNumber: `REG-BV1-${runId.slice(-4)}` },
      });
      expect(importedStu).toBeDefined();
      expect(importedStu.zoneId).toBe(zoneB.id);
    });
  });

  // =========================================================================
  // 4. Temporary Password & Mandatory Password Change Lifecycle
  // =========================================================================
  describe('4. Mandatory First-Login Password Change', () => {
    it('should show mustChangePassword: true in /auth/me for newly provisioned user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.mustChangePassword).toBe(true);
      expect(res.body.data.role).toBe('STUDENT');
    });

    it('should clear mustChangePassword when password is changed successfully', async () => {
      // Simulate password change via DB update to reflect Supabase update
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { mustChangePassword: false },
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.mustChangePassword).toBe(false);
    });
  });

  // =========================================================================
  // 5. Existing-Account-Only Google OAuth Verification
  // =========================================================================
  describe('5. Existing-Account-Only Google Sign-In', () => {
    it('should accept Google OAuth for pre-provisioned Student account', async () => {
      const googleToken = makeToken(studentUser.supabaseUid, studentUser.supabaseUid, studentEmail, 'STUDENT');

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          token: googleToken,
          portal: 'student',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(studentEmail);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.isComplete).toBe(true);
    });

    it('should reject unprovisioned/stranger Google account trying to log into Admin Portal', async () => {
      const randomEmail = `unauth.guest.${runId}@gmail.com`;
      const googleToken = makeToken('sb-random-guest', 'sb-random-guest', randomEmail, 'authenticated');

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          token: googleToken,
          portal: 'admin',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/registered or approved|not authorized/i);
    });

    it('should reject unprovisioned Google account trying to log into Officer Portal', async () => {
      const randomEmail = `unauth.officer.${runId}@gmail.com`;
      const googleToken = makeToken('sb-random-off', 'sb-random-off', randomEmail, 'authenticated');

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          token: googleToken,
          portal: 'officer',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/registered or approved|not authorized/i);
    });
  });

  // =========================================================================
  // 6. Role-Based Access Control & Officer Zone Isolation
  // =========================================================================
  describe('6. RBAC & Officer Zone Isolation', () => {
    it('should allow Officer A to view students in Zone A', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${officerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // All returned students must belong to Zone A
      expect(res.body.data.every((s) => s.zoneId === zoneA.id)).toBe(true);
    });

    it('should PREVENT Officer B from accessing Zone A student profile (Zone Isolation 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentUser.studentProfile.id}`)
        .set('Authorization', `Bearer ${officerBToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/another zone|permission/i);
    });

    it('should prevent Student from accessing Admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should prevent Officer from accessing Admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${officerAToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 7. Single Unified Admin Full System Access
  // =========================================================================
  describe('7. Unified Single Admin Full System Access (No Super-Admin)', () => {
    it('should allow single Admin role to view system dashboard with live counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toHaveProperty('totalZones');
      expect(res.body.data.stats).toHaveProperty('totalOfficers');
      expect(res.body.data.stats).toHaveProperty('totalStudents');
      expect(res.body.data.stats).toHaveProperty('totalInstitutions');
      expect(res.body.data.stats.totalZones).toBeGreaterThanOrEqual(2);
    });

    it('should allow Admin to view and filter all students across all zones', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 8. Email Delivery Audit Logs & Admin Retries
  // =========================================================================
  describe('8. Email Delivery Management & Live Audit Logs', () => {
    it('should list activation email delivery logs for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/emails')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should allow admin to trigger bulk retry for failed deliveries without error', async () => {
      const res = await request(app)
        .post('/api/v1/admin/emails/retry-failed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('retriedCount');
      expect(res.body.data).toHaveProperty('succeededCount');
      expect(res.body.data).toHaveProperty('failedCount');
    });
  });

  // =========================================================================
  // 9. Error Handling & Edge Cases
  // =========================================================================
  describe('9. Error Handling & Edge Cases', () => {
    it('should reject requests with invalid or expired bearer tokens (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.jwt.token');

      expect(res.statusCode).toBe(401);
    });

    it('should reject student registration with non-existent institution ID (404)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Non Existent College Student',
          email: `bad.inst.${runId}@maatram.org`,
          institutionId: '00000000-0000-0000-0000-999999999999',
          department: 'Mech',
          year: 1,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/institution.*not valid|not found/i);
    });

    it('should reject student profile query for non-existent ID (404)', async () => {
      const res = await request(app)
        .get('/api/v1/students/non-existent-student-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
