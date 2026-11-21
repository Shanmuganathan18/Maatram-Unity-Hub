/**
 * src/services/emailService.js
 *
 * Transactional email service using Nodemailer.
 * Configured for Gmail SMTP with Port 587 and STARTTLS.
 * Safe fallback: If SMTP is not configured or fails verification,
 * logs the email safely in mock mode without crashing the server.
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;
let isVerified = false;

/**
 * Initializes the Nodemailer transporter.
 */
const initTransporter = () => {
  if (!env.email.enabled) {
    transporter = null;
    isVerified = false;
    return null;
  }

  const isGmail = (env.email.host || '').toLowerCase().includes('gmail');
  const isPort587 = env.email.port === 587;

  const transportConfig = {
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure, // false for port 587 (STARTTLS)
    requireTLS: isPort587 || isGmail, // Enforce STARTTLS on port 587
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  };

  transporter = nodemailer.createTransport(transportConfig);
  return transporter;
};

// Initialize on module load if configured
initTransporter();

/**
 * Verifies SMTP connection at server startup or on-demand.
 * Does not expose passwords in logs or responses.
 */
const verifyConnection = async () => {
  if (!env.email.enabled) {
    isVerified = false;
    logger.warn('Email service running in mock/log-only mode (no SMTP configured)');
    return {
      connected: false,
      mockMode: true,
      message: 'SMTP credentials not configured (mock mode active)',
    };
  }

  if (!transporter) {
    initTransporter();
  }

  try {
    await transporter.verify();
    isVerified = true;
    logger.info(`✅ Email service connected to SMTP (${env.email.host}:${env.email.port} with STARTTLS)`);
    return {
      connected: true,
      mockMode: false,
      host: env.email.host,
      port: env.email.port,
      from: env.email.from,
      message: `SMTP connected successfully to ${env.email.host}:${env.email.port}`,
    };
  } catch (err) {
    isVerified = false;
    logger.error('❌ Email transporter verification failed:', err.message);
    logger.warn('⚠️  Falling back to mock/log-only mode for email delivery');
    return {
      connected: false,
      mockMode: true,
      error: err.message,
      message: `SMTP verification failed: ${err.message}`,
    };
  }
};

/**
 * Returns safe diagnostic status without printing passwords.
 */
const getStatus = () => ({
  enabled: env.email.enabled,
  host: env.email.host || null,
  port: env.email.port || 587,
  secure: env.email.secure,
  from: env.email.from,
  userConfigured: Boolean(env.email.user),
  passConfigured: Boolean(env.email.pass),
  verified: isVerified,
  mockMode: !env.email.enabled || !isVerified,
});

/**
 * Send an email with HTML and text fallback.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.email.enabled || !transporter) {
    logger.info(`[MOCK EMAIL] To: ${to} | Subject: "${subject}"`);
    return {
      status: 'SKIPPED',
      reason: 'SMTP not configured (mock mode)',
      providerRef: null,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html,
    });
    logger.info(`Email delivered to ${to}: ${info.messageId}`);
    return {
      status: 'DELIVERED',
      providerRef: info.messageId,
      errorReason: null,
    };
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error.message);
    return {
      status: 'FAILED',
      providerRef: null,
      errorReason: error.message,
    };
  }
};

/**
 * Send a diagnostic test email (restricted to Admin).
 */
