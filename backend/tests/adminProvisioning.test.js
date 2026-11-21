/**
 * tests/adminProvisioning.test.js
 * Comprehensive tests for Admin Single & Bulk Provisioning,
 * Institution-to-Zone automatic derivation, duplicate detection,
 * and temporary password management.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');
const adminProvisioningService = require('../src/modules/admin/adminProvisioning.service');

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

describe('Admin Account Provisioning & Bulk Import Engine', () => {
  const runId = Date.now().toString();
  let testZone;
  let testInstitution;
  let testAdminUser;
  let adminToken;

  const adminEmail = `prov.admin.${runId}@maatram.org`;
  const adminSub = `sb-prov-admin-${runId}`;

  beforeAll(async () => {
    // 1. Create Zone
    testZone = await prisma.zone.create({
      data: {
        code: `ZN-P-${runId.slice(-4)}`,
        name: 'Zone Delta',
        region: 'Central Region',
        status: 'ACTIVE',
      },
    });

    // 2. Create Institution
    testInstitution = await prisma.institution.create({
      data: {
        code: `CIT-${runId.slice(-4)}`,
        name: `Coimbatore Institute of Technology ${runId.slice(-4)}`,
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
            adminId: `ADM-P-${runId.slice(-4)}`,
            name: 'Provisioning Administrator',
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
    // Cleanup created records
    try {
      const users = await prisma.user.findMany({
        where: { email: { contains: runId } },
        select: { id: true },
      });
      const ids = users.map((u) => u.id);
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.officerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.adminProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
      await prisma.department.deleteMany({ where: { institutionId: testInstitution.id } }).catch(() => {});
      await prisma.institution.delete({ where: { id: testInstitution.id } }).catch(() => {});
      await prisma.zone.delete({ where: { id: testZone.id } }).catch(() => {});
    } catch (e) {
      // ignore
    }
  });

  // =========================================================================
  // 1. Template Generation Tests
  // =========================================================================
  describe('Import Template Generation', () => {
    it('should generate valid CSV student template', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students/import/template?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Student Name');
      expect(res.text).toContain('Register Number');
      expect(res.text).toContain('College Name');
    });

    it('should generate valid Excel (.xlsx) student template', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students/import/template?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
      const workbook = XLSX.read(res.body, { type: 'buffer' });
      expect(workbook.SheetNames.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. Single Student Account Creation
  // =========================================================================
  describe('Single Student Account Provisioning', () => {
    const studentEmail = `student.single.${runId}@test.com`;
    const regNo = `REG-S-${runId.slice(-4)}`;

    it('should provision student account and automatically derive zone from institution', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Pooja R',
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
      expect(res.body.data.name).toBe('Pooja R');
      expect(res.body.data.zoneId).toBe(testZone.id);
      expect(res.body.data.institution.id).toBe(testInstitution.id);
      expect(res.body.data.registerNumber).toBe(regNo);

      // Verify in DB that mustChangePassword is true
      const user = await prisma.user.findUnique({ where: { email: studentEmail } });
      expect(user.mustChangePassword).toBe(true);
      expect(user.status).toBe('ACTIVE');
    });

    it('should reject duplicate email on single student provisioning (409)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Student',
          email: studentEmail,
          registerNumber: `DIFF-${runId.slice(-4)}`,
          institutionId: testInstitution.id,
          department: 'Civil',
          year: 1,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate register number on single student provisioning (409)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Student',
          email: `diff.student.${runId}@test.com`,
          registerNumber: regNo,
          institutionId: testInstitution.id,
          department: 'Mechanical',
          year: 2,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Bulk CSV / Excel Parsing, Validation & Zone Derivation
  // =========================================================================
  describe('Bulk Student Import Engine', () => {
    it('should parse CSV, match institution, derive zone, and detect duplicates', async () => {
      const csvData = [
        'Student Name,Email,Register Number,College Name,Department,Year of Study,Phone Number',
        `Deepak K,deepak.${runId}@test.com,REG-B1-${runId.slice(-4)},${testInstitution.name},Information Technology,2,9876543201`,
        `Karthik M,karthik.${runId}@test.com,REG-B2-${runId.slice(-4)},Unknown Nonexistent College,CSE,1,9876543202`,
        `Deepak Dup,deepak.${runId}@test.com,REG-B3-${runId.slice(-4)},${testInstitution.name},ECE,3,9876543203`,
      ].join('\n');

      const buffer = Buffer.from(csvData, 'utf-8');
      const preview = await adminProvisioningService.previewStudentImport(buffer, 'test_students.csv');

      expect(preview.totalRows).toBe(3);
      expect(preview.validCount).toBe(1); // Row 1 is valid
      expect(preview.invalidCount).toBe(2); // Row 2 (unknown college) and Row 3 (duplicate email)
      expect(preview.duplicateCount).toBe(1);

      // Verify Row 1 derived zone
      const row1 = preview.rows[0];
      expect(row1.status).toBe('VALID');
      expect(row1.derivedZone.id).toBe(testZone.id);
      expect(row1.matchedInstitution.id).toBe(testInstitution.id);

      // Verify Row 2 error
      const row2 = preview.rows[1];
      expect(row2.status).toBe('INVALID');
      expect(row2.errors[0]).toMatch(/Unrecognized college/i);

      // Verify Row 3 duplicate
      const row3 = preview.rows[2];
      expect(row3.status).toBe('DUPLICATE');
    });

    it('should parse Excel (.xlsx) file and execute confirm import successfully', async () => {
      const rowsData = [
        {
          'Student Name': 'Suresh R',
          'Email': `suresh.${runId}@test.com`,
          'Register Number': `REG-X1-${runId.slice(-4)}`,
          'College Name': testInstitution.name,
          'Department': 'Mechanical Engineering',
          'Year of Study': 4,
          'Phone Number': '9876500099',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(rowsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // 1. Preview
      const preview = await adminProvisioningService.previewStudentImport(xlsxBuffer, 'students.xlsx');
      expect(preview.validCount).toBe(1);

      // 2. Confirm import
      const confirmRes = await adminProvisioningService.confirmStudentImport({
        rows: preview.rows,
        temporaryPassword: 'Maatram@2026',
        sendWelcomeEmail: false,
        uploadedById: testAdminUser.id,
        fileName: 'students.xlsx',
      });

      expect(confirmRes.importedCount).toBe(1);
      expect(confirmRes.failedCount).toBe(0);

      // Verify in DB
      const student = await prisma.studentProfile.findFirst({
        where: { registerNumber: `REG-X1-${runId.slice(-4)}` },
        include: { user: true },
      });

      expect(student).not.toBeNull();
      expect(student.name).toBe('Suresh R');
      expect(student.zoneId).toBe(testZone.id);
      expect(student.user.mustChangePassword).toBe(true);
    });
  });

  // =========================================================================
  // 4. Single Officer Account Creation
  // =========================================================================
  describe('Single Officer Provisioning', () => {
    it('should provision an officer with assigned zone and temporary password', async () => {
      const officerEmail = `officer.test.${runId}@maatram.org`;
      const res = await request(app)
        .post('/api/v1/officers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Selvi Officer',
          email: officerEmail,
          phone: '9876599999',
          designation: 'Zonal Lead Officer',
          zoneId: testZone.id,
          employeeId: `EMP-Z-${runId.slice(-4)}`,
          temporaryPassword: 'Maatram@2026',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Selvi Officer');
      expect(res.body.data.zoneId).toBe(testZone.id);

      const user = await prisma.user.findUnique({ where: { email: officerEmail } });
      expect(user.mustChangePassword).toBe(true);
    });
  });
});

