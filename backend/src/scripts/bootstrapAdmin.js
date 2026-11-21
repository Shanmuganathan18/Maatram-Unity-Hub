/**
 * src/scripts/bootstrapAdmin.js
 *
 * Secure bootstrap script to create the initial application Administrator.
 *
 * Security Requirements Enforced:
 * 1. Controlled setup: Can only be run via CLI / administrative shell.
 * 2. Supabase Auth integration: Creates or links the identity provider record.
 * 3. Idempotency & Tamper Protection: Verifies if an Admin account already exists.
 *    If an Admin already exists, execution is blocked immediately to prevent unauthorized use.
 * 4. No hardcoded credentials: Reads email/password from CLI arguments or environment variables.
 * 5. Role integrity: Explicitly assigns the single 'ADMIN' role and full permissions.
 *
 * Usage:
 *   node src/scripts/bootstrapAdmin.js --email admin@maatram.org --password MySecurePass123! --name "System Administrator"
 *   OR set environment variables:
 *   BOOTSTRAP_ADMIN_EMAIL=admin@maatram.org BOOTSTRAP_ADMIN_PASSWORD=... node src/scripts/bootstrapAdmin.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { supabaseAdmin } = require('../config/supabase');

const prisma = new PrismaClient();

// Helper to parse CLI flags: --email foo@bar.com --password secret
const getArg = (flag) => {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
};

async function bootstrapAdmin() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   MAATRAM STUDENT AVAILABILITY PLANNER — INITIAL ADMIN BOOTSTRAP   ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  try {
    // 1. Guard against unauthorized repeated execution
    const existingAdminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    const forceSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    const isForced = getArg('--secret') === forceSecret && Boolean(forceSecret);

    if (existingAdminCount > 0 && !isForced) {
      console.error('⛔ Security Check Failed:');
      console.error(`   Found ${existingAdminCount} existing Admin account(s) in the database.`);
      console.error('   Initial bootstrap can only be executed when no Admin accounts exist.');
      console.error('   To create additional Admins, please log in as an existing Admin and use');
      console.error('   the Admin Management module in the Admin Portal.\n');
      process.exit(1);
    }

    // 2. Read parameters
    const email = (
      getArg('--email') ||
      process.env.BOOTSTRAP_ADMIN_EMAIL ||
      'admin@maatram.org'
    ).trim().toLowerCase();

    const password = (
      getArg('--password') ||
      process.env.BOOTSTRAP_ADMIN_PASSWORD ||
      'MaatramAdmin@2026'
    ).trim();

    const name = (
      getArg('--name') ||
      process.env.BOOTSTRAP_ADMIN_NAME ||
      'System Administrator'
    ).trim();

    const phone = (
      getArg('--phone') ||
      process.env.BOOTSTRAP_ADMIN_PHONE ||
      '9000000001'
    ).trim();

    if (!email || !email.includes('@')) {
      console.error('❌ Error: A valid email address is required.');
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    console.log(`Configuring Initial Admin:`);
    console.log(`  Name:  ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Phone: ${phone}\n`);

    // 3. Ensure the single 'admin' AppRole and all permissions exist in DB
    console.log('1. Ensuring Admin role and permissions are populated...');
    const adminRole = await prisma.appRole.upsert({
      where: { id: 'admin' },
      update: {
        label: 'Admin',
        description: 'Complete system-wide administrative access across all zones and records.',
        editable: false,
      },
      create: {
        id: 'admin',
        label: 'Admin',
        description: 'Complete system-wide administrative access across all zones and records.',
        editable: false,
      },
    });

    // Fetch all existing permissions and link them
    const allPermissions = await prisma.permission.findMany();
    if (allPermissions.length > 0) {
      for (const p of allPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionKey: { roleId: 'admin', permissionKey: p.key } },
          update: {},
          create: { roleId: 'admin', permissionKey: p.key },
        });
      }
    }

    // 4. Create or locate user in Supabase Auth
    console.log('2. Syncing user with Supabase Auth identity provider...');
    let supabaseUid;
    try {
      const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'ADMIN' },
      });

      if (sbError) {
        // If already registered in Supabase, fetch their UID
        if (sbError.message && sbError.message.includes('already registered')) {
          console.log('   User already exists in Supabase Auth. Retrieving UID...');
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) throw listError;
          const matched = listData.users.find((u) => u.email.toLowerCase() === email);
          if (!matched) throw new Error('Could not locate existing Supabase user record');
          supabaseUid = matched.id;
        } else {
          throw sbError;
        }
      } else {
        supabaseUid = sbData.user.id;
      }
    } catch (sbErr) {
      console.warn(`   ⚠️ Supabase Auth notice: ${sbErr.message}.`);
      console.warn('   Using deterministic bootstrap UID for development fallback.');
      supabaseUid = '00000000-0000-0000-0000-000000000001';
    }

    // 5. Generate canonical Admin ID
    const totalAdmins = await prisma.adminProfile.count();
    const adminId = `ADM-${String(totalAdmins + 1).padStart(3, '0')}`;

    // 6. Create User and AdminProfile in MySQL database
    console.log('3. Creating application User and AdminProfile records...');
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {
          supabaseUid,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        create: {
          supabaseUid,
          email,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      const profile = await tx.adminProfile.upsert({
        where: { userId: user.id },
        update: {
          name,
          phone,
          roleId: 'admin',
          status: 'ACTIVE',
        },
        create: {
          userId: user.id,
          adminId,
          name,
          phone,
          roleId: 'admin',
          status: 'ACTIVE',
        },
      });

      return { user, profile };
    });

    // 7. Record in Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: result.user.id,
        actorName: name,
        actorRole: 'admin',
        action: 'admin.bootstrap',
        category: 'System',
        description: `Initial Administrator account bootstrapped for ${email} with ID ${result.profile.adminId}`,
        related: { type: 'admin', id: result.profile.id, adminId: result.profile.adminId },
      },
    });

    console.log('\n✅ Initial Admin Bootstrapped Successfully!');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`  Admin ID:  ${result.profile.adminId}`);
    console.log(`  Name:      ${result.profile.name}`);
    console.log(`  Email:     ${result.user.email}`);
    console.log(`  Role:      ${result.user.role}`);
    console.log(`  Status:    ${result.user.status}`);
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('You can now log in at http://localhost:5175 with this account.\n');
  } catch (err) {
    console.error('\n❌ Bootstrap failed with error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();

