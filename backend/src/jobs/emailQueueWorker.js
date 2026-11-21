/**
 * src/jobs/emailQueueWorker.js
 *
 * Durable Database-Backed Email Queue Worker for Maatram Student Availability Planner.
 *
 * Core Capabilities:
 * 1. Persistent Queue: Pulls jobs from MySQL `email_delivery_logs` in QUEUED status.
 * 2. Concurrency Safety: Atomically claims jobs using status=PROCESSING, lockedAt, and lockedBy.
 * 3. Crash Recovery: Detects and resets abandoned jobs stuck in PROCESSING (> 5 minutes).
 * 4. Exponential Backoff: Transient failures are rescheduled with exponential delay (30s * 2^attemptCount).
 * 5. Max Retries: Stops retrying after maxAttempts (default: 5) and marks status=FAILED.
 * 6. Idempotency: Prevents duplicate dispatches via unique idempotencyKey.
 * 7. Security: Passwords and raw credentials are NEVER logged.
 */
const os = require('os');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const WORKER_ID = `worker-${os.hostname()}-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

let pollTimer = null;
let isProcessing = false;

/**
 * Recovers stuck jobs that were left in PROCESSING state when a server crashed or restarted.
 */
const recoverStuckJobs = async () => {
  try {
    const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS);
    const recovered = await prisma.emailDeliveryLog.updateMany({
      where: {
        status: 'PROCESSING',
        lockedAt: { lt: cutoff },
      },
      data: {
        status: 'QUEUED',
        lockedAt: null,
        lockedBy: null,
        errorDetails: 'Recovered from interrupted worker process',
      },
    });

    if (recovered.count > 0) {
      logger.warn(`♻️ Recovered ${recovered.count} stuck email job(s) from crashed/interrupted worker(s)`);
    }
    return recovered.count;
  } catch (err) {
    logger.error('Failed to recover stuck email jobs:', err.message);
    return 0;
  }
};

/**
 * Dispatches an individual email job based on stored metadata.
 * Note: Never logs passwords or sensitive credential tokens.
 */
const dispatchJob = async (job) => {
  const metadata = job.metadata || {};
  const { recipientEmail, recipientName, recipientRole, subject } = job;

  let sendResult;

  if (job.notificationType === 'ACCOUNT_ACTIVATION') {
    const portalUrl = metadata.portalUrl;
    const tempPassword = metadata.temporaryPassword; // only present if explicitly passed for fresh queue
    const activationLink = metadata.activationLink;

    if (recipientRole === 'OFFICER') {
      if (tempPassword) {
        sendResult = await emailService.sendOfficerWelcomeEmail({
          to: recipientEmail,
          officerName: recipientName,
          name: recipientName,
          designation: metadata.designation,
          zoneName: metadata.zoneName,
          temporaryPassword: tempPassword,
          officerPortalUrl: portalUrl,
        });
      } else {
        // Safe instruction email without password overwrite
        sendResult = await emailService.sendEmail({
          to: recipientEmail,
          subject: subject || 'Welcome to Maatram Foundation – Your Officer Portal Account Is Ready',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e3a8a;">Maatram Foundation</h2>
              <p>Dear <strong>${recipientName || 'Officer'}</strong>,</p>
              <p>Your Officer Portal account is configured and ready for access.</p>
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p><strong>Registered Email:</strong> ${recipientEmail}</p>
                ${metadata.zoneName ? `<p><strong>Assigned Zone:</strong> ${metadata.zoneName}</p>` : ''}
                ${metadata.designation ? `<p><strong>Designation:</strong> ${metadata.designation}</p>` : ''}
                <p><strong>Portal Login:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
              </div>
              ${activationLink ? `<p><a href="${activationLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Set Password / Activate</a></p>` : '<p>Please log in using your registered credentials or password reset link.</p>'}
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 12px; color: #64748b;">Maatram Foundation Officer Administration.</p>
            </div>
          `,
        });
      }
    } else {
      // Student
      if (tempPassword) {
        sendResult = await emailService.sendStudentWelcomeEmail({
          to: recipientEmail,
          studentName: recipientName,
          name: recipientName,
          temporaryPassword: tempPassword,
          institutionName: metadata.institutionName,
          zoneName: metadata.zoneName,
          studentPortalUrl: portalUrl,
        });
      } else {
        // Safe instruction email without password overwrite
        sendResult = await emailService.sendEmail({
          to: recipientEmail,
          subject: subject || 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e3a8a;">Maatram Foundation</h2>
              <p>Dear <strong>${recipientName || 'Student'}</strong>,</p>
              <p>Your Student Availability Planner account is active and ready for access.</p>
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p><strong>Registered Email:</strong> ${recipientEmail}</p>
                ${metadata.institutionName ? `<p><strong>Institution:</strong> ${metadata.institutionName}</p>` : ''}
                ${metadata.zoneName ? `<p><strong>Assigned Zone:</strong> ${metadata.zoneName}</p>` : ''}
                <p><strong>Portal Login:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
              </div>
              ${activationLink ? `<p><a href="${activationLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Set Password / Activate</a></p>` : '<p>Please log in using your registered credentials or password reset option.</p>'}
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 12px; color: #64748b;">Maatram Student Availability Planner.</p>
            </div>
          `,
        });
      }
    }
  } else {
    // Other notifications or generic dispatch
    sendResult = await emailService.sendEmail({
      to: recipientEmail,
      subject: subject || 'Notification from Maatram Foundation',
      html: metadata.html || `<p>${subject}</p>`,
    });
  }

  return sendResult;
};

/**
 * Polls and processes pending email queue jobs.
 */
const processPendingJobs = async (batchSize = 10) => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();

    // 1. Find jobs ready to process (QUEUED and nextRetryAt <= NOW or null)
    const candidates = await prisma.emailDeliveryLog.findMany({
      where: {
        status: 'QUEUED',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    for (const candidate of candidates) {
      // 2. Concurrency lock: Claim atomically
      const claimResult = await prisma.emailDeliveryLog.updateMany({
        where: {
          id: candidate.id,
          status: 'QUEUED',
        },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
          lockedBy: WORKER_ID,
        },
      });

      if (claimResult.count === 0) {
        // Claimed by another worker
        continue;
      }

      // Re-fetch claimed record
      const job = await prisma.emailDeliveryLog.findUnique({
        where: { id: candidate.id },
      });

      if (!job) continue;

      try {
        const sendResult = await dispatchJob(job);

        if (sendResult?.status === 'DELIVERED') {
          try {
            await prisma.emailDeliveryLog.update({
              where: { id: job.id },
              data: {
                status: 'SENT',
                attemptCount: { increment: 1 },
                providerResponse: `SMTP_ACCEPTED: ${sendResult.providerRef || 'OK'}`,
                errorDetails: null,
                sentAt: new Date(),
                lockedAt: null,
                lockedBy: null,
              },
            });
            logger.info(`✅ [EmailQueue] Dispatched to ${job.recipientEmail} (Log: ${job.id})`);
          } catch (e) {
            logger.warn(`Email log ${job.id} already removed or not found: ${e.message}`);
          }
        } else if (sendResult?.status === 'SKIPPED') {
          // Mock mode
          try {
            await prisma.emailDeliveryLog.update({
              where: { id: job.id },
              data: {
                status: 'SENT',
                attemptCount: { increment: 1 },
                providerResponse: 'MOCK_DELIVERED (SMTP not configured)',
                errorDetails: null,
                sentAt: new Date(),
                lockedAt: null,
                lockedBy: null,
              },
            });
            logger.info(`ℹ️ [EmailQueue Mock] Simulated send to ${job.recipientEmail}`);
          } catch (e) {
            logger.warn(`Email log ${job.id} already removed or not found: ${e.message}`);
          }
        } else {
          throw new Error(sendResult?.errorReason || 'SMTP delivery rejected by host');
        }
      } catch (sendErr) {
        const nextAttempt = job.attemptCount + 1;
        const maxAttempts = job.maxAttempts || 5;

        if (nextAttempt < maxAttempts) {
          // Exponential backoff: 30s * 2^attempt (30s, 60s, 120s, 240s, 480s)
          const backoffSec = Math.min(3600, Math.pow(2, nextAttempt) * 30);
          const nextRetryAt = new Date(Date.now() + backoffSec * 1000);

          try {
            await prisma.emailDeliveryLog.update({
              where: { id: job.id },
              data: {
                status: 'QUEUED',
                attemptCount: nextAttempt,
                nextRetryAt,
                errorDetails: `Attempt ${nextAttempt} failed: ${sendErr.message}`,
                lockedAt: null,
                lockedBy: null,
              },
            });
            logger.warn(
              `⚠️ [EmailQueue] Delivery failure for ${job.recipientEmail} (Attempt ${nextAttempt}/${maxAttempts}). Next retry in ${backoffSec}s.`,
            );
          } catch {
            // ignore if deleted
          }
        } else {
          // Reached maximum retries
          await prisma.emailDeliveryLog.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              attemptCount: nextAttempt,
              errorDetails: `Terminal failure after ${maxAttempts} attempts: ${sendErr.message}`,
              lockedAt: null,
              lockedBy: null,
            },
          });
          logger.error(
            `❌ [EmailQueue] Maximum retry attempts reached for ${job.recipientEmail}. Job marked as FAILED.`,
          );
        }
      }
    }
  } catch (err) {
    logger.error('Error during email queue poll cycle:', err.message);
  } finally {
    isProcessing = false;
  }
};

/**
 * Starts the background polling worker.
 */
const startWorker = (intervalMs = 4000) => {
  if (pollTimer) return;

  // Immediate crash recovery
  recoverStuckJobs().then(() => {
    processPendingJobs();
  });

  pollTimer = setInterval(async () => {
    await recoverStuckJobs();
    await processPendingJobs();
  }, intervalMs);

  logger.info(`🚀 Durable Email Queue Worker started (ID: ${WORKER_ID}, Interval: ${intervalMs}ms)`);
};

/**
 * Stops the background worker.
 */
const stopWorker = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('🛑 Durable Email Queue Worker stopped');
  }
};

module.exports = {
  startWorker,
  stopWorker,
  processPendingJobs,
  recoverStuckJobs,
  WORKER_ID,
};

