/**
 * src/modules/admin/adminProvisioning.service.js
 *
 * Comprehensive engine for Admin-controlled account provisioning:
 * - Single Student & Officer creation
 * - Bulk CSV/Excel parsing and validation
 * - Automatic College-to-Zone derivation
 * - Duplicate detection (in-file & database)
 * - Atomic account creation in Supabase Auth & MySQL
 * - Temporary password management & forced first-login flag
 * - Welcome email delivery
 */
const { parse: parseCsvSync } = require('csv-parse/sync');
const XLSX = require('xlsx');
const prisma = require('../../config/database');
const { supabaseAdmin } = require('../../config/supabase');
const emailService = require('../../services/emailService');
const emailDeliveryService = require('../../services/emailDelivery.service');
const env = require('../../config/env');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AppError,
} = require('../../utils/errors');
const logger = require('../../utils/logger');

// ── COLUMN ALIASES ─────────────────────────────────────────────────────────────
const STUDENT_COLUMN_ALIASES = {
  name: ['student name', 'name', 'full name', 'student_name', 'fullname'],
  email: ['email', 'email address', 'email_address', 'mail'],
  registerNumber: ['register number', 'reg no', 'roll number', 'register no', 'reg_no', 'roll_no', 'regno', 'registerno'],
  phone: ['phone number', 'phone', 'mobile', 'mobile number', 'contact', 'mobile_no'],
  collegeName: ['college name', 'institution', 'college', 'institute', 'college_name', 'institution_name'],
  department: ['department', 'branch', 'dept', 'course/branch'],
  year: ['year of study', 'year', 'study year', 'current year', 'year_of_study'],
  gender: ['gender', 'sex'],
  course: ['course', 'degree', 'programme', 'program'],
  academicYear: ['academic year', 'batch', 'academic_year'],
};

const OFFICER_COLUMN_ALIASES = {
  name: ['officer name', 'name', 'full name', 'officer_name'],
  email: ['email', 'email address', 'email_address'],
  phone: ['phone number', 'phone', 'mobile', 'mobile number'],
  employeeId: ['employee id', 'emp id', 'employee_id', 'empid'],
  designation: ['designation', 'role', 'title', 'position'],
  zone: ['assigned zone', 'zone', 'zone code', 'assigned_zone', 'zone_name'],
};

/**
 * Normalizes an object's keys based on an alias dictionary.
 */
const mapRowKeys = (rawRow, aliasMap) => {
  const mapped = {};
  const lowerRow = {};
  for (const [key, val] of Object.entries(rawRow)) {
    if (key !== undefined && key !== null) {
      lowerRow[key.trim().toLowerCase()] = val !== undefined && val !== null ? String(val).trim() : '';
    }
  }

  for (const [targetKey, aliases] of Object.entries(aliasMap)) {
    for (const alias of aliases) {
      if (lowerRow[alias] !== undefined && lowerRow[alias] !== '') {
        mapped[targetKey] = lowerRow[alias];
        break;
      }
    }
    if (mapped[targetKey] === undefined) {
      mapped[targetKey] = '';
    }
  }
  return mapped;
};

/**
 * Parses a buffer containing CSV or Excel (.xlsx/.xls) into an array of objects.
 * Handles both files with explicit headers and headerless data files with intelligent column inference.
 */
