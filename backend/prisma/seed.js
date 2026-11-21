/**
 * prisma/seed.js
 * Comprehensive development database seeder.
 * Uses fictional demo data matching the admin portal's canonical definitions.
 * Safe to re-run: uses upsert throughout.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fictional Supabase UIDs for development/demo accounts.
// In local dev with mock Supabase or when linking real Supabase accounts,
// these UIDs map 1:1 to the Supabase auth.users table.
const DEMO_UIDS = {
  admin1:     '00000000-0000-0000-0000-000000000001',
  admin2:     '00000000-0000-0000-0000-000000000002',
  officerA:   '00000000-0000-0000-0000-000000000004',
  officerB:   '00000000-0000-0000-0000-000000000005',
  student1:   '00000000-0000-0000-0000-000000000006',
  student2:   '00000000-0000-0000-0000-000000000007',
  student3:   '00000000-0000-0000-0000-000000000008',
  student4:   '00000000-0000-0000-0000-000000000009',
};

async function main() {
  console.log('🌱 Starting database seed...');

  // ── 1. ROLES & PERMISSIONS ─────────────────────────────────────────────────
  console.log('  → Seeding permissions and roles...');

  const PERMISSIONS = [
    // Users
    { key: 'users.view', label: 'View users', group: 'User Management' },
    { key: 'users.create', label: 'Create users', group: 'User Management' },
    { key: 'users.edit', label: 'Edit users', group: 'User Management' },
    { key: 'users.toggle', label: 'Activate / deactivate users', group: 'User Management' },
    { key: 'users.assign_roles', label: 'Assign roles', group: 'User Management' },
    // Officers
    { key: 'officers.view', label: 'View officers', group: 'Officer Management' },
    { key: 'officers.create', label: 'Create officers', group: 'Officer Management' },
    { key: 'officers.edit', label: 'Edit officers', group: 'Officer Management' },
    { key: 'officers.toggle', label: 'Activate / deactivate officers', group: 'Officer Management' },
    { key: 'officers.reassign', label: 'Reassign officer zone', group: 'Officer Management' },
    // Zones
    { key: 'zones.view', label: 'View zones', group: 'Zone Management' },
    { key: 'zones.create', label: 'Create zones', group: 'Zone Management' },
    { key: 'zones.edit', label: 'Edit zones', group: 'Zone Management' },
    { key: 'zones.deactivate', label: 'Deactivate / archive zones', group: 'Zone Management' },
    // Institutions
    { key: 'institutions.view', label: 'View institutions', group: 'Institution Management' },
    { key: 'institutions.create', label: 'Create institutions', group: 'Institution Management' },
    { key: 'institutions.edit', label: 'Edit institutions', group: 'Institution Management' },
    { key: 'institutions.deactivate', label: 'Deactivate institutions', group: 'Institution Management' },
    // Students
    { key: 'students.view', label: 'View students', group: 'Student Management' },
    { key: 'students.edit', label: 'Edit approved fields / mapping', group: 'Student Management' },
    { key: 'students.import', label: 'Import students', group: 'Student Management' },
    { key: 'students.toggle', label: 'Activate / deactivate accounts', group: 'Student Management' },
    { key: 'students.export', label: 'Export personal student data', group: 'Student Management' },
    // Availability
    { key: 'availability.view', label: 'View system availability', group: 'Availability' },
    // Events
    { key: 'events.view', label: 'View events', group: 'Event Management' },
    { key: 'events.approve', label: 'Approve events', group: 'Event Management' },
    { key: 'events.reject', label: 'Reject / request changes', group: 'Event Management' },
    { key: 'events.postpone', label: 'Postpone events', group: 'Event Management' },
    { key: 'events.cancel', label: 'Cancel events', group: 'Event Management' },
    // Attendance
    { key: 'attendance.view', label: 'View attendance', group: 'Attendance' },
    { key: 'attendance.override', label: 'Override officer-recorded attendance', group: 'Attendance' },
    // Reports & Data
    { key: 'reports.view', label: 'View reports', group: 'Reports & Data' },
    { key: 'reports.export', label: 'Export reports', group: 'Reports & Data' },
    { key: 'data.view', label: 'View import / export centre', group: 'Reports & Data' },
    // Audit
    { key: 'audit.view', label: 'View audit logs', group: 'Audit Logs' },
    { key: 'audit.export', label: 'Export audit logs', group: 'Audit Logs' },
    // Announcements & Support
    { key: 'announcements.view', label: 'View announcements', group: 'Announcements & Support' },
    { key: 'announcements.manage', label: 'Create / publish announcements', group: 'Announcements & Support' },
    { key: 'announcements.send_all', label: 'Announce to all users / all students', group: 'Announcements & Support' },
    { key: 'support.view', label: 'View support tickets', group: 'Announcements & Support' },
    { key: 'support.manage', label: 'Manage support tickets', group: 'Announcements & Support' },
    // Settings
    { key: 'settings.view', label: 'View settings', group: 'System Settings' },
    { key: 'settings.edit', label: 'Edit settings', group: 'System Settings' },
    // Roles
    { key: 'roles.view', label: 'View roles & permissions', group: 'Roles & Permissions' },
    { key: 'roles.manage', label: 'Manage roles & permissions', group: 'Roles & Permissions' },
  ];

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, group: p.group },
      create: p,
    });
  }

  // Create roles: only ONE type of administrative role in the entire application: 'admin'
  const ROLES = [
    {
      id: 'admin',
      label: 'Admin',
      description: 'Complete system-wide administrative access across all zones and records.',
      editable: false,
    },
  ];

  for (const r of ROLES) {
    await prisma.appRole.upsert({
      where: { id: r.id },
      update: { label: r.label, description: r.description },
      create: r,
    });
  }

  // Assign ALL permissions to the single ADMIN role
  const allKeys = PERMISSIONS.map((p) => p.key);
  for (const key of allKeys) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionKey: { roleId: 'admin', permissionKey: key } },
      update: {},
      create: { roleId: 'admin', permissionKey: key },
    });
  }

  // ── 2. ZONES ───────────────────────────────────────────────────────────────
  console.log('  → Seeding zones...');

  const ZONES = [
    { id: 'zone-a', code: 'ZN-A', name: 'Zone A', region: 'Chennai', description: 'Chennai and surrounding districts.', status: 'ACTIVE' },
    { id: 'zone-b', code: 'ZN-B', name: 'Zone B', region: 'Coimbatore', description: 'Coimbatore, Tiruppur and Pollachi.', status: 'ACTIVE' },
    { id: 'zone-c', code: 'ZN-C', name: 'Zone C', region: 'Madurai', description: 'Madurai and southern districts.', status: 'ACTIVE' },
    { id: 'zone-d', code: 'ZN-D', name: 'Zone D', region: 'Salem', description: 'Salem region – onboarding paused.', status: 'INACTIVE' },
  ];

  for (const z of ZONES) {
    await prisma.zone.upsert({
      where: { code: z.code },
      update: { name: z.name, region: z.region, description: z.description, status: z.status },
      create: z,
    });
  }

  // ── 3. INSTITUTIONS ────────────────────────────────────────────────────────
  console.log('  → Seeding institutions...');

  const INSTITUTIONS = [
    { id: 'inst-a1', code: 'SVIT',  name: 'Sri Vidya Institute of Technology', location: 'Chennai',      zoneId: 'zone-a', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-a2', code: 'MCE',   name: 'Marina College of Engineering',     location: 'Chennai',      zoneId: 'zone-a', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-a3', code: 'AIM',   name: 'Adyar Institute of Management',      location: 'Chennai',      zoneId: 'zone-a', type: 'Management',  status: 'ACTIVE' },
    { id: 'inst-a4', code: 'TPC',   name: 'Thiruvallur Polytechnic College',    location: 'Thiruvallur',  zoneId: 'zone-a', type: 'Polytechnic', status: 'ONBOARDING' },
    { id: 'inst-b1', code: 'NCAS',  name: 'Nilgiri College of Arts & Science',  location: 'Coimbatore',   zoneId: 'zone-b', type: 'Arts & Science', status: 'ACTIVE' },
    { id: 'inst-b2', code: 'NIT-C', name: 'Noyyal Institute of Technology',    location: 'Coimbatore',   zoneId: 'zone-b', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-b3', code: 'KEC',   name: 'Kovai Engineering College',         location: 'Tiruppur',     zoneId: 'zone-b', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-b4', code: 'WGUC',  name: 'Western Ghats University College',   location: 'Pollachi',     zoneId: 'zone-b', type: 'Arts & Science', status: 'ONBOARDING' },
    { id: 'inst-cit', code: 'CIT',  name: 'Coimbatore Institute of Technology (CIT)', location: 'Coimbatore', zoneId: 'zone-b', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-c1', code: 'VCET',  name: 'Vaigai College of Engineering',      location: 'Madurai',      zoneId: 'zone-c', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-c2', code: 'MAC',   name: 'Meenakshi Arts College',             location: 'Madurai',      zoneId: 'zone-c', type: 'Arts & Science', status: 'ACTIVE' },
    { id: 'inst-c3', code: 'KEC-M', name: 'Kanyakumari Engineering College',    location: 'Nagercoil',    zoneId: 'zone-c', type: 'Engineering', status: 'ACTIVE' },
    { id: 'inst-d1', code: 'SIT',   name: 'Salem Institute of Technology',      location: 'Salem',        zoneId: 'zone-d', type: 'Engineering', status: 'INACTIVE' },
  ];

  for (const inst of INSTITUTIONS) {
    await prisma.institution.upsert({
      where: { code_zoneId: { code: inst.code, zoneId: inst.zoneId } },
      update: { name: inst.name, location: inst.location, type: inst.type, status: inst.status },
      create: inst,
    });
  }

  // ── 4. DEPARTMENTS ─────────────────────────────────────────────────────────
  console.log('  → Seeding departments...');

  const DEPTS = [
    { instId: 'inst-a1', depts: ['CSE', 'IT', 'ECE'] },
    { instId: 'inst-a2', depts: ['CSE', 'Mechanical', 'ECE'] },
    { instId: 'inst-a3', depts: ['MBA', 'BBA'] },
    { instId: 'inst-a4', depts: ['Diploma CSE', 'Diploma EEE'] },
    { instId: 'inst-b1', depts: ['B.Sc CS', 'B.Com', 'BCA'] },
    { instId: 'inst-b2', depts: ['CSE', 'IT', 'Civil'] },
    { instId: 'inst-b3', depts: ['CSE', 'ECE', 'Mechanical'] },
    { instId: 'inst-b4', depts: ['MBA', 'BCA'] },
    { instId: 'inst-c1', depts: ['CSE', 'ECE', 'Civil'] },
    { instId: 'inst-c2', depts: ['B.Sc CS', 'BCA', 'B.Com'] },
    { instId: 'inst-c3', depts: ['CSE', 'IT'] },
    { instId: 'inst-d1', depts: ['CSE', 'ECE'] },
  ];

  for (const { instId, depts } of DEPTS) {
    for (const name of depts) {
      await prisma.department.upsert({
        where: { institutionId_name: { institutionId: instId, name } },
        update: {},
        create: { institutionId: instId, name, level: name.includes('MBA') ? 'PG' : name.includes('Diploma') ? 'Diploma' : 'UG' },
      });
    }
  }

  // ── 5. ADMIN ACCOUNTS ──────────────────────────────────────────────────────
  console.log('  → Seeding admin accounts...');

  const ADMINS = [
    {
      uid: '2fa5f433-fee7-4b64-bcc0-bc7b529a06b6',
      adminId: 'ADM-001',
      name: 'Hemesh Kumar',
      email: 'hemeshkumar576@gmail.com',
      phone: '9000033331',
      role: 'ADMIN',
      roleId: 'admin',
    },
  ];

  for (const a of ADMINS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { status: 'ACTIVE', role: a.role },
      create: {
        supabaseUid: a.uid,
        email: a.email,
        role: a.role,
        status: 'ACTIVE',
      },
    });

    await prisma.adminProfile.upsert({
      where: { userId: user.id },
      update: { name: a.name, phone: a.phone, roleId: a.roleId },
      create: {
        userId: user.id,
        adminId: a.adminId,
        name: a.name,
        phone: a.phone,
        roleId: a.roleId,
        status: 'ACTIVE',
      },
    });
  }

  // ── 6. OFFICER ACCOUNTS ────────────────────────────────────────────────────
  console.log('  → Seeding officer accounts...');

  const OFFICERS = [
    {
      uid: DEMO_UIDS.officerA,
      officerId: 'OFF-A-001',
      name: 'Arun Kumar',
      email: 'officer.a@maatram-demo.example',
      phone: '9000011111',
      designation: 'Zone In-charge',
      zoneId: 'zone-a',
    },
    {
      uid: DEMO_UIDS.officerB,
      officerId: 'OFF-B-001',
      name: 'Priya Ramesh',
      email: 'officer.b@maatram-demo.example',
      phone: '9000022222',
      designation: 'Zone Officer',
      zoneId: 'zone-b',
    },
  ];

  for (const o of OFFICERS) {
    const user = await prisma.user.upsert({
      where: { email: o.email },
      update: { status: 'ACTIVE', role: 'OFFICER' },
      create: {
        supabaseUid: o.uid,
        email: o.email,
        role: 'OFFICER',
        status: 'ACTIVE',
      },
    });

    await prisma.officerProfile.upsert({
      where: { userId: user.id },
      update: { name: o.name, phone: o.phone, designation: o.designation, zoneId: o.zoneId },
      create: {
        userId: user.id,
        officerId: o.officerId,
        name: o.name,
        phone: o.phone,
        designation: o.designation,
        zoneId: o.zoneId,
        status: 'ACTIVE',
      },
    });
  }

  // ── 7. STUDENT ACCOUNTS ────────────────────────────────────────────────────
  console.log('  → Seeding student accounts...');

  const STUDENTS = [
    {
      uid: DEMO_UIDS.student1,
      studentId: 'MF-A-0001',
      name: 'Ananya S.',
      email: 'ananya.demo@example.org',
      phone: '9000000001',
      institutionId: 'inst-a1',
      year: 3,
      zoneId: 'zone-a',
      groups: ['Batch-1', 'Mock Interview Pool'],
    },
    {
      uid: DEMO_UIDS.student2,
      studentId: 'MF-A-0002',
      name: 'Karthik R.',
      email: 'karthik.demo@example.org',
      phone: '9000000002',
      institutionId: 'inst-a2',
      year: 2,
      zoneId: 'zone-a',
      groups: ['Batch-1'],
    },
    {
      uid: DEMO_UIDS.student3,
      studentId: 'MF-B-0001',
      name: 'Meera V.',
      email: 'meera.demo@example.org',
      phone: '9000000003',
      institutionId: 'inst-b1',
      year: 4,
      zoneId: 'zone-b',
      groups: ['Leadership Cohort'],
    },
    {
      uid: DEMO_UIDS.student4,
      studentId: 'MF-B-0002',
      name: 'Divya P.',
      email: 'divya.demo@example.org',
      phone: '9000000004',
      institutionId: 'inst-b2',
      year: 1,
      zoneId: 'zone-b',
      groups: ['Batch-2'],
    },
  ];

  for (const s of STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { status: 'ACTIVE', role: 'STUDENT' },
      create: {
        supabaseUid: s.uid,
        email: s.email,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        name: s.name,
        phone: s.phone,
        institutionId: s.institutionId,
        year: s.year,
        zoneId: s.zoneId,
        groups: s.groups,
      },
      create: {
        userId: user.id,
        studentId: s.studentId,
        name: s.name,
        phone: s.phone,
        institutionId: s.institutionId,
        year: s.year,
        zoneId: s.zoneId,
        groups: s.groups,
        status: 'ACTIVE',
      },
    });
  }

  // ── 8. SYSTEM SETTINGS ─────────────────────────────────────────────────────
  console.log('  → Seeding system settings...');

  const SETTINGS = [
    { key: 'general.appName', value: 'Maatram Student Availability Planner' },
    { key: 'general.timezone', value: 'Asia/Kolkata' },
    { key: 'general.supportEmail', value: 'support@maatram-demo.example' },
    { key: 'academic.academicYear', value: '2026-27' },
    { key: 'academic.period', value: 'Semester 1' },
    { key: 'availability.deadlineDay', value: '5' },       // Friday
    { key: 'availability.deadlineHour', value: '18' },     // 6:00 PM
    { key: 'availability.deadlineMinute', value: '0' },
    { key: 'availability.systemAssumedUnavailable', value: 'true' },
    { key: 'events.approvalEnabled', value: 'false' },
    { key: 'events.defaultResponseDeadlineDays', value: '2' },
  ];

  for (const s of SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log('\n✅ Database seed completed successfully!');
  console.log('\nConfigured credentials:');
  console.log('  Admin       : hemeshkumar576@gmail.com');
  console.log('  Officer A   : officer.a@maatram-demo.example  (Zone A)');
  console.log('  Officer B   : officer.b@maatram-demo.example  (Zone B)');
  console.log('  Student 1   : ananya.demo@example.org        (Zone A, 3rd year)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

