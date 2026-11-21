/**
 * src/modules/reports/report.service.js
 * Generates zone and system-wide reports and CSV exports.
 */
const prisma = require('../../config/database');
const { todayIST, weekStartOf } = require('../../utils/dates');

/**
 * Zone-level availability report for officers.
 */
const getZoneAvailabilityReport = async (officerZoneId, weekStart) => {
  const ws = weekStart || weekStartOf(todayIST());

  const students = await prisma.studentProfile.findMany({
    where: { zoneId: officerZoneId, status: 'ACTIVE' },
    include: {
      institution: { select: { name: true, code: true } },
      department: { select: { name: true } },
      availabilitySubmissions: {
        where: { weekStart: ws },
        include: { days: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return students.map((s) => {
    const sub = s.availabilitySubmissions[0];
    const days = sub?.days || [];
    const availableCount = days.filter((d) => d.availability === 'AVAILABLE').length;
    const unavailableCount = days.filter((d) => d.availability === 'UNAVAILABLE').length;

    return {
      studentCode: s.studentId,
      name: s.name,
      institution: s.institution.name,
      institutionCode: s.institution.code,
      department: s.department?.name || '—',
      year: s.year,
      status: sub ? sub.status.toLowerCase() : 'not_submitted',
      availableDays: availableCount,
      unavailableDays: unavailableCount,
      submittedAt: sub?.submittedAt || null,
    };
  });
};

/**
 * System-wide report for Admins.
 */
const getSystemAvailabilityReport = async (weekStart) => {
  const ws = weekStart || weekStartOf(todayIST());

  const zones = await prisma.zone.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: { select: { studentProfiles: true, institutions: true } },
    },
  });

  const submissions = await prisma.availabilitySubmission.findMany({
    where: { weekStart: ws, status: 'SUBMITTED' },
    select: { studentProfile: { select: { zoneId: true } } },
  });

  return zones.map((z) => {
    const submittedCount = submissions.filter((s) => s.studentProfile.zoneId === z.id).length;
    const totalStudents = z._count.studentProfiles;
    const rate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

    return {
      zoneCode: z.code,
      zoneName: z.name,
      institutionsCount: z._count.institutions,
      totalStudents,
      submittedCount,
      submissionRate: rate,
    };
  });
};

/**
 * Generate CSV text from an array of objects.
 */
const generateCSV = (headers, rows) => {
  const escapeVal = (v) => {
    if (v === null || v === undefined) return '""';
    const str = String(v).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map((h) => escapeVal(h.label)).join(',');
  const dataRows = rows.map((r) => headers.map((h) => escapeVal(r[h.key])).join(','));

  return [headerRow, ...dataRows].join('\r\n');
};

module.exports = {
  getZoneAvailabilityReport,
  getSystemAvailabilityReport,
  generateCSV,
};