const parseBufferToRows = (buffer, fileName = '', entityType = 'students') => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  let rawMatrix = [];

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const worksheet = workbook.Sheets[firstSheetName];
    rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
      .filter((row) => Array.isArray(row) && row.some((c) => String(c).trim().length > 0));
  } else {
    // Default to CSV
    let text = buffer.toString('utf-8');
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    rawMatrix = parseCsvSync(text, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  }

  if (!rawMatrix || rawMatrix.length === 0) return [];

  const firstRow = rawMatrix[0].map((c) => String(c || '').trim());
  const hasEmail = firstRow.some((c) => c.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
  const hasDigitYear = firstRow.some((c) => /^[1-6]$/.test(c));
  const hasPhoneNumber = firstRow.some((c) => /^\d{10,12}$/.test(c.replace(/[+\-\s]/g, '')));

  const aliasMap = entityType === 'officers' ? OFFICER_COLUMN_ALIASES : STUDENT_COLUMN_ALIASES;
  const aliasFlat = Object.values(aliasMap).flat();
  const headerMatchCount = firstRow.filter((c) => {
    const clean = cleanString(c);
    return aliasFlat.includes(clean) || aliasFlat.includes(c.toLowerCase());
  }).length;

  const isHeaderRow = !hasEmail && !hasDigitYear && !hasPhoneNumber && (headerMatchCount >= 2 || (headerMatchCount >= 1 && rawMatrix.length > 1));

  if (isHeaderRow) {
    const headers = firstRow.map((h) => h.trim());
    return rawMatrix.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      });
      return obj;
    });
  }

  // Headerless CSV/Excel: Infer column types from values
  const numCols = Math.max(...rawMatrix.map((r) => r.length));
  const colTypes = new Array(numCols).fill(null);

  if (entityType === 'officers') {
    for (let c = 0; c < numCols; c++) {
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => v.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        colTypes[c] = 'Email';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.length > 0 && vals.every((v) => /^\d{10,12}$/.test(v.replace(/[+\-\s]/g, '')))) {
        colTypes[c] = 'Phone Number';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => /^(zn-|zone\s*)/i.test(v))) {
        colTypes[c] = 'Assigned Zone';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => /(officer|lead|director|manager|coordinator|incharge|in-charge)/i.test(v))) {
        colTypes[c] = 'Designation';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (!colTypes[c]) {
        colTypes[c] = 'Officer Name';
        break;
      }
    }
    const fallbackOfficerNames = ['Employee ID', 'Designation', 'Assigned Zone'];
    for (let c = 0; c < numCols; c++) {
      if (!colTypes[c]) {
        colTypes[c] = fallbackOfficerNames.shift() || `Column_${c + 1}`;
      }
    }
  } else {
    // Students
    const DEPT_PATTERNS = /^(auto|automobile|cse|it|ece|eee|mech|mechanical|civil|aids|csbs|b\.?tech|b\.?e|m\.?c\.?a|b\.?sc|m\.?sc|mba|bba|biotech|aero)/i;
    const COLLEGE_PATTERNS = /(college|institute|university|polytechnic|engineering|technology|arts|science|campus|academy|school)/i;

    for (let c = 0; c < numCols; c++) {
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => v.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        colTypes[c] = 'Email';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.length > 0 && vals.every((v) => /^[1-6]$/.test(v) || /^year\s*[1-6]$/i.test(v))) {
        colTypes[c] = 'Year of Study';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => COLLEGE_PATTERNS.test(v))) {
        colTypes[c] = 'College Name';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.some((v) => DEPT_PATTERNS.test(v))) {
        colTypes[c] = 'Department';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (colTypes[c]) continue;
      const vals = rawMatrix.map((r) => String(r[c] || '').trim()).filter(Boolean);
      if (vals.length > 0 && vals.every((v) => /^\d{10,12}$/.test(v.replace(/[+\-\s]/g, '')))) {
        colTypes[c] = 'Phone Number';
      }
    }
    for (let c = 0; c < numCols; c++) {
      if (!colTypes[c]) {
        colTypes[c] = 'Student Name';
        break;
      }
    }
    const fallbackNames = ['Register Number', 'Department', 'Course', 'Academic Year', 'Gender'];
    for (let c = 0; c < numCols; c++) {
      if (!colTypes[c]) {
        colTypes[c] = fallbackNames.shift() || `Column_${c + 1}`;
      }
    }
  }

  return rawMatrix.map((row) => {
    const obj = {};
    colTypes.forEach((colName, idx) => {
      obj[colName] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
    });
    return obj;
  });
};

