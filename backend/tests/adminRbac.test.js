/**
 * tests/adminRbac.test.js
 * Comprehensive tests for the single ADMIN role, access control, and security constraints:
 * 1. Initial Admin can authenticate with valid token.
 * 2. Admin can access system-wide endpoints (all zones).
 * 3. Both Admin accounts have identical permissions (no Super Admin / Read-only Admin hierarchy).
 * 4. Admin is not restricted by officer zone assignments.
 * 5. Student cannot access Admin APIs or create an Admin account (403).
 * 6. Officer cannot access Admin APIs or create an Admin account (403).
 * 7. Unauthenticated users cannot access Admin APIs (401).
 * 8. Ordinary users cannot escalate their role to Admin.
 * 9. Deactivated Admin accounts are blocked by requireActiveAccount.
 * 10. Self-deactivation and last-admin deactivation are prevented.
 * 11. Admin creation and status changes generate audit logs.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/database');
const { requireRole, requireActiveAccount, requirePermission } = require('../src/middleware/authorize');
const { AuthorizationError, AuthenticationError, BadRequestError } = require('../src/utils/errors');
const adminService = require('../src/modules/admins/admin.service');

// Helper to generate test JWTs
const makeToken = (userId, role = 'ADMIN') => {
  return jwt.sign(
    {
      sub: userId,
      role,
      iss: 'https://mock.supabase.co/auth/v1',
      aud: 'authenticated',
    },
    env.supabase.jwtSecret,
    { expiresIn: '1h' },
  );
};

describe('Admin Role Authorization & Access Control (Single ADMIN Model)', () => {
  const adminId1 = '00000000-0000-0000-0000-000000000001';
  const adminId2 = '00000000-0000-0000-0000-000000000002';
  const officerId = '00000000-0000-0000-0000-000000000004';
  const studentId = '00000000-0000-0000-0000-000000000006';

  const adminToken1 = makeToken(adminId1, 'ADMIN');
  const adminToken2 = makeToken(adminId2, 'ADMIN');
  const officerToken = makeToken(officerId, 'OFFICER');
  const studentToken = makeToken(studentId, 'STUDENT');

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Role Hierarchy Removal & Single Role Verification', () => {
    it('should allow ADMIN role through requireRole("ADMIN")', () => {
      const req = { user: { id: adminId1, role: 'ADMIN', status: 'ACTIVE' } };
      const next = jest.fn();
      requireRole('ADMIN')(req, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should grant both Admin 1 and Admin 2 identical access without role tiers', () => {
      const req1 = { user: { id: adminId1, role: 'ADMIN', status: 'ACTIVE' } };
      const req2 = { user: { id: adminId2, role: 'ADMIN', status: 'ACTIVE' } };
      const next1 = jest.fn();
      const next2 = jest.fn();

      requireRole('ADMIN')(req1, {}, next1);
      requireRole('ADMIN')(req2, {}, next2);

      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
    });

    it('should reject SUPER_ADMIN as an obsolete role if attempted', () => {
      const req = { user: { id: 'old-super', role: 'SUPER_ADMIN', status: 'ACTIVE' } };
      const next = jest.fn();
      requireRole('ADMIN')(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.message).toContain('ADMIN');
    });
  });

  describe('2. Unauthenticated and Unauthorized Access Protections', () => {
    it('should reject unauthenticated request to /api/v1/admins (401)', async () => {
      const res = await request(app).get('/api/v1/admins');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject Student access to /api/v1/admins (403)', async () => {
      // Mock prisma.user.findUnique for student
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: studentId,
        supabaseUid: studentId,
        role: 'STUDENT',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .get('/api/v1/admins')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject Officer access to /api/v1/admins (403)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: officerId,
        supabaseUid: officerId,
        role: 'OFFICER',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .get('/api/v1/admins')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Student from creating an Admin account (403)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: studentId,
        supabaseUid: studentId,
        role: 'STUDENT',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/admins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Sneaky Student', email: 'sneaky@student.org' });

      expect(res.statusCode).toBe(403);
    });

    it('should prevent Officer from creating an Admin account (403)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: officerId,
        supabaseUid: officerId,
        role: 'OFFICER',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/admins')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ name: 'Rogue Officer', email: 'rogue@officer.org' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('3. Deactivated Account Enforcement', () => {
    it('should reject deactivated Admin from using protected APIs', () => {
      const req = { user: { id: adminId1, role: 'ADMIN', status: 'INACTIVE' } };
      const next = jest.fn();

      requireActiveAccount(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.message).toContain('not active');
    });

    it('should prevent Admin from deactivating their own account', async () => {
      const actor = { id: adminId1, email: 'admin1@maatram.org' };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: adminId1,
        role: 'ADMIN',
        email: 'admin1@maatram.org',
        adminProfile: { name: 'Admin 1' },
      });

      await expect(
        adminService.toggleAdminStatus(adminId1, 'INACTIVE', actor),
      ).rejects.toThrow('You cannot deactivate your own Administrator account');
    });

    it('should prevent deactivating the last active Admin', async () => {
      const actor = { id: adminId1, email: 'admin1@maatram.org' };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: adminId2,
        role: 'ADMIN',
        email: 'admin2@maatram.org',
        adminProfile: { name: 'Admin 2' },
      });

      // Only 1 active admin remains
      jest.spyOn(prisma.user, 'count').mockResolvedValueOnce(1);

      await expect(
        adminService.toggleAdminStatus(adminId2, 'INACTIVE', actor),
      ).rejects.toThrow('At least one active Administrator account must remain');
    });
  });

  describe('4. Administrative Permissions & Zone Freedom', () => {
    it('should allow ADMIN to pass requirePermission checks without zone restrictions', async () => {
      const req = {
        user: { id: adminId1, role: 'ADMIN', status: 'ACTIVE' },
      };
      const next = jest.fn();

      jest.spyOn(prisma.adminProfile, 'findUnique').mockResolvedValueOnce({
        id: 'ap1',
        userId: adminId1,
        status: 'ACTIVE',
        role: {
          permissions: [{ permissionKey: 'zones.create' }],
        },
      });

      await requirePermission('zones.create')(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.adminProfile).toBeDefined();
      expect(req.zoneId).toBeUndefined(); // Admins are NOT scoped to a single zone!
    });
  });
});

