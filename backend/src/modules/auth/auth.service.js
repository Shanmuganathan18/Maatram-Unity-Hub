/**
 * src/modules/auth/auth.service.js
 *
 * Core authentication service.
 * Coordinates between Supabase Auth (identity provider) and MySQL (application profiles).
 */
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const prisma = require('../../config/database');
const emailService = require('../../services/emailService');
const {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  NotFoundError,
  AppError,
} = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Sign in with email and password via Supabase Auth.
 * Then loads application profile from MySQL.
 */
const login = async (email, password, context = {}) => {
  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new AuthenticationError('Invalid email or password');
  }

  const { access_token, refresh_token, user: sbUser } = data.session;

  // 2. Load application profile from MySQL
  const appUser = await prisma.user.findUnique({
    where: { supabaseUid: sbUser.id },
    include: {
      studentProfile: {
        include: { institution: { select: { id: true, name: true, code: true } } },
      },
      officerProfile: {
        include: { zone: { select: { id: true, name: true, code: true } } },
      },
      adminProfile: {
        include: {
          role: {
            include: { permissions: { select: { permissionKey: true } } },
          },
        },
      },
    },
  });

  if (!appUser) {
    throw new AuthenticationError('Account exists in identity provider but application profile is missing. Please contact support.');
  }

  if (appUser.status !== 'ACTIVE') {
    throw new AuthenticationError(`Your account is ${appUser.status.toLowerCase().replace('_', ' ')}. Please contact an administrator.`);
  }

  // 3. Update last login timestamp
  await prisma.user.update({
    where: { id: appUser.id },
    data: { lastLoginAt: new Date() },
  });

  // 4. Audit log for logins
  if (appUser.role === 'ADMIN' || appUser.role === 'SUPER_ADMIN') {
    await prisma.auditLog.create({
      data: {
        actorId: appUser.id,
        actorName: appUser.adminProfile?.name || appUser.email,
        actorRole: appUser.role.toLowerCase(),
        action: 'login',
        category: 'Login',
        description: 'Signed in',
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });
  }

  // 5. Build clean response payload
  const profile = formatProfileResponse(appUser);

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    user: profile,
  };
};

/**
 * Register a new student.
 * Creates the Supabase Auth user first, then creates MySQL records in a transaction.
 * If MySQL creation fails, the Supabase user is rolled back (compensated).
 */
const registerStudent = async ({ email, password, name, phone, institutionId, department, year }) => {
  // 1. Verify institution exists and get its zone (supports ID, code, or name)
  const trimmedInst = (institutionId || '').trim();
  const institution = await prisma.institution.findFirst({
    where: {
      OR: [
        { id: trimmedInst },
        { code: trimmedInst },
        { name: trimmedInst },
        { name: { contains: trimmedInst } },
      ],
    },
    select: { id: true, zoneId: true, status: true },
  });

  if (!institution || (institution.status && institution.status.toUpperCase() === 'INACTIVE')) {
    throw new NotFoundError('Selected institution is not valid or currently inactive');
  }

  if (!institution.zoneId) {
    throw new AppError('Selected institution has no assigned zone. Please contact support.', 400);
  }

  // Check if email already registered in MySQL
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  // 2. Create user in Supabase Auth via Admin client
  const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Send confirmation email
    user_metadata: { name, role: 'STUDENT' },
  });

  if (sbError) {
    logger.error('Supabase user creation failed:', sbError);
    if (sbError.message.includes('already registered')) {
      throw new ConflictError('An account with this email already exists');
    }
    throw new AppError('Failed to create account in identity provider', 500);
  }

  const supabaseUid = sbData.user.id;

  // 3. Create MySQL records in a transaction
  try {
    const student = await prisma.$transaction(async (tx) => {
      // Create user record
      const newUser = await tx.user.create({
        data: {
          supabaseUid,
          email,
          role: 'STUDENT',
          status: 'PENDING_ACTIVATION', // activated upon email verification
        },
      });

      // Generate student ID: MF-<ZoneCode>-<4-digit-seq>
      const zone = await tx.zone.findUnique({ where: { id: institution.zoneId } });
      const zoneCode = zone?.code?.replace('ZN-', '') || 'X';
      const count = await tx.studentProfile.count({ where: { zoneId: institution.zoneId } });
      const seq = String(count + 1).padStart(4, '0');
      const studentId = `MF-${zoneCode}-${seq}`;

      // Create student profile
      const newProfile = await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          studentId,
          name,
          phone: phone || null,
          institutionId: institution.id,
          year,
          zoneId: institution.zoneId,
          status: 'PENDING_ACTIVATION',
          groups: [],
        },
        include: {
          institution: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
        },
      });

      return { user: newUser, profile: newProfile };
    });

    return {
      studentId: student.profile.studentId,
      email,
      name,
      status: student.user.status,
    };
  } catch (dbError) {
    // Compensation: delete the orphaned Supabase user
    logger.error('MySQL transaction failed during registration — compensating Supabase:', dbError);
    await supabaseAdmin.auth.admin.deleteUser(supabaseUid).catch((delErr) => {
      logger.error('Failed to rollback Supabase user:', delErr);
    });
    throw dbError;
  }
};