/**
 * Normalizes string for institution matching.
 */
const cleanString = (str) => {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Matches a college name string against existing MySQL institutions.
 * Returns { institution, zone, confidence } or null.
 */
const matchInstitution = (inputCollege, institutions) => {
  if (!inputCollege) return null;
  const inputClean = cleanString(inputCollege);
  const inputUpper = inputCollege.trim().toUpperCase();

  // 1. Direct Code match (e.g. 'CIT', 'SVIT', 'PSG')
  for (const inst of institutions) {
    if (inst.code && inst.code.toUpperCase() === inputUpper) {
      return { institution: inst, zone: inst.zone, matchType: 'code' };
    }
  }

  // 2. Exact Name match (case-insensitive)
  for (const inst of institutions) {
    if (inst.name.toLowerCase().trim() === inputCollege.toLowerCase().trim()) {
      return { institution: inst, zone: inst.zone, matchType: 'exact_name' };
    }
  }

  // 3. Clean string match
  for (const inst of institutions) {
    const instClean = cleanString(inst.name);
    if (instClean === inputClean) {
      return { institution: inst, zone: inst.zone, matchType: 'clean_name' };
    }
  }

  // 4. Substring / Token matching
  for (const inst of institutions) {
    const instClean = cleanString(inst.name);
    if (instClean.includes(inputClean) || inputClean.includes(instClean)) {
      return { institution: inst, zone: inst.zone, matchType: 'partial_name' };
    }
  }

  return null;
};

/**
 * Matches a zone name or code string against existing MySQL zones.
 */
const matchZone = (inputZone, zones) => {
  if (!inputZone) return null;
  const inputUpper = inputZone.trim().toUpperCase();
  const inputClean = cleanString(inputZone);

  for (const z of zones) {
    if (z.code.toUpperCase() === inputUpper || z.code.replace('ZN-', '').toUpperCase() === inputUpper) {
      return z;
    }
    if (z.name.toUpperCase() === inputUpper || cleanString(z.name) === inputClean) {
      return z;
    }
  }
  return null;
};

// ── BULK STUDENT PREVIEW & VALIDATION ─────────────────────────────────────────

const previewStudentImport = async (fileBuffer, fileName = '') => {
  const rawRows = parseBufferToRows(fileBuffer, fileName, 'students');
  if (!rawRows || rawRows.length === 0) {
    throw new ValidationError('Uploaded file is empty or contains no data rows');
  }

  // Load existing institutions and zones from DB
  const institutions = await prisma.institution.findMany({
    where: { status: 'ACTIVE' },
    include: { zone: { select: { id: true, code: true, name: true } } },
  });

  // Load existing user emails and student register numbers for duplicate check
  const [existingUsers, existingStudents] = await Promise.all([
    prisma.user.findMany({ select: { email: true } }),
    prisma.studentProfile.findMany({
      where: { registerNumber: { not: null } },
      select: { registerNumber: true },
    }),
  ]);

  const dbEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const dbRegNoSet = new Set(existingStudents.map((s) => (s.registerNumber || '').toUpperCase()));

  const fileEmailSet = new Set();
  const fileRegNoSet = new Set();

  const validatedRows = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 1;
    const row = mapRowKeys(rawRows[i], STUDENT_COLUMN_ALIASES);
    const errors = [];
    let isDuplicate = false;

    // 1. Required: Student Name
    if (!row.name || row.name.length < 2) {
      errors.push('Student name is required');
    }

    // 2. Required: Email & format
    const email = (row.email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.push('Email is required');
    } else if (!emailRegex.test(email)) {
      errors.push(`Invalid email format: "${email}"`);
    } else if (fileEmailSet.has(email)) {
      errors.push(`Duplicate email within file: "${email}"`);
      isDuplicate = true;
    } else if (dbEmailSet.has(email)) {
      errors.push(`Account already exists in system with email: "${email}"`);
      isDuplicate = true;
    } else {
      fileEmailSet.add(email);
    }

    // 3. Optional: Register Number
    const regNo = (row.registerNumber || '').trim().toUpperCase();
    if (regNo) {
      if (fileRegNoSet.has(regNo)) {
        errors.push(`Duplicate register number within file: "${regNo}"`);
        isDuplicate = true;
      } else if (dbRegNoSet.has(regNo)) {
        errors.push(`Student with register number already exists: "${regNo}"`);
        isDuplicate = true;
      } else {
        fileRegNoSet.add(regNo);
      }
    }

    // 4. Required: College Name & Auto-Zone Derivation
    let matchedInst = null;
    let derivedZone = null;
    if (!row.collegeName) {
      errors.push('College name / institution is required');
    } else {
      const match = matchInstitution(row.collegeName, institutions);
      if (!match || !match.institution) {
        errors.push(`Unrecognized college: "${row.collegeName}". Please verify name against existing institutions.`);
      } else if (!match.zone) {
        errors.push(`Matched institution "${match.institution.name}" has no assigned zone.`);
      } else {
        matchedInst = {
          id: match.institution.id,
          name: match.institution.name,
          code: match.institution.code,
        };
        derivedZone = {
          id: match.zone.id,
          code: match.zone.code,
          name: match.zone.name,
        };
      }
    }

    // 5. Required: Department
    if (!row.department) {
      errors.push('Department / branch is required');
    }

    // 6. Required: Year of study
    const yearInt = parseInt(row.year, 10);
    if (!row.year || isNaN(yearInt) || yearInt < 1 || yearInt > 6) {
      errors.push(`Invalid year of study: "${row.year}" (must be 1–6)`);
    }

    const isValid = errors.length === 0;
    if (isDuplicate) duplicateCount++;
    if (isValid) validCount++;
    else invalidCount++;

    validatedRows.push({
      row: rowNum,
      status: isValid ? 'VALID' : isDuplicate ? 'DUPLICATE' : 'INVALID',
      name: row.name,
      email,
      registerNumber: regNo,
      phone: row.phone || null,
      collegeInput: row.collegeName,
      matchedInstitution: matchedInst,
      derivedZone,
      department: row.department,
      year: isNaN(yearInt) ? null : yearInt,
      gender: row.gender || null,
      course: row.course || null,
      academicYear: row.academicYear || null,
      errors,
    });
  }

  const validRecords = validatedRows
    .filter((r) => r.status === 'VALID')
    .map((r) => ({
      ...r,
      rowNumber: r.row,
      institutionName: r.matchedInstitution?.name || r.collegeInput,
      zoneName: r.derivedZone?.name || 'Auto-derived',
    }));

  const invalidRecords = validatedRows
    .filter((r) => r.status !== 'VALID')
    .map((r) => ({
      ...r,
      rowNumber: r.row,
      institution: r.collegeInput || '—',
      reason: (r.errors || []).join('; ') || (r.status === 'DUPLICATE' ? 'Duplicate record' : 'Invalid data'),
    }));

  return {
    fileName,
    totalRows: rawRows.length,
    totalRecords: rawRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    duplicatesCount: duplicateCount,
    validRecords,
    invalidRecords,
    rows: validatedRows,
  };
};