const sendTestEmail = async (targetEmail, actorName = 'Administrator') => {
  const recipient = (targetEmail || env.email.user || '').trim();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('A valid recipient email address is required');
  }

  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subject = `[TEST] Maatram Availability Planner Email Delivery Test`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">Maatram Foundation</h2>
      <p style="font-size: 16px;">Hello <strong>${actorName}</strong>,</p>
      <p>This is a live test email sent from the <strong>Maatram Student Availability Planner</strong> shared backend.</p>
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
        <p style="margin: 6px 0;"><strong>Status:</strong> <span style="color: #15803d; font-weight: bold;">LIVE SMTP DELIVERY ACTIVE</span></p>
        <p style="margin: 6px 0;"><strong>SMTP Host:</strong> ${env.email.host}:${env.email.port}</p>
        <p style="margin: 6px 0;"><strong>Protocol:</strong> STARTTLS (TLSv1.2+)</p>
        <p style="margin: 6px 0;"><strong>Sender:</strong> ${env.email.from}</p>
        <p style="margin: 6px 0;"><strong>Timestamp:</strong> ${timestamp} IST</p>
      </div>
      <p style="font-size: 14px; color: #334155;">If you received this email, Nodemailer SMTP delivery is properly configured and operational.</p>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">Automated diagnostic delivery — Maatram Foundation Platform.</p>
    </div>
  `;

  return sendEmail({ to: recipient, subject, html });
};

/**
 * Email template for event invitations
 */
const sendEventInvitationEmail = async (studentEmail, studentName, event) => {
  const subject = `Event Invitation: ${event.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Maatram Foundation</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>You have been invited to participate in an upcoming event:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #0f172a;">${event.title}</h3>
        <p><strong>Category:</strong> ${event.category.replace('_', ' ')}</p>
        <p><strong>Date:</strong> ${event.date}</p>
        ${event.startTime ? `<p><strong>Time:</strong> ${event.startTime} - ${event.endTime || ''}</p>` : ''}
        ${event.venue ? `<p><strong>Venue:</strong> ${event.venue}</p>` : ''}
        ${event.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${event.meetingLink}">${event.meetingLink}</a></p>` : ''}
        ${event.responseDeadline ? `<p style="color: #dc2626;"><strong>Response Deadline:</strong> ${new Date(event.responseDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>` : ''}
      </div>
      <p>Please log in to your Student Portal to respond (Accept or Decline):</p>
      <a href="${env.cors.allowedOrigins[0]}/events/${event.id}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View & Respond</a>
      <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">This is an automated notification from Maatram Student Availability Planner.</p>
    </div>
  `;
  return sendEmail({ to: studentEmail, subject, html });
};

/**
 * Email template for availability reminder
 */
const sendAvailabilityReminderEmail = async (studentEmail, studentName, weekStart, deadline) => {
  const subject = `Reminder: Submit Weekly Availability for week of ${weekStart}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Maatram Foundation</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>This is a reminder to submit your availability for the week starting <strong>${weekStart}</strong>.</p>
      <p style="color: #dc2626;"><strong>Submission Deadline:</strong> ${new Date(deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      <p>Marking your availability ensures you can be considered for mentoring, bootcamps, and verification sessions.</p>
      <a href="${env.cors.allowedOrigins[0]}/availability" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Submit Availability</a>
      <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">Maatram Student Availability Planner.</p>
    </div>
  `;
  return sendEmail({ to: studentEmail, subject, html });
};

/**
 * Email template for Student Account Provisioned / Welcome
 */
const sendStudentWelcomeEmail = async ({
  to,
  name,
  studentName,
  temporaryPassword,
  institutionName,
  zoneName,
  portalUrl,
  studentPortalUrl,
}) => {
  const finalName = studentName || name || 'Student';
  const loginUrl = studentPortalUrl || portalUrl || env.cors.allowedOrigins[0] || 'http://localhost:5173/login';
  const instName = institutionName || 'Your Institution';
  const zName = zoneName || 'Assigned Zone';
  const subject = 'Welcome to Maatram Foundation – Your Student Portal Account Is Ready';

  const text = `Dear ${finalName},

Welcome to Maatram Foundation!

Your Student Availability Planner account has been successfully created by the administrator.

You can now access the Student Portal using the credentials below.

Your login details

- Name: ${finalName}
- Registered Email: ${to}
- Temporary Password: ${temporaryPassword}
- Institution: ${instName}
- Assigned Zone: ${zName}
- Portal Login: ${loginUrl}

Important – First Login Instructions

1. Open the Student Portal using the link above.
2. Enter your registered email and temporary password.
3. You will be required to change your temporary password.
4. Set your new password and complete the activation process.
5. After activation, you can access your Student Portal.

Please do not share your login credentials with anyone.

If you did not expect this account, contact the Maatram Foundation administrator.

Regards,
Maatram Foundation Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">Maatram Foundation</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Student Availability Planner Portal</p>
      </div>

      <p style="font-size: 16px; color: #1e293b; margin-bottom: 12px;">Dear <strong>${finalName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 8px;">
        Welcome to <strong>Maatram Foundation</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
        Your Student Availability Planner account has been successfully created by the administrator. You can now access the Student Portal using the credentials below.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 18px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a;">Your Login Details</h4>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; width: 150px;"><strong>Name:</strong></td>
            <td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${finalName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Registered Email:</strong></td>
            <td style="padding: 5px 0; color: #1e293b; font-family: monospace;">${to}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
            <td style="padding: 5px 0;"><span style="font-family: monospace; font-size: 15px; font-weight: bold; background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 4px;">${temporaryPassword}</span></td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Institution:</strong></td>
            <td style="padding: 5px 0; color: #1e293b;">${instName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Assigned Zone:</strong></td>
            <td style="padding: 5px 0; color: #1e293b;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${zName}</span></td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Portal Login:</strong></td>
            <td style="padding: 5px 0;"><a href="${loginUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${loginUrl}</a></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">Important – First Login Instructions</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #78350f;">
          <li>Open the Student Portal using the link above.</li>
          <li>Enter your registered email and temporary password.</li>
          <li>You will be required to change your temporary password.</li>
          <li>Set your new password and complete the activation process.</li>
          <li>After activation, you can access your Student Portal.</li>
        </ol>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);">Sign In to Student Portal</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px; line-height: 1.5;">
        Please do not share your login credentials with anyone.<br/>
        If you did not expect this account, contact the Maatram Foundation administrator.
      </p>

      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 13px; color: #475569; margin: 12px 0 0 0;">
        Regards,<br/>
        <strong>Maatram Foundation Team</strong>
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Email template for Officer Account Provisioned / Welcome
 */
const sendOfficerWelcomeEmail = async ({
  to,
  name,
  officerName,
  designation,
  zoneName,
  temporaryPassword,
  portalUrl,
  officerPortalUrl,
}) => {
  const finalName = officerName || name || 'Officer';
  const loginUrl = officerPortalUrl || portalUrl || env.cors.allowedOrigins[1] || 'http://localhost:5174/login';
  const desig = designation || 'Zonal Officer';
  const zName = zoneName || 'Assigned Zone';
  const subject = 'Welcome to Maatram Foundation – Your Officer Portal Account Is Ready';

  const text = `Dear ${finalName},

Welcome to Maatram Foundation!

Your Officer Portal account has been successfully created by the administrator.

Your login details

- Name: ${finalName}
- Registered Email: ${to}
- Temporary Password: ${temporaryPassword}
- Designation: ${desig}
- Assigned Zone: ${zName}
- Portal Login: ${loginUrl}

Important – First Login Instructions

1. Open the Officer Portal using the link above.
2. Enter your registered email and temporary password.
3. Change your temporary password when prompted.
4. Complete the activation process.
5. After activation, you can access the Officer Portal and your assigned zone's information.

Please keep your credentials confidential.

If you did not expect this account, contact the Maatram Foundation administrator.

Regards,
Maatram Foundation Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: 800;">Maatram Foundation</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Zone Officer Portal</p>
      </div>

      <p style="font-size: 16px; color: #1e293b; margin-bottom: 12px;">Dear <strong>${finalName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 8px;">
        Welcome to <strong>Maatram Foundation</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
        Your Officer Portal account has been successfully created by the administrator.
      </p>

      <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #0f766e; padding: 18px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f766e;">Your Login Details</h4>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; width: 150px;"><strong>Name:</strong></td>
            <td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${finalName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Registered Email:</strong></td>
            <td style="padding: 5px 0; color: #1e293b; font-family: monospace;">${to}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
            <td style="padding: 5px 0;"><span style="font-family: monospace; font-size: 15px; font-weight: bold; background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 4px;">${temporaryPassword}</span></td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Designation:</strong></td>
            <td style="padding: 5px 0; color: #1e293b;">${desig}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Assigned Zone:</strong></td>
            <td style="padding: 5px 0; color: #1e293b;"><span style="background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${zName}</span></td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>Portal Login:</strong></td>
            <td style="padding: 5px 0;"><a href="${loginUrl}" style="color: #0f766e; font-weight: 600; text-decoration: underline;">${loginUrl}</a></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">Important – First Login Instructions</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #78350f;">
          <li>Open the Officer Portal using the link above.</li>
          <li>Enter your registered email and temporary password.</li>
          <li>Change your temporary password when prompted.</li>
          <li>Complete the activation process.</li>
          <li>After activation, you can access the Officer Portal and your assigned zone's information.</li>
        </ol>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">Sign In to Officer Portal</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px; line-height: 1.5;">
        Please keep your credentials confidential.<br/>
        If you did not expect this account, contact the Maatram Foundation administrator.
      </p>

      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 13px; color: #475569; margin: 12px 0 0 0;">
        Regards,<br/>
        <strong>Maatram Foundation Team</strong>
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Email template for Password Reset
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Password Reset Request — Maatram Availability Planner';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; margin-top: 0;">Maatram Foundation</h2>
      <p style="font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        A request has been received to reset the password for your account associated with <strong>${to}</strong>.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Reset My Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">
        This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email — your account remains secure.
      </p>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Maatram Student Availability Planner Automated Security</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

/**
 * Email template for Password Changed Confirmation
 */
const sendPasswordChangedEmail = async ({ to, name }) => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subject = 'Your Password Was Changed — Maatram Availability Planner';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; margin-top: 0;">Maatram Foundation</h2>
      <p style="font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        The password for your account (<strong>${to}</strong>) was successfully updated on <strong>${timestamp} IST</strong>.
      </p>
      <p style="font-size: 13px; color: #dc2626;">
        If you did not perform this change, please contact your Maatram Foundation administrator immediately to secure your account.
      </p>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Maatram Student Availability Planner Automated Security</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

module.exports = {
  sendEmail,
  sendTestEmail,
  verifyConnection,
  getStatus,
  sendEventInvitationEmail,
  sendAvailabilityReminderEmail,
  sendStudentWelcomeEmail,
  sendStudentActivationEmail: sendStudentWelcomeEmail,
  sendOfficerWelcomeEmail,
  sendOfficerActivationEmail: sendOfficerWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
};
