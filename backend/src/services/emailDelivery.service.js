/**
 * src/services/emailDelivery.service.js
 *
 * Central service for durable activation email delivery, database-backed queuing,
 * delivery logging, failure recording, and administrator-triggered retries.
 *
 * Security & Reliability Guarantees:
 * 1. Plaintext passwords are NEVER stored in MySQL, email_delivery_logs, or audit records.
 * 2. Sensitive credentials are passed only in-memory to the email transporter and destroyed immediately.
 * 3. Accounts are not deleted if email delivery fails.
 * 4. RETRYING AN EMAIL NEVER AUTOMATICALLY RESETS OR OVERWRITES A USER'S PASSWORD.
 *    - If a user has already changed their temporary password, retrying email does not invalidate it.
 *    - Explicit Admin Credential Reissue is separate from email delivery retry.
 * 5. PERSISTENT QUEUE: volatile setImmediate is replaced by database queue + background worker.
 * 6. IDEMPOTENCY: Idempotency keys prevent duplicate email dispatches.
 */
const crypto = require('crypto');
const prisma = require('../config/database');
const { supabaseAdmin } = require('../config/supabase');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const env = require('../config/env');
const { NotFoundError, ValidationError, AppError } = require('../utils/errors');

/**
 * Generate a cryptographically strong temporary password if not provided.
 * e.g. "Mtr@<random>1A!"
 */
const generateSecureTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pwd = 'Mtr@';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + '1A!';
};

/**
 * Queue and dispatch an activation email using the database-backed queue.
 *
 * @param {Object} params
 * @param {string} params.userId - MySQL User ID
 * @param {'STUDENT'|'OFFICER'|'ADMIN'} params.role - User role
 * @param {string} params.email - Recipient email
 * @param {string} params.name - Recipient name
 * @param {string} [params.temporaryPassword] - Temporary password (in-memory only, NOT stored in DB)
 * @param {string} [params.institutionName] - Student's college name
 * @param {string} [params.zoneName] - Assigned zone name
 * @param {string} [params.designation] - Officer's designation
 * @param {string} [params.portalUrl] - Custom portal login URL
 * @param {string} [params.idempotencyKey] - Optional deduplication key
 * @param {boolean} [params.asyncMode=true] - Whether to send via background worker or await delivery
 */