// ── BULK STUDENT CONFIRM & IMPORT ─────────────────────────────────────────────

const confirmStudentImport = async ({
  rows,
  temporaryPassword = 'Maatram@2026',
  sendWelcomeEmail = false,
  uploadedById,
  fileName = 'students_import',
}) => {
  if (!rows || rows.length === 0) {
    throw new ValidationError('No valid rows provided for import');
  }

  // Filter down to valid rows
  const validRows = rows.filter((r) => r.status === 'VALID' && r.matchedInstitution?.id && r.derivedZone?.id);
  if (validRows.length === 0) {
    throw new ValidationError('None of the rows passed validation');
  }

  // Create Job Record
  const job = await prisma.dataImportJob.create({
    data: {
      uploadedById,
      fileName,
      entityType: 'students',
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: rows.length - validRows.length,
      commonPasswordUsed: true,
      status: 'VALIDATING',
      summary: {},
    },
  });

  const importedStudents = [];
  const failedRows = [];

  for (const row of validRows) {
    let supabaseUid = null;
    try {
      // 1. Create or retrieve Supabase Auth user
      const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: row.name,
          role: 'STUDENT',
          registerNumber: row.registerNumber,
        },
      });

      if (sbError) {
        if (sbError.message.includes('already registered')) {
          // If already in Supabase, fetch UID
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = listData?.users?.find((u) => u.email.toLowerCase() === row.email.toLowerCase());
          if (existing) {
            supabaseUid = existing.id;
            // Update password to temporary password
            await supabaseAdmin.auth.admin.updateUserById(supabaseUid, { password: temporaryPassword });
          } else {
            throw new AppError(`Supabase error: ${sbError.message}`, 400);
          }
        } else {
          throw new AppError(`Supabase error: ${sbError.message}`, 400);
        }
      } else {
        supabaseUid = sbData.user.id;
      }

      // 2. MySQL creation in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Upsert User
        const user = await tx.user.upsert({
          where: { email: row.email },
          update: {
            supabaseUid,
            role: 'STUDENT',
            status: 'ACTIVE',
            mustChangePassword: true,
          },
          create: {
            supabaseUid,
            email: row.email,
            role: 'STUDENT',
            status: 'ACTIVE',
            mustChangePassword: true,
          },
        });

        // Resolve or create department
        let dept = null;
        if (row.department) {
          dept = await tx.department.upsert({
            where: {
              institutionId_name: {
                institutionId: row.matchedInstitution.id,
                name: row.department.trim(),
              },
            },
            update: {},
            create: {
              institutionId: row.matchedInstitution.id,
              name: row.department.trim(),
            },
          });
        }

        // Generate student ID: MF-<ZoneLetter>-<Seq>
        const zoneLetter = row.derivedZone.code.replace('ZN-', '') || 'X';
        const zoneStudentCount = await tx.studentProfile.count({
          where: { zoneId: row.derivedZone.id },
        });
        const studentId = `MF-${zoneLetter}-${String(zoneStudentCount + 1).padStart(4, '0')}`;

        // Create student profile
        const profile = await tx.studentProfile.create({
          data: {
            userId: user.id,
            studentId,
            registerNumber: row.registerNumber || null,
            name: row.name.trim(),
            phone: row.phone || null,
            gender: row.gender || null,
            course: row.course || null,
            academicYear: row.academicYear || null,
            institutionId: row.matchedInstitution.id,
            departmentId: dept ? dept.id : null,
            year: row.year,
            zoneId: row.derivedZone.id,
            status: 'ACTIVE',
            groups: [],
          },
        });

        return { user, profile };
      });

      importedStudents.push({
        row: row.row,
        studentId: result.profile.studentId,
        name: result.profile.name,
        email: row.email,
        registerNumber: row.registerNumber,
      });

      // Automatic Activation Email Delivery (Queued per successfully created account)
      if (sendWelcomeEmail !== false) {
        emailDeliveryService.queueActivationEmail({
          userId: result.user.id,
          role: 'STUDENT',
          email: row.email,
          studentName: row.name,
          name: row.name,
          temporaryPassword,
          institutionName: row.matchedInstitution.name,
          zoneName: row.derivedZone.name,
          portalUrl: env.cors.allowedOrigins[0] ? `${env.cors.allowedOrigins[0]}/login` : 'http://localhost:5173/login',
          asyncMode: true,
        }).catch((emErr) => {
          logger.warn(`Could not queue activation email for ${row.email}:`, emErr.message);
        });
      }
    } catch (err) {
      logger.error(`Error importing row ${row.row} (${row.email}):`, err.message);
      failedRows.push({
        row: row.row,
        email: row.email,
        registerNumber: row.registerNumber,
        error: err.message,
      });
    }
  }

  // Update DataImportJob with full summary
  const finalStatus = importedStudents.length > 0 ? 'IMPORTED' : 'FAILED';
  const importSummary = {
    totalUploaded: rows.length,
    createdCount: importedStudents.length,
    failedCount: failedRows.length,
    emailsQueued: sendWelcomeEmail !== false ? importedStudents.length : 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsPendingRetry: 0,
    commonPasswordUsed: true,
  };

  await prisma.dataImportJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      validRows: importedStudents.length,
      invalidRows: rows.length - importedStudents.length,
      errors: failedRows,
      summary: importSummary,
      completedAt: new Date(),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: uploadedById,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'students.bulk_import',
      category: 'Student',
      description: `Bulk imported ${importedStudents.length} student accounts from ${fileName}`,
      related: {
        jobId: job.id,
        total: rows.length,
        imported: importedStudents.length,
        failed: failedRows.length,
      },
    },
  });

  return {
    jobId: job.id,
    fileName,
    totalRows: rows.length,
    importedCount: importedStudents.length,
    failedCount: failedRows.length,
    emailsQueued: sendWelcomeEmail !== false ? importedStudents.length : 0,
    students: importedStudents,
    errors: failedRows,
    summary: importSummary,
  };
};