/**
 * Logout — records audit log and optionally invalidates session.
 */
const logout = async (userId, context = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { adminProfile: true },
  });

  if (user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.adminProfile?.name || user.email,
        actorRole: user.role.toLowerCase(),
        action: 'logout',
        category: 'Login',
        description: 'Signed out',
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });
  }
};

/**
 * Returns full profile with role-specific details and permissions.
 */
const getFullProfile = async (userId) => {
  const appUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          institution: { select: { id: true, name: true, code: true, location: true } },
          zone: { select: { id: true, name: true, code: true } },
        },
      },
      officerProfile: {
        include: {
          zone: { select: { id: true, name: true, code: true, region: true } },
        },
      },
      adminProfile: {
        include: {
          role: {
            include: { permissions: { select: { permissionKey: true } } },
          },
        },
      },
    },
  });

  if (!appUser) throw new NotFoundError('User profile not found');
  return formatProfileResponse(appUser);
};

/**
 * Exchange refresh token for new access token via Supabase.
 */
const refreshToken = async (refreshToken) => {
  if (!refreshToken) throw new AuthenticationError('Refresh token required');

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
};

/**
 * Password Policy Enforcement:
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character.
 */
const validatePasswordPolicy = (pwd) => {
  if (!pwd || typeof pwd !== 'string') {
    throw new ValidationError('Password is required');
  }
  if (pwd.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(pwd)) {
    throw new ValidationError('Password must contain at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(pwd)) {
    throw new ValidationError('Password must contain at least one lowercase letter (a-z)');
  }
  if (!/[0-9]/.test(pwd)) {
    throw new ValidationError('Password must contain at least one digit (0-9)');
  }
  if (!/[^A-Za-z0-9]/.test(pwd)) {
    throw new ValidationError('Password must contain at least one special character (!@#$%^&*...)');
  }
};

/**
 * Change password for authenticated user (verifies current password).
 */
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  validatePasswordPolicy(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: { select: { name: true } },
      officerProfile: { select: { name: true } },
      adminProfile: { select: { name: true } },
    },
  });
  if (!user) throw new NotFoundError('User account not found');

  // Verify current password via Supabase Auth
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Update password in Supabase Auth via Admin client
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseUid, {
    password: newPassword,
  });
  if (updateErr) {
    throw new AppError(`Failed to update password: ${updateErr.message}`, 500);
  }

  // Clear mustChangePassword state in MySQL
  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: false },
  });

  const name = user.studentProfile?.name || user.officerProfile?.name || user.adminProfile?.name || user.email;
  emailService.sendPasswordChangedEmail({ to: user.email, name }).catch((e) => {
    logger.warn('Password change confirmation email failed:', e.message);
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorName: name,
      actorRole: user.role.toLowerCase(),
      action: 'auth.password_changed',
      category: 'Security',
      description: `Password changed successfully for ${user.email}`,
    },
  });

  return { success: true, message: 'Password updated successfully' };
};

/**
 * Send password reset email via custom Nodemailer template or Supabase Auth.
 */