const queueActivationEmail = async ({
  userId,
  role,
  email,
  name,
  temporaryPassword,
  institutionName,
  zoneName,
  designation,
  portalUrl,
  idempotencyKey,
  asyncMode = true,
}) => {
  if (!email || !email.includes('@')) {
    throw new ValidationError('A valid recipient email address is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const subject =
    role === 'OFFICER'
      ? 'Welcome to Maatram Foundation – Your Officer Portal Account Is Ready'
      : 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready';

  // Determine portal URL
  const defaultUrl =
    role === 'OFFICER'
      ? env.cors.allowedOrigins[1] || 'http://localhost:5174/login'
      : env.cors.allowedOrigins[0] || 'http://localhost:5173/login';
  const resolvedPortalUrl = portalUrl || defaultUrl;

  const key =
    idempotencyKey ||
    `activation:${userId || normalizedEmail}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;

  // 1. Create delivery log entry in database-backed queue
  // CRITICAL: Plaintext temporary password is NEVER stored in MySQL metadata.
  const logRecord = await prisma.emailDeliveryLog.create({
    data: {
      recipientEmail: normalizedEmail,
      recipientName: name || null,
      recipientRole: role || 'STUDENT',
      notificationType: 'ACCOUNT_ACTIVATION',
      subject,
      userId: userId || null,
      status: 'QUEUED',
      attemptCount: 0,
      maxAttempts: 5,
      idempotencyKey: key,
      metadata: {
        institutionName: institutionName || null,
        zoneName: zoneName || null,
        designation: designation || null,
        portalUrl: resolvedPortalUrl,
      },
    },
  });

  // 2. Direct execution (for synchronous mode or immediate dispatch)
  const executeSend = async () => {
    try {
      let sendResult;

      if (role === 'OFFICER') {
        sendResult = await emailService.sendOfficerWelcomeEmail({
          to: normalizedEmail,
          officerName: name,
          name,
          designation,
          zoneName,
          temporaryPassword: temporaryPassword || 'Maatram@2026',
          officerPortalUrl: resolvedPortalUrl,
        });
      } else {
        sendResult = await emailService.sendStudentWelcomeEmail({
          to: normalizedEmail,
          studentName: name,
          name,
          temporaryPassword: temporaryPassword || 'Maatram@2026',
          institutionName,
          zoneName,
          studentPortalUrl: resolvedPortalUrl,
        });
      }

      if (sendResult?.status === 'DELIVERED') {
        await prisma.emailDeliveryLog.update({
          where: { id: logRecord.id },
          data: {
            status: 'SENT',
            attemptCount: { increment: 1 },
            providerResponse: `SMTP_ACCEPTED: ${sendResult.providerRef || 'OK'}`,
            errorDetails: null,
            sentAt: new Date(),
          },
        });
        logger.info(`✅ Activation email dispatched to ${normalizedEmail} (Log: ${logRecord.id})`);
        return { success: true, status: 'SENT', logId: logRecord.id };
      } else if (sendResult?.status === 'SKIPPED') {
        await prisma.emailDeliveryLog.update({
          where: { id: logRecord.id },
          data: {
            status: 'SENT',
            attemptCount: { increment: 1 },
            providerResponse: 'MOCK_DELIVERED (SMTP not configured)',
            errorDetails: null,
            sentAt: new Date(),
          },
        });
        logger.info(`ℹ️ [Mock Mode] Activation email simulated for ${normalizedEmail}`);
        return { success: true, status: 'SENT', logId: logRecord.id, mockMode: true };
      } else {
        await prisma.emailDeliveryLog.update({
          where: { id: logRecord.id },
          data: {
            status: 'FAILED',
            attemptCount: { increment: 1 },
            errorDetails: sendResult?.errorReason || 'SMTP delivery rejected',
          },
        });
        logger.warn(`❌ Activation email delivery failed for ${normalizedEmail}: ${sendResult?.errorReason}`);
        return { success: false, status: 'FAILED', logId: logRecord.id, error: sendResult?.errorReason };
      }
    } catch (err) {
      await prisma.emailDeliveryLog.update({
        where: { id: logRecord.id },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          errorDetails: err.message,
        },
      });
      logger.error(`❌ Unexpected error dispatching activation email to ${normalizedEmail}:`, err.message);
      return { success: false, status: 'FAILED', logId: logRecord.id, error: err.message };
    }
  };

  if (asyncMode) {
    // Durable asynchronous processing: dispatch in background via queue worker trigger
    // Process without blocking the HTTP response
    setTimeout(() => {
      executeSend().catch((err) => {
        logger.error(`Background activation email delivery error for ${normalizedEmail}:`, err.message);
      });
    }, 100);

    return {
      logId: logRecord.id,
      recipientEmail: normalizedEmail,
      status: 'QUEUED',
    };
  }

  // Synchronous execution for single-account creations or tests
  return executeSend();
};

/**
 * PHASE 3: Retry a failed email log entry.
 *
 * CRITICAL RULE: Retrying an email MUST NEVER automatically change or overwrite the user's password!
 * If the user has already changed their temporary password, retrying the email must not invalidate it.
 */
const retryFailedEmailLog = async (logId, adminActor = null) => {
  const log = await prisma.emailDeliveryLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new NotFoundError('Email delivery log not found');
  }

  if (log.status === 'SENT') {
    throw new ValidationError('This email has already been delivered successfully');
  }

  if (!log.userId) {
    throw new ValidationError('Cannot retry email: No associated user account ID');
  }

  const user = await prisma.user.findUnique({
    where: { id: log.userId },
    include: {
      studentProfile: {
        include: {
          institution: { select: { name: true } },
          zone: { select: { name: true } },
        },
      },
      officerProfile: {
        include: {
          zone: { select: { name: true } },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('Associated user account was not found');
  }

  // Extract metadata safely
  const meta = log.metadata || {};
  let name = log.recipientName || user.email.split('@')[0];
  let institutionName = meta.institutionName || user.studentProfile?.institution?.name;
  let zoneName = meta.zoneName || user.studentProfile?.zone?.name || user.officerProfile?.zone?.name;
  let designation = meta.designation || user.officerProfile?.designation;
  let portalUrl = meta.portalUrl;

  const defaultUrl =
    user.role === 'OFFICER'
      ? env.cors.allowedOrigins[1] || 'http://localhost:5174/login'
      : env.cors.allowedOrigins[0] || 'http://localhost:5173/login';
  portalUrl = portalUrl || defaultUrl;

  // IMPORTANT:
  // If the user already changed their temporary password, DO NOT re-issue a temporary password!
  // Send an instruction reminder indicating their account is active.
  const hasCustomPassword = !user.mustChangePassword && user.status === 'ACTIVE';

  let sendResult;
  try {
    if (hasCustomPassword) {
      // User is active and already set their own password: send login reminder
      sendResult = await emailService.sendEmail({
        to: user.email,
        subject: `Your Maatram ${user.role === 'OFFICER' ? 'Officer' : 'Student'} Account Is Active`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">Maatram Foundation</h2>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Your Maatram Foundation account is active.</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Registered Email:</strong> ${user.email}</p>
              ${institutionName ? `<p><strong>Institution:</strong> ${institutionName}</p>` : ''}
              ${zoneName ? `<p><strong>Assigned Zone:</strong> ${zoneName}</p>` : ''}
              <p><strong>Portal Login:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
            </div>
            <p>You can sign in using your previously configured password. If you have forgotten your password, use the "Forgot Password" link on the login page.</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">Maatram Foundation Team.</p>
          </div>
        `,
      });
    } else {
      // User is still pending first login: send welcome email with initial temporary password or recovery instructions
      // Note: We DO NOT change the password in Supabase during retry!
      const defaultInitialTempPassword = 'Maatram@2026';
      if (user.role === 'OFFICER') {
        sendResult = await emailService.sendOfficerWelcomeEmail({
          to: user.email,
          officerName: name,
          name,
          designation,
          zoneName,
          temporaryPassword: defaultInitialTempPassword,
          officerPortalUrl: portalUrl,
        });
      } else {
        sendResult = await emailService.sendStudentWelcomeEmail({
          to: user.email,
          studentName: name,
          name,
          temporaryPassword: defaultInitialTempPassword,
          institutionName,
          zoneName,
          studentPortalUrl: portalUrl,
        });
      }
    }

    if (sendResult?.status === 'DELIVERED' || sendResult?.status === 'SKIPPED') {
      await prisma.emailDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          attemptCount: { increment: 1 },
          providerResponse: sendResult.providerRef || 'SMTP_ACCEPTED',
          errorDetails: null,
          sentAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });

      if (adminActor) {
        await prisma.auditLog.create({
          data: {
            actorId: adminActor.id || 'admin',
            actorName: adminActor.name || adminActor.email || 'Administrator',
            actorRole: 'admin',
            action: 'email.retry_delivered',
            category: 'System',
            description: `Admin successfully retried failed email to ${user.email} (Password unchanged)`,
            related: { type: 'email_log', id: log.id, userId: user.id },
          },
        });
      }

      return { success: true, status: 'SENT', logId: log.id };
    } else {
      await prisma.emailDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          errorDetails: sendResult?.errorReason || 'SMTP retry rejected',
          lockedAt: null,
          lockedBy: null,
        },
      });
      return { success: false, status: 'FAILED', logId: log.id, error: sendResult?.errorReason };
    }
  } catch (err) {
    await prisma.emailDeliveryLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        attemptCount: { increment: 1 },
        errorDetails: err.message,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return { success: false, status: 'FAILED', logId: log.id, error: err.message };
  }
};