// ── BULK OFFICER PREVIEW & CONFIRM ───────────────────────────────────────────

const previewOfficerImport = async (fileBuffer, fileName = '') => {
  const rawRows = parseBufferToRows(fileBuffer, fileName, 'officers');
  if (!rawRows || rawRows.length === 0) {
    throw new ValidationError('Uploaded file is empty or contains no data rows');
  }

  const zones = await prisma.zone.findMany({ where: { status: 'ACTIVE' } });
  const existingUsers = await prisma.user.findMany({ select: { email: true } });
  const existingOfficers = await prisma.officerProfile.findMany({
    where: { employeeId: { not: null } },
    select: { employeeId: true },
  });

  const dbEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const dbEmpIdSet = new Set(existingOfficers.map((o) => (o.employeeId || '').toUpperCase()));

  const fileEmailSet = new Set();
  const fileEmpIdSet = new Set();

  const validatedRows = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 1;
    const row = mapRowKeys(rawRows[i], OFFICER_COLUMN_ALIASES);
    const errors = [];
    let isDuplicate = false;

    // Name
    if (!row.name || row.name.length < 2) {
      errors.push('Officer name is required');
    }

    // Email
    const email = (row.email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.push('Email is required');
    } else if (!emailRegex.test(email)) {
      errors.push(`Invalid email format: "${email}"`);
    } else if (fileEmailSet.has(email) || dbEmailSet.has(email)) {
      errors.push(`Duplicate email: "${email}"`);
      isDuplicate = true;
    } else {
      fileEmailSet.add(email);
    }

    // Employee ID (optional but checked for duplicate)
    const empId = (row.employeeId || '').trim().toUpperCase();
    if (empId) {
      if (fileEmpIdSet.has(empId) || dbEmpIdSet.has(empId)) {
        errors.push(`Duplicate employee ID: "${empId}"`);
        isDuplicate = true;
      } else {
        fileEmpIdSet.add(empId);
      }
    }

    // Designation
    if (!row.designation) {
      errors.push('Designation is required');
    }

    // Assigned Zone
    let matchedZone = null;
    if (!row.zone) {
      errors.push('Assigned zone is required');
    } else {
      matchedZone = matchZone(row.zone, zones);
      if (!matchedZone) {
        errors.push(`Unrecognized zone: "${row.zone}". Must match an active zone (e.g. ZN-A or Zone A).`);
      }
    }

    const isValid = errors.length === 0;
    if (isDuplicate) duplicateCount++;
    if (isValid) validCount++;
    else invalidCount++;

    validatedRows.push({
      row: rowNum,
      status: isValid ? 'VALID' : isDuplicate ? 'DUPLICATE' : 'INVALID',
      name: row.name,
      email,
      phone: row.phone || null,
      employeeId: empId || null,
      designation: row.designation,
      assignedZone: matchedZone ? { id: matchedZone.id, code: matchedZone.code, name: matchedZone.name } : null,
      errors,
    });
  }

  const validRecords = validatedRows
    .filter((r) => r.status === 'VALID')
    .map((r) => ({
      ...r,
      rowNumber: r.row,
      institutionName: r.matchedInstitution?.name || r.collegeInput,
      zoneName: r.derivedZone?.name || 'Auto-derived',
    }));

  const invalidRecords = validatedRows
    .filter((r) => r.status !== 'VALID')
    .map((r) => ({
      ...r,
      rowNumber: r.row,
      institution: r.collegeInput || '—',
      reason: (r.errors || []).join('; ') || (r.status === 'DUPLICATE' ? 'Duplicate record' : 'Invalid data'),
    }));

  return {
    fileName,
    totalRows: rawRows.length,
    totalRecords: rawRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    duplicatesCount: duplicateCount,
    validRecords,
    invalidRecords,
    rows: validatedRows,
  };
};