const sendPasswordReset = async (email, portal = 'student') => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: {
      studentProfile: { select: { name: true } },
      officerProfile: { select: { name: true } },
      adminProfile: { select: { name: true } },
    },
  });

  // Always return success to prevent email enumeration
  if (!user || user.status !== 'ACTIVE') {
    return { sent: true };
  }

  let portalUrl = env.cors.allowedOrigins[0];
  if (portal === 'officer') portalUrl = env.cors.allowedOrigins[1];
  if (portal === 'admin') portalUrl = env.cors.allowedOrigins[2];

  const resetUrl = `${portalUrl}/reset-password`;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: resetUrl },
    });

    const actionLink = data?.properties?.action_link || resetUrl;
    const name = user.studentProfile?.name || user.officerProfile?.name || user.adminProfile?.name || user.email;

    await emailService.sendPasswordResetEmail({
      to: cleanEmail,
      name,
      resetUrl: actionLink,
    });
  } catch (err) {
    await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: resetUrl });
  }

  return { sent: true };
};

/**
 * Reset password via verified reset token.
 */
const resetPassword = async ({ token, newPassword }) => {
  validatePasswordPolicy(newPassword);

  let sbUser;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      const payload = jwt.verify(token, env.supabase.jwtSecret);
      sbUser = { id: payload.sub, email: payload.email };
    } else {
      sbUser = data.user;
    }
  } catch (err) {
    throw new AuthenticationError('Invalid or expired password reset link');
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
    password: newPassword,
  });
  if (updateErr) {
    throw new AppError(`Failed to reset password: ${updateErr.message}`, 400);
  }

  await prisma.user.updateMany({
    where: { supabaseUid: sbUser.id },
    data: { mustChangePassword: false },
  });

  emailService.sendPasswordChangedEmail({ to: sbUser.email, name: sbUser.email }).catch(() => {});

  return { success: true, message: 'Password has been reset successfully' };
};

/**
 * Normalises profile structure for frontend consumption.
 */
const formatProfileResponse = (user) => {
  const base = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt,
  };

    if (user.role === 'STUDENT' && user.studentProfile) {
    const sp = user.studentProfile;
    return {
      ...base,
      profile: {
        id: sp.id,
        studentId: sp.studentId,
        name: sp.name,
        phone: sp.phone,
        photoUrl: sp.photoUrl,
        year: sp.year,
        department: sp.department?.name || null,
        groups: sp.groups,
        institution: sp.institution,
        zone: sp.zone,
        whatsappEnabled: sp.whatsappEnabled,
      },
    };
  }

  if (user.role === 'OFFICER' && user.officerProfile) {
    const op = user.officerProfile;
    return {
      ...base,
      profile: {
        id: op.id,
        officerId: op.officerId,
        name: op.name,
        phone: op.phone,
        designation: op.designation,
        photoUrl: op.photoUrl,
        zone: op.zone,
      },
    };
  }

  if (user.role === 'ADMIN' && user.adminProfile) {
    const ap = user.adminProfile;
    return {
      ...base,
      profile: {
        id: ap.id,
        adminId: ap.adminId,
        name: ap.name,
        phone: ap.phone,
        photoUrl: ap.photoUrl,
        roleId: ap.roleId,
        roleLabel: ap.role?.label,
        permissions: ap.role?.permissions?.map((p) => p.permissionKey) || [],
      },
    };
  }

  return base;
};

/**
 * Handle Google OAuth authentication callback from frontends.
 *
 * @param {string} token - Supabase access token from OAuth session
 * @param {'student'|'officer'|'admin'} portal - Target application portal
 * @param {Object} context - { ip, userAgent }
 */
