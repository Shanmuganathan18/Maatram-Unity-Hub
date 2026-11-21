/**
 * tests/googleAuth.test.js
 * End-to-end tests for Google Sign-In across Student, Officer, and Admin portals:
 * 1. Payload validation (missing token, invalid portal).
 * 2. Admin Portal:
 *    - Unauthorized Google account rejected with 403 (No auto-creation).
 *    - Valid Admin Google account succeeds and returns complete profile with single ADMIN permissions.
 *    - Inactive Admin Google account rejected with 403.
 * 3. Officer Portal:
 *    - Unauthorized Google account rejected with 403 (No auto-creation).
 *    - Valid Officer Google account succeeds and resolves zone strictly from DB.
 *    - Inactive Officer account rejected with 403.
 * 4. Student Portal:
 *    - Existing Student with complete profile succeeds.
 *    - New Student Google account returns isComplete: false and required missingFields.
 *    - Student Profile Completion validates inputs and completes onboarding with institution & zone.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');

const makeGoogleToken = (sub, email, metadata = {}) => {
  return jwt.sign(
    {
      sub,
      email,
      user_metadata: metadata,
      iss: 'https://mock.supabase.co/auth/v1',
      aud: 'authenticated',
    },
    env.supabase.jwtSecret,
    { expiresIn: '1h' },
  );
};

describe('Google OAuth Sign-In & Multi-Portal Authorization', () => {
  const runId = Date.now().toString();
  let testZone;
  let testInstitution;
  let testDept;
  let testAdminUser;
  let testOfficerUser;
  let existingStudentUser;

  const adminEmail = `test.admin.${runId}@maatram.org`;
  const officerEmail = `test.officer.${runId}@maatram.org`;
  const existingStudentEmail = `test.student.${runId}@gmail.com`;
  const newStudentEmail = `new.student.${runId}@gmail.com`;
  const unauthorizedEmail = `random.stranger.${runId}@gmail.com`;

  const adminSub = `sb-admin-${runId}`;
  const officerSub = `sb-officer-${runId}`;
  const existingStudentSub = `sb-student-${runId}`;
  const newStudentSub = `sb-new-student-${runId}`;

  beforeAll(async () => {
    // 0. Initial cleanup of leftover test records from any previous runs
    const staleUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test.admin.' } },
          { email: { contains: 'test.officer.' } },
          { email: { contains: 'test.student.' } },
          { email: { contains: 'new.student.' } },
          { email: { contains: 'random.stranger.' } },
        ],
      },
      select: { id: true },
    });
    if (staleUsers.length > 0) {
      const ids = staleUsers.map((u) => u.id);
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }

    // 1. Create test zone
    testZone = await prisma.zone.create({
      data: {
        code: `ZN-TEST-${runId.slice(-4)}`,
        name: 'Test Zone South',
        region: 'South Tamil Nadu',
        status: 'ACTIVE',
      },
    });

    // 2. Create test institution
    testInstitution = await prisma.institution.create({
      data: {
        code: `INS-${runId.slice(-4)}`,
        name: 'Test Institute of Engineering',
        location: 'Chennai',
        type: 'Engineering',
        zoneId: testZone.id,
        status: 'ACTIVE',
      },
    });

    // 3. Create test Admin account
    testAdminUser = await prisma.user.create({
      data: {
        supabaseUid: adminSub,
        email: adminEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
        adminProfile: {
          create: {
            adminId: `ADM-T-${runId.slice(-4)}`,
            name: 'Authorized Test Admin',
            phone: '9876500001',
            roleId: 'admin',
          },
        },
      },
      include: { adminProfile: true },
    });

    // 4. Create test Officer account assigned to testZone
    testOfficerUser = await prisma.user.create({
      data: {
        supabaseUid: officerSub,
        email: officerEmail,
        role: 'OFFICER',
        status: 'ACTIVE',
        officerProfile: {
          create: {
            officerId: `OFF-T-${runId.slice(-4)}`,
            name: 'Authorized Test Officer',
            phone: '9876500002',
            designation: 'Zonal Lead Officer',
            zoneId: testZone.id,
            status: 'ACTIVE',
          },
        },
      },
      include: { officerProfile: true },
    });

    // 5. Create test department & existing Student with complete profile
    testDept = await prisma.department.create({
      data: {
        institutionId: testInstitution.id,
        name: 'Computer Science and Engineering',
      },
    });

    existingStudentUser = await prisma.user.create({
      data: {
        supabaseUid: existingStudentSub,
        email: existingStudentEmail,
        role: 'STUDENT',
        status: 'ACTIVE',
        studentProfile: {
          create: {
            studentId: `STU-T-${runId.slice(-4)}`,
            name: 'Existing Test Student',
            phone: '9876500003',
            institutionId: testInstitution.id,
            zoneId: testZone.id,
            departmentId: testDept.id,
            year: 3,
            status: 'ACTIVE',
          },
        },
      },
      include: { studentProfile: true },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    const testUsers = await prisma.user.findMany({
      where: { email: { in: [adminEmail, officerEmail, existingStudentEmail, newStudentEmail] } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: testUserIds } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: testUserIds } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: testUserIds } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: testUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } }).catch(() => {});
    }

    if (testInstitution) {
      await prisma.department.deleteMany({ where: { institutionId: testInstitution.id } }).catch(() => {});
      await prisma.institution.delete({ where: { id: testInstitution.id } }).catch(() => {});
    }
    if (testZone) {
      await prisma.zone.delete({ where: { id: testZone.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Validation & Bad Request Handling
  // =========================================================================
  describe('Input Validation on /api/v1/auth/google', () => {
    it('should reject requests with missing token or portal', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({});
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with invalid portal', async () => {
      const token = makeGoogleToken('any-id', 'test@gmail.com');
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'faculty' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject forged or expired token', async () => {
      const forgedToken = jwt.sign(
        { sub: 'hacker', email: 'hacker@test.com' },
        'wrong-secret-key',
      );
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token: forgedToken, portal: 'student' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Admin Portal Authorization Tests
  // =========================================================================
  describe('Admin Portal Google Auth (portal: "admin")', () => {
    it('should reject unauthorized Google user trying to access Admin Portal (403)', async () => {
      const token = makeGoogleToken('unauth-admin-sub', unauthorizedEmail, { name: 'Stranger' });
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'admin' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Your account has not been registered or approved by Maatram Foundation/i);
    });

    it('should successfully authenticate an authorized Admin via Google', async () => {
      const token = makeGoogleToken(adminSub, adminEmail, {
        name: 'Authorized Test Admin',
      });
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'admin' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.email).toBe(adminEmail);
    });

    it('should reject a deactivated Admin account (403)', async () => {
      // Temporarily deactivate
      await prisma.user.update({
        where: { id: testAdminUser.id },
        data: { status: 'INACTIVE' },
      });

      const token = makeGoogleToken(adminSub, adminEmail);
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'admin' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);

      // Restore active status
      await prisma.user.update({
        where: { id: testAdminUser.id },
        data: { status: 'ACTIVE' },
      });
    });
  });

  // =========================================================================
  // 3. Officer Portal Authorization Tests
  // =========================================================================
  describe('Officer Portal Google Auth (portal: "officer")', () => {
    it('should reject unauthorized Google user trying to access Officer Portal (403)', async () => {
      const token = makeGoogleToken(`unauth-officer-${runId}`, unauthorizedEmail, { name: 'Stranger' });
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'officer' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Your account has not been registered or approved by Maatram Foundation/i);
    });

    it('should successfully authenticate an authorized Officer via Google and derive zone', async () => {
      const token = makeGoogleToken(officerSub, officerEmail, {
        name: 'Authorized Test Officer',
      });
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'officer' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);
      expect(res.body.data.user.role).toBe('OFFICER');
      expect(res.body.data.user.email).toBe(officerEmail);
      expect(res.body.data.user.profile.zone.id).toBe(testZone.id);
    });

    it('should reject an officer if account status is SUSPENDED (403)', async () => {
      await prisma.user.update({
        where: { id: testOfficerUser.id },
        data: { status: 'SUSPENDED' },
      });

      const token = makeGoogleToken(officerSub, officerEmail);
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'officer' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);

      // Restore active status
      await prisma.user.update({
        where: { id: testOfficerUser.id },
        data: { status: 'ACTIVE' },
      });
    });
  });

  // =========================================================================
  // 4. Student Portal Authorization & Profile Completion
  // =========================================================================
  describe('Student Portal Google Auth (portal: "student")', () => {
    it('should authenticate existing student and report isComplete: true', async () => {
      const token = makeGoogleToken(existingStudentSub, existingStudentEmail);
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'student' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.email).toBe(existingStudentEmail);
      expect(res.body.data.missingFields).toHaveLength(0);
    });

    it('should reject unprovisioned Google student without an approved application account (403)', async () => {
      const token = makeGoogleToken(newStudentSub, newStudentEmail, {
        name: 'Unprovisioned Student',
      });
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'student' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Your account has not been registered or approved by Maatram Foundation/i);
    });

    it('should allow student profile completion endpoint for verified sessions', async () => {
      // First provision student via DB (as Admin would do)
      const provisionedUser = await prisma.user.create({
        data: {
          supabaseUid: newStudentSub,
          email: newStudentEmail,
          role: 'STUDENT',
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });

      const token = makeGoogleToken(newStudentSub, newStudentEmail, {
        name: 'New Google Student',
      });

      const res = await request(app)
        .post('/api/v1/auth/complete-student-profile')
        .send({
          token,
          institutionId: testInstitution.id,
          department: 'Information Technology',
          year: 2,
          phone: '9876543210',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.profile.department).toBe('Information Technology');
      expect(res.body.data.user.profile.year).toBe(2);
      expect(res.body.data.user.profile.institution.id).toBe(testInstitution.id);
      expect(res.body.data.user.profile.zone.id).toBe(testZone.id);
    });

    it('subsequent Google sign-in for that student should now report isComplete: true', async () => {
      const token = makeGoogleToken(newStudentSub, newStudentEmail);
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ token, portal: 'student' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);
      expect(res.body.data.user.profile.department).toBe('Information Technology');
    });

    it('should reject profile completion with non-existent institution', async () => {
      const token = makeGoogleToken('sb-rand-student', 'rand.student@gmail.com');
      const res = await request(app)
        .post('/api/v1/auth/complete-student-profile')
        .send({
          token,
          institutionId: '00000000-0000-0000-0000-000000000999',
          department: 'Civil Engineering',
          year: 1,
          phone: '9876543210',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