const confirmOfficerImport = async ({
  rows,
  temporaryPassword = 'Maatram@2026',
  sendWelcomeEmail = false,
  uploadedById,
  fileName = 'officers_import',
}) => {
  if (!rows || rows.length === 0) {
    throw new ValidationError('No rows provided for officer import');
  }

  const validRows = rows.filter((r) => r.status === 'VALID' && r.assignedZone?.id);
  if (validRows.length === 0) {
    throw new ValidationError('None of the rows passed validation');
  }

  const importedOfficers = [];
  const failedRows = [];

  for (const row of validRows) {
    let supabaseUid = null;
    try {
      const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: row.name,
          role: 'OFFICER',
          designation: row.designation,
        },
      });

      if (sbError) {
        if (sbError.message.includes('already registered')) {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = listData?.users?.find((u) => u.email.toLowerCase() === row.email.toLowerCase());
          if (existing) {
            supabaseUid = existing.id;
            await supabaseAdmin.auth.admin.updateUserById(supabaseUid, { password: temporaryPassword });
          } else {
            throw new AppError(`Supabase error: ${sbError.message}`, 400);
          }
        } else {
          throw new AppError(`Supabase error: ${sbError.message}`, 400);
        }
      } else {
        supabaseUid = sbData.user.id;
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { email: row.email },
          update: {
            supabaseUid,
            role: 'OFFICER',
            status: 'ACTIVE',
            mustChangePassword: true,
          },
          create: {
            supabaseUid,
            email: row.email,
            role: 'OFFICER',
            status: 'ACTIVE',
            mustChangePassword: true,
          },
        });

        const zoneLetter = row.assignedZone.code.replace('ZN-', '') || 'X';
        const totalOfficers = await tx.officerProfile.count();
        const officerId = `OFF-${zoneLetter}-${String(totalOfficers + 1).padStart(3, '0')}`;

        const profile = await tx.officerProfile.create({
          data: {
            userId: user.id,
            officerId,
            employeeId: row.employeeId || null,
            name: row.name.trim(),
            phone: row.phone || null,
            designation: row.designation.trim(),
            zoneId: row.assignedZone.id,
            status: 'ACTIVE',
          },
        });

        return { user, profile };
      });

      importedOfficers.push({
        row: row.row,
        officerId: result.profile.officerId,
        name: result.profile.name,
        email: row.email,
      });

      // Automatic Activation Email Delivery (Queued per successfully created officer)
      if (sendWelcomeEmail !== false) {
        emailDeliveryService.queueActivationEmail({
          userId: result.user.id,
          role: 'OFFICER',
          email: row.email,
          officerName: row.name,
          name: row.name,
          designation: row.designation,
          zoneName: row.assignedZone.name,
          temporaryPassword,
          portalUrl: env.cors.allowedOrigins[1] ? `${env.cors.allowedOrigins[1]}/login` : 'http://localhost:5174/login',
          asyncMode: true,
        }).catch((e) => logger.warn(`Officer activation email failed for ${row.email}:`, e.message));
      }
    } catch (err) {
      failedRows.push({
        row: row.row,
        email: row.email,
        error: err.message,
      });
    }
  }

  const importSummary = {
    totalUploaded: rows.length,
    createdCount: importedOfficers.length,
    failedCount: failedRows.length,
    emailsQueued: sendWelcomeEmail !== false ? importedOfficers.length : 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsPendingRetry: 0,
    commonPasswordUsed: true,
  };

  return {
    fileName,
    totalRows: rows.length,
    importedCount: importedOfficers.length,
    failedCount: failedRows.length,
    emailsQueued: sendWelcomeEmail !== false ? importedOfficers.length : 0,
    officers: importedOfficers,
    errors: failedRows,
    summary: importSummary,
  };
};