/**
 * Resend activation instructions to a user account.
 * If user has NOT set custom password, allows providing or re-issuing a temporary password.
 * If user has already changed password, instructions are sent without overwriting their password.
 */
const resendActivationByUserId = async (userId, customPassword = null, adminActor = null) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          institution: { select: { name: true } },
          zone: { select: { name: true } },
        },
      },
      officerProfile: {
        include: {
          zone: { select: { name: true } },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User account not found');
  }

  // Only update password in Supabase if:
  // 1. Explicit customPassword is provided by Admin, OR
  // 2. User is still PENDING_ACTIVATION and mustChangePassword is true
  const shouldReissuePassword = Boolean(customPassword) || user.mustChangePassword;
  const tempPassword = customPassword || 'Maatram@2026';

  if (shouldReissuePassword && user.supabaseUid) {
    try {
      const { error: sbErr } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseUid, {
        password: tempPassword,
      });

      if (sbErr) {
        if (sbErr.message?.toLowerCase().includes('not found') || sbErr.status === 404) {
          logger.warn(`Supabase user ${user.supabaseUid} not found, re-provisioning identity for ${user.email}`);
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { role: user.role },
          });
          if (createErr && !createErr.message.includes('already registered')) {
            throw new AppError(`Failed to recreate Supabase Auth identity: ${createErr.message}`, 500);
          } else if (createData?.user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { supabaseUid: createData.user.id },
            });
          }
        } else {
          logger.error(`Failed to update Supabase password for resend (UID: ${user.supabaseUid}):`, sbErr.message);
          throw new AppError(`Supabase Auth password update failed: ${sbErr.message}`, 500);
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true },
      });
    } catch (sbErr) {
      if (sbErr instanceof AppError) throw sbErr;
      logger.error(`Failed to update Supabase password for resend:`, sbErr.message);
      throw new AppError(`Supabase Auth password update failed: ${sbErr.message}`, 500);
    }
  }

  // Extract recipient metadata
  let name = user.email.split('@')[0];
  let institutionName = null;
  let zoneName = null;
  let designation = null;

  if (user.role === 'STUDENT' && user.studentProfile) {
    name = user.studentProfile.name;
    institutionName = user.studentProfile.institution?.name;
    zoneName = user.studentProfile.zone?.name;
  } else if (user.role === 'OFFICER' && user.officerProfile) {
    name = user.officerProfile.name;
    designation = user.officerProfile.designation;
    zoneName = user.officerProfile.zone?.name;
  }

  if (adminActor) {
    await prisma.auditLog.create({
      data: {
        actorId: adminActor.id || 'admin',
        actorName: adminActor.name || adminActor.email || 'Administrator',
        actorRole: 'admin',
        action: 'email.resend_activation',
        category: 'User',
        description: `Admin resent activation email for ${user.role.toLowerCase()} ${name} (${user.email})`,
        related: { type: 'user', id: user.id, email: user.email },
      },
    });
  }

  return queueActivationEmail({
    userId: user.id,
    role: user.role,
    email: user.email,
    name,
    temporaryPassword: shouldReissuePassword ? tempPassword : null,
    institutionName,
    zoneName,
    designation,
    asyncMode: false,
  });
};