const handleGoogleAuth = async (token, portal, context = {}) => {
  if (!token) {
    throw new AuthenticationError('Authentication token is required');
  }

  // 1. Verify token with Supabase Auth or fallback JWT signature
  let sbUser;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      const payload = jwt.verify(token, env.supabase.jwtSecret);
      sbUser = {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata || {},
      };
    } else {
      sbUser = data.user;
    }
  } catch (err) {
    throw new AuthenticationError('Invalid or expired authentication session');
  }

  const email = (sbUser.email || '').toLowerCase().trim();
  const supabaseUid = sbUser.id;
  const fullName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || '';
  const avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;

  // Check email and verified status
  const isEmailVerified =
    sbUser.user_metadata?.email_verified === true ||
    Boolean(sbUser.email_confirmed_at) ||
    Boolean(sbUser.confirmed_at) ||
    Boolean(sbUser.email); // fallback for local mock JWT test tokens

  if (!email) {
    throw new AuthenticationError('Google account does not provide an email address');
  }

  // 2. Locate user in MySQL by supabaseUid or email
  let appUser = await prisma.user.findFirst({
    where: {
      OR: [{ supabaseUid }, { email }],
    },
    include: {
      studentProfile: {
        include: {
          institution: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
        },
      },
      officerProfile: {
        include: {
          zone: { select: { id: true, name: true, code: true } },
        },
      },
      adminProfile: {
        include: {
          role: {
            include: { permissions: { select: { permissionKey: true } } },
          },
        },
      },
    },
  });

  // Safe rejection: NEVER delete Supabase identities blindly upon failed authorization
  const rejectUnauthorized = (customMsg) => {
    throw new AuthorizationError(
      customMsg ||
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
    );
  };

  // 3. Portal-specific validation and authorization

  // ─────────────────────────────────────────────────────────────
  // A. ADMIN PORTAL (Strict: Existing ADMIN account only)
  // ─────────────────────────────────────────────────────────────
  if (portal === 'admin') {
    if (!appUser || appUser.role !== 'ADMIN') {
      rejectUnauthorized(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    if (appUser.status !== 'ACTIVE') {
      throw new AuthorizationError(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    // Link supabaseUid if different or newly linked
    if (appUser.supabaseUid !== supabaseUid) {
      appUser = await prisma.user.update({
        where: { id: appUser.id },
        data: { supabaseUid, lastLoginAt: new Date() },
        include: { adminProfile: { include: { role: true } } },
      });
    } else {
      await prisma.user.update({
        where: { id: appUser.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: appUser.id,
        actorName: appUser.adminProfile?.name || appUser.email,
        actorRole: 'admin',
        action: 'login.google',
        category: 'Login',
        description: `Administrator signed in via Google OAuth (${email})`,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });

    return {
      accessToken: token,
      isComplete: true,
      missingFields: [],
      user: formatProfileResponse(appUser),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // B. OFFICER PORTAL (Strict: Existing OFFICER account in assigned zone)
  // ─────────────────────────────────────────────────────────────
  if (portal === 'officer') {
    if (!appUser || appUser.role !== 'OFFICER') {
      rejectUnauthorized(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    if (appUser.status !== 'ACTIVE' || appUser.officerProfile?.status !== 'ACTIVE') {
      throw new AuthorizationError(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    if (!appUser.officerProfile?.zoneId) {
      throw new AuthorizationError(
        'Your Officer account is not assigned to a zone. Please contact an Administrator.',
      );
    }

    // Link supabaseUid if needed
    if (appUser.supabaseUid !== supabaseUid) {
      appUser = await prisma.user.update({
        where: { id: appUser.id },
        data: { supabaseUid, lastLoginAt: new Date() },
        include: { officerProfile: { include: { zone: true } } },
      });
    } else {
      await prisma.user.update({
        where: { id: appUser.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: appUser.id,
        actorName: appUser.officerProfile?.name || appUser.email,
        actorRole: 'officer',
        action: 'login.google',
        category: 'Login',
        description: `Zone Officer signed in via Google OAuth (${email})`,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });

    return {
      accessToken: token,
      isComplete: true,
      missingFields: [],
      user: formatProfileResponse(appUser),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // C. STUDENT PORTAL (Strict: Existing pre-provisioned student only)
  // ─────────────────────────────────────────────────────────────
  if (portal === 'student') {
    if (!appUser || appUser.role !== 'STUDENT') {
      rejectUnauthorized(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    if (appUser.status === 'SUSPENDED' || appUser.status === 'INACTIVE') {
      throw new AuthorizationError(
        'Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.',
      );
    }

    const sp = appUser.studentProfile;
    const isComplete = Boolean(sp?.institutionId && sp?.zoneId && (sp?.departmentId || sp?.department) && sp?.year);

    // Activate if was pending activation (Google email is verified)
    const nextStatus = appUser.status === 'PENDING_ACTIVATION' ? 'ACTIVE' : appUser.status;

    appUser = await prisma.user.update({
      where: { id: appUser.id },
      data: {
        supabaseUid,
        status: nextStatus,
        lastLoginAt: new Date(),
      },
      include: {
        studentProfile: {
          include: { institution: true, zone: true, department: true },
        },
      },
    });

    if (avatarUrl && sp && !sp.photoUrl) {
      await prisma.studentProfile.update({
        where: { id: sp.id },
        data: { photoUrl: avatarUrl, status: nextStatus },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: appUser.id,
        actorName: appUser.studentProfile?.name || appUser.email,
        actorRole: 'student',
        action: 'login.google',
        category: 'Login',
        description: `Student signed in via Google OAuth (${email})`,
        zoneId: appUser.studentProfile?.zoneId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });

    return {
      accessToken: token,
      isComplete,
      missingFields: isComplete ? [] : (['institutionId', 'zoneId', 'department', 'year'].filter(f => !sp?.[f])),
      user: formatProfileResponse(appUser),
    };
  }

  throw new ValidationError('Invalid portal specified for Google sign in');
};

/**
 * Complete student profile onboarding for students who authenticated via Google.
 */
const completeStudentProfile = async ({ token, institutionId, department, year, phone }) => {
  if (!token) {
    throw new AuthenticationError('Authentication token is required');
  }

  let sbUser;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      const payload = jwt.verify(token, env.supabase.jwtSecret);
      sbUser = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata || {} };
    } else {
      sbUser = data.user;
    }
  } catch (err) {
    throw new AuthenticationError('Invalid or expired authentication session');
  }

  const email = (sbUser.email || '').toLowerCase().trim();
  const supabaseUid = sbUser.id;
  const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0];
  const photoUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;

  // Validate institution and derive authorized zone server-side (supports ID, code, or name match)
  const trimmedInst = (institutionId || '').trim();
  const institution = await prisma.institution.findFirst({
    where: {
      OR: [
        { id: trimmedInst },
        { code: trimmedInst },
        { name: trimmedInst },
        { name: { contains: trimmedInst } },
      ],
    },
    select: { id: true, zoneId: true, status: true },
  });

  if (!institution || (institution.status && institution.status.toUpperCase() === 'INACTIVE')) {
    throw new NotFoundError('Selected institution is not valid or currently inactive');
  }

  if (!institution.zoneId) {
    throw new AppError('Selected institution has no assigned zone. Please contact support.', 400);
  }

  const zoneId = institution.zoneId;
  const resolvedInstitutionId = institution.id;

  // Upsert user and student profile in atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        supabaseUid,
        role: 'STUDENT',
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
      create: {
        supabaseUid,
        email,
        role: 'STUDENT',
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });

    let profile = await tx.studentProfile.findUnique({
      where: { userId: user.id },
    });

    // Resolve or create department for the selected institution
    let deptRecord = null;
    if (department && typeof department === 'string') {
      deptRecord = await tx.department.upsert({
        where: {
          institutionId_name: {
            institutionId: resolvedInstitutionId,
            name: department.trim(),
          },
        },
        update: {},
        create: {
          institutionId: resolvedInstitutionId,
          name: department.trim(),
        },
      });
    }

    if (!profile) {
      const zone = await tx.zone.findUnique({ where: { id: zoneId } });
      const zoneCode = zone?.code?.replace('ZN-', '') || 'X';
      const count = await tx.studentProfile.count({ where: { zoneId } });
      const seq = String(count + 1).padStart(4, '0');
      const studentId = `MF-${zoneCode}-${seq}`;

      profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          studentId,
          name,
          phone: phone || null,
          photoUrl,
          institutionId: resolvedInstitutionId,
          departmentId: deptRecord ? deptRecord.id : null,
          year: parseInt(year, 10),
          zoneId,
          status: 'ACTIVE',
          groups: [],
        },
        include: {
          institution: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
        },
      });
    } else {
      profile = await tx.studentProfile.update({
        where: { id: profile.id },
        data: {
          institutionId: resolvedInstitutionId,
          departmentId: deptRecord ? deptRecord.id : profile.departmentId,
          year: parseInt(year, 10),
          phone: phone || profile.phone,
          zoneId,
          status: 'ACTIVE',
        },
        include: {
          institution: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
        },
      });
    }

    return { user, profile };
  });

  return {
    isComplete: true,
    user: formatProfileResponse({
      ...result.user,
      studentProfile: result.profile,
    }),
  };
};

module.exports = {
  login,
  registerStudent,
  logout,
  getFullProfile,
  refreshToken,
  sendPasswordReset,
  changePassword,
  resetPassword,
  handleGoogleAuth,
  completeStudentProfile,
};