// ── SAMPLE TEMPLATES ──────────────────────────────────────────────────────────

const generateStudentTemplate = (format = 'csv') => {
  const sampleData = [
    {
      'Student Name': 'Ananya Sharma',
      'Email': 'ananya.sharma@example.com',
      'Register Number': '21CS001',
      'Phone Number': '9876543210',
      'College Name': 'Coimbatore Institute of Technology (CIT)',
      'Department': 'Computer Science and Engineering',
      'Year of Study': 3,
      'Gender': 'Female',
      'Course': 'B.E',
      'Academic Year': '2023-2027',
    },
    {
      'Student Name': 'Vignesh Kumar',
      'Email': 'vignesh.kumar@example.com',
      'Register Number': '21EC045',
      'Phone Number': '9876543211',
      'College Name': 'Sri Venkateswara Institute of Technology',
      'Department': 'Electronics and Communication Engineering',
      'Year of Study': 2,
      'Gender': 'Male',
      'Course': 'B.Tech',
      'Academic Year': '2024-2028',
    },
  ];

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    return {
      buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  // CSV
  const headers = Object.keys(sampleData[0]).join(',');
  const rows = sampleData.map((d) => Object.values(d).map((v) => `"${v}"`).join(','));
  const csvContent = [headers, ...rows].join('\n');
  return {
    buffer: Buffer.from(csvContent, 'utf-8'),
    mimeType: 'text/csv',
    extension: 'csv',
  };
};

const generateOfficerTemplate = (format = 'csv') => {
  const sampleData = [
    {
      'Officer Name': 'Kavitha R',
      'Email': 'kavitha.officer@maatram.org',
      'Phone': '9876500001',
      'Employee ID': 'EMP-OFF-01',
      'Designation': 'Zonal Lead Officer',
      'Assigned Zone': 'ZN-A',
    },
    {
      'Officer Name': 'Murugan S',
      'Email': 'murugan.officer@maatram.org',
      'Phone': '9876500002',
      'Employee ID': 'EMP-OFF-02',
      'Designation': 'Zonal Coordinator',
      'Assigned Zone': 'ZN-B',
    },
  ];

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Officers_Template');
    return {
      buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  const headers = Object.keys(sampleData[0]).join(',');
  const rows = sampleData.map((d) => Object.values(d).map((v) => `"${v}"`).join(','));
  const csvContent = [headers, ...rows].join('\n');
  return {
    buffer: Buffer.from(csvContent, 'utf-8'),
    mimeType: 'text/csv',
    extension: 'csv',
  };
};

module.exports = {
  previewStudentImport,
  confirmStudentImport,
  previewOfficerImport,
  confirmOfficerImport,
  generateStudentTemplate,
  generateOfficerTemplate,
};