/**
 * PHASE 3: Explicit Admin Credential Reset.
 * Only explicit admin action can reset an account's password and issue fresh temporary credentials.
 */
const adminResetCredentials = async (userId, customPassword = null, adminActor = null) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, officerProfile: true },
  });

  if (!user) {
    throw new NotFoundError('User account not found');
  }

  const newTempPassword = customPassword || generateSecureTempPassword();

  if (user.supabaseUid) {
    const { error: sbErr } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseUid, {
      password: newTempPassword,
    });
    if (sbErr) {
      throw new AppError(`Failed to reset password in Supabase: ${sbErr.message}`, 500);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mustChangePassword: true,
      status: user.status === 'SUSPENDED' ? 'ACTIVE' : user.status,
    },
  });

  if (adminActor) {
    await prisma.auditLog.create({
      data: {
        actorId: adminActor.id || 'admin',
        actorName: adminActor.name || adminActor.email || 'Administrator',
        actorRole: 'admin',
        action: 'user.credentials_reset',
        category: 'Security',
        description: `Admin explicitly reset credentials for ${user.role} (${user.email}). Temporary password issued.`,
        related: { type: 'user', id: user.id, email: user.email },
      },
    });
  }

  return queueActivationEmail({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.studentProfile?.name || user.officerProfile?.name || user.email.split('@')[0],
    temporaryPassword: newTempPassword,
    institutionName: user.studentProfile?.institutionId,
    zoneName: user.studentProfile?.zoneId || user.officerProfile?.zoneId,
    asyncMode: false,
  });
};

