/**
 * src/middleware/authorize.js
 *
 * Role and permission middleware.
 * Always runs AFTER authenticate.js (req.user must be set).
 *
 * Usage:
 *   router.get('/zones', authenticate, requireRole('ADMIN'), handler)
 *   router.post('/zones', authenticate, requirePermission('zones.create'), handler)
 */
const prisma = require('../config/database');
const { AuthorizationError, AuthenticationError } = require('../utils/errors');

/**
 * Requires the user to have one of the listed roles.
 * Roles: STUDENT | OFFICER | ADMIN
 */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AuthenticationError());
  if (!roles.includes(req.user.role)) {
    return next(
      new AuthorizationError(
        `This action requires one of the following roles: ${roles.join(', ')}`,
      ),
    );
  }
  next();
};

/**
 * Requires the user's account to be active.
 */
const requireActiveAccount = (req, _res, next) => {
  if (!req.user) return next(new AuthenticationError());
  if (req.user.status !== 'ACTIVE') {
    return next(
      new AuthorizationError(
        'Your account is not active. Please contact an Administrator.',
      ),
    );
  }
  next();
};

/**
 * Validates administrative access for the ADMIN role.
 * All authenticated users with the single ADMIN role have complete, system-wide access.
 *
 * Permission keys match the application catalogue (e.g. 'zones.create', 'students.view').
 */
const requirePermission = (permissionKey) => async (req, _res, next) => {
  try {
    if (!req.user) return next(new AuthenticationError());

    // Only the unified ADMIN role has administrative access across all records
    if (req.user.role !== 'ADMIN') {
      return next(new AuthorizationError('Insufficient role for this action'));
    }

    // Verify admin profile exists and is active
    if (!req.adminProfile) {
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: { select: { permissionKey: true } },
            },
          },
        },
      });

      if (!adminProfile) {
        return next(new AuthorizationError('Admin profile not found'));
      }

      if (adminProfile.status !== 'ACTIVE') {
        return next(new AuthorizationError('Your admin account is not active.'));
      }

      req.adminProfile = adminProfile;
      req.adminPermissions = new Set(
        adminProfile.role?.permissions?.map((p) => p.permissionKey) || [],
      );
    }

    // Every ADMIN role inherently possesses all administrative permissions
    // If specific DB permission checking is needed, fallback to checking permission set
    if (req.adminPermissions.size > 0 && !req.adminPermissions.has(permissionKey)) {
      return next(
        new AuthorizationError(
          `Missing required permission: ${permissionKey}`,
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Loads the authenticated officer's zone from their profile.
 * Attaches req.officerProfile and req.zoneId to the request.
 *
 * CRITICAL: The zoneId is ALWAYS read from the DB — never from req.body or req.params.
 */
const requireZoneAccess = async (req, _res, next) => {
  try {
    if (!req.user) return next(new AuthenticationError());
    if (req.user.role !== 'OFFICER') {
      return next(new AuthorizationError('Only zone officers can access this resource'));
    }

    if (!req.officerProfile) {
      const officerProfile = await prisma.officerProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true, zoneId: true, name: true, designation: true, status: true },
      });

      if (!officerProfile) {
        return next(new AuthorizationError('Officer profile not found'));
      }

      if (officerProfile.status !== 'ACTIVE') {
        return next(
          new AuthorizationError(
            'Your officer account is not active. Contact an Administrator.',
          ),
        );
      }

      req.officerProfile = officerProfile;
    }

    if (!req.officerProfile) {
      return next(new AuthorizationError('Officer profile not found'));
    }

    if (req.officerProfile.status !== 'ACTIVE') {
      return next(
        new AuthorizationError(
          'Your officer account is not active. Contact an Administrator.',
        ),
      );
    }

    req.zoneId = req.officerProfile.zoneId; // This is the ONLY authoritative zone
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Convenience: authenticate + active account + zone access in one stack.
 * Use for all officer-only routes.
 */
const officerAuth = [requireActiveAccount, requireZoneAccess];

/**
 * Convenience: authenticate + active account + admin role in one stack.
 */
const adminAuth = [requireActiveAccount, requireRole('ADMIN')];

module.exports = {
  requireRole,
  requireActiveAccount,
  requirePermission,
  requireZoneAccess,
  officerAuth,
  adminAuth,
};