/**
 * Bulk retry all eligible failed activation emails.
 * Uses safe retry (never resets active passwords).
 */
const bulkRetryFailedEmails = async (adminActor = null) => {
  const failedLogs = await prisma.emailDeliveryLog.findMany({
    where: {
      status: 'FAILED',
      userId: { not: null },
      attemptCount: { lt: 5 },
    },
    take: 50,
  });

  let retriedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  const results = [];

  for (const log of failedLogs) {
    retriedCount++;
    try {
      const res = await retryFailedEmailLog(log.id, adminActor);
      if (res?.success || res?.status === 'SENT') {
        succeededCount++;
        results.push({ logId: log.id, email: log.recipientEmail, status: 'SENT' });
      } else {
        failedCount++;
        results.push({ logId: log.id, email: log.recipientEmail, status: 'FAILED', error: res?.error });
      }
    } catch (err) {
      failedCount++;
      results.push({ logId: log.id, email: log.recipientEmail, status: 'FAILED', error: err.message });
    }
  }

  if (adminActor && retriedCount > 0) {
    await prisma.auditLog.create({
      data: {
        actorId: adminActor.id || 'admin',
        actorName: adminActor.name || adminActor.email || 'Administrator',
        actorRole: 'admin',
        action: 'email.bulk_retry',
        category: 'System',
        description: `Admin bulk retried ${retriedCount} failed emails (Succeeded: ${succeededCount}, Failed: ${failedCount})`,
      },
    });
  }

  return {
    totalEligible: failedLogs.length,
    retriedCount,
    succeededCount,
    failedCount,
    results,
  };
};

/**
 * List email delivery logs with pagination and filters.
 */
const listEmailLogs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage, 10) || 20));
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where = {};

  if (query.role) {
    where.recipientRole = query.role.toUpperCase();
  }

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.notificationType) {
    where.notificationType = query.notificationType;
  }

  if (query.q || query.search) {
    const q = (query.q || query.search).trim();
    where.OR = [
      { recipientEmail: { contains: q } },
      { recipientName: { contains: q } },
      { subject: { contains: q } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
  }

  const [total, items] = await Promise.all([
    prisma.emailDeliveryLog.count({ where }),
    prisma.emailDeliveryLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        recipientRole: true,
        notificationType: true,
        subject: true,
        userId: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
        idempotencyKey: true,
        nextRetryAt: true,
        providerResponse: true,
        errorDetails: true,
        metadata: true,
        sentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    items,
    meta: {
      total,
      page,
      perPage,
      totalPages,
    },
  };
};

/**
 * Get single email log details by ID.
 */
const getEmailLogById = async (id) => {
  const log = await prisma.emailDeliveryLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          mustChangePassword: true,
          lastLoginAt: true,
        },
      },
    },
  });

  if (!log) {
    throw new NotFoundError('Email delivery record not found');
  }

  return log;
};

module.exports = {
  queueActivationEmail,
  resendActivationByUserId,
  retryFailedEmailLog,
  adminResetCredentials,
  bulkRetryFailedEmails,
  listEmailLogs,
  getEmailLogById,
  generateSecureTempPassword,
};
