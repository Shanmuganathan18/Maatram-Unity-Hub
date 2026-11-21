/**
 * src/modules/availability/availability.service.js
 * Comprehensive business logic for student weekly availability:
 * - Deadline enforcement in backend
 * - 5-state calculation (not_started, draft, submitted, locked, system_assumed_unavailable)
 * - Daily availability & time slots (morning, afternoon, evening)
 * - Saved templates
 * - Officer zone-level monitoring and best-date recommendation calculation
 * - Admin system-wide cross-zone analytics
 */
const prisma = require('../../config/database');
const {
  nowUTC,
  todayIST,
  weekStartOf,
  addDays,
  weekDays,
  deadlineFor,
  fmtRange,
} = require('../../utils/dates');
const { ValidationError, AppError, NotFoundError, ZoneAccessError } = require('../../utils/errors');
const { createNotification } = require('../../services/notificationService');

// ── State Helper ─────────────────────────────────────────────────────────────
const calculateWeekState = (submission, deadline, now = new Date()) => {
  const isOpen = now < deadline;
  if (isOpen) {
    if (!submission) return 'not_started';
    return submission.status === 'SUBMITTED' ? 'submitted' : 'draft';
  } else {
    // Deadline has passed
    if (submission && submission.status === 'SUBMITTED') {
      return 'locked';
    }
    return 'system_assumed_unavailable';
  }
};

/**
 * Get current student's status for a specific week.
 */
const getStudentWeekInfo = async (studentProfileId, weekStart) => {
  const deadline = deadlineFor(weekStart);
  const now = new Date();
  const isOpen = now < deadline;

  const submission = await prisma.availabilitySubmission.findUnique({
    where: {
      studentProfileId_weekStart: {
        studentProfileId,
        weekStart,
      },
    },
    include: {
      days: {
        include: { slots: true },
      },
      history: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const state = calculateWeekState(submission, deadline, now);
  const closesSoon = isOpen && deadline.getTime() - now.getTime() <= 24 * 3600 * 1000;

  // Format days map
  const daysMap = {};
  weekDays(weekStart).forEach((d) => {
    daysMap[d] = { status: 'none', slots: [] };
  });

  if (submission && submission.days) {
    submission.days.forEach((dayRecord) => {
      daysMap[dayRecord.date] = {
        status: dayRecord.availability.toLowerCase(),
        slots: dayRecord.slots.map((s) => s.slot.toLowerCase()),
      };
    });
  }

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    state,
    isOpen,
    closesSoon,
    deadline: deadline.toISOString(),
    submission: submission
      ? {
          id: submission.id,
          status: submission.status.toLowerCase(),
          locked: submission.locked || !isOpen,
          submittedAt: submission.submittedAt,
          updatedAt: submission.updatedAt,
          days: daysMap,
          history: submission.history.map((h) => ({
            id: h.id,
            type: h.type,
            at: h.createdAt.getTime(),
            changes: h.changes,
          })),
        }
      : null,
  };
};

/**
 * Save draft for current week (student only).
 */
const saveDraft = async (studentProfileId, weekStart, days) => {
  const deadline = deadlineFor(weekStart);
  if (new Date() >= deadline) {
    throw new ValidationError('This week is locked. The submission deadline has passed.');
  }

  const existing = await prisma.availabilitySubmission.findUnique({
    where: {
      studentProfileId_weekStart: {
        studentProfileId,
        weekStart,
      },
    },
  });

  if (existing && existing.status === 'SUBMITTED') {
    throw new ValidationError('This week is already submitted. Please use Update Availability.');
  }

  const weekEnd = addDays(weekStart, 6);

  return prisma.$transaction(async (tx) => {
    // 1. Create or update submission record
    const sub = await tx.availabilitySubmission.upsert({
      where: {
        studentProfileId_weekStart: {
          studentProfileId,
          weekStart,
        },
      },
      update: {
        status: 'DRAFT',
        deadlineAt: deadline,
      },
      create: {
        studentProfileId,
        weekStart,
        weekEnd,
        status: 'DRAFT',
        deadlineAt: deadline,
      },
    });

    // 2. Clear old days and slots for draft
    await tx.availabilityDay.deleteMany({
      where: { submissionId: sub.id },
    });

    // 3. Insert day records
    for (const [date, val] of Object.entries(days)) {
      const avail = val.status === 'available' ? 'AVAILABLE' : val.status === 'unavailable' ? 'UNAVAILABLE' : 'NONE';
      const createdDay = await tx.availabilityDay.create({
        data: {
          submissionId: sub.id,
          date,
          availability: avail,
        },
      });

      // Insert slots if available
      if (avail === 'AVAILABLE' && Array.isArray(val.slots) && val.slots.length > 0) {
        for (const slot of val.slots) {
          const upperSlot = slot.toUpperCase();
          if (['MORNING', 'AFTERNOON', 'EVENING'].includes(upperSlot)) {
            await tx.availabilitySlot.create({
              data: {
                dayId: createdDay.id,
                slot: upperSlot,
              },
            });
          }
        }
      }
    }

    return sub;
  });
};

/**
 * Submit availability for the week.
 */
const submitWeek = async (studentProfileId, weekStart, days, userId) => {
  const deadline = deadlineFor(weekStart);
  if (new Date() >= deadline) {
    throw new ValidationError('This week is locked. The submission deadline has passed.');
  }

  // Validate at least one day is explicitly marked Available or Unavailable
  const dayValues = Object.values(days);
  const hasSelection = dayValues.some((d) => d.status === 'available' || d.status === 'unavailable');
  if (!hasSelection) {
    throw new ValidationError('Select at least one date as Available or Unavailable before submitting.');
  }

  const weekEnd = addDays(weekStart, 6);

  const submission = await prisma.$transaction(async (tx) => {
    const prev = await tx.availabilitySubmission.findUnique({
      where: {
        studentProfileId_weekStart: {
          studentProfileId,
          weekStart,
        },
      },
      include: {
        days: { include: { slots: true } },
      },
    });

    const isUpdate = prev && prev.status === 'SUBMITTED';

    // Compute diff if update
    const changes = [];
    if (isUpdate && prev.days) {
      const oldMap = {};
      prev.days.forEach((d) => {
        const slotsStr = d.slots.length ? ` (${d.slots.map((s) => s.slot.toLowerCase()).join(', ')})` : '';
        oldMap[d.date] = d.availability === 'AVAILABLE' ? `Available${slotsStr}` : d.availability === 'UNAVAILABLE' ? 'Unavailable' : 'Not selected';
      });

      for (const [date, val] of Object.entries(days)) {
        const slotsStr = val.slots && val.slots.length ? ` (${val.slots.join(', ')})` : '';
        const newDesc = val.status === 'available' ? `Available${slotsStr}` : val.status === 'unavailable' ? 'Unavailable' : 'Not selected';
        const oldDesc = oldMap[date] || 'Not selected';
        if (oldDesc !== newDesc) {
          changes.push({ date, from: oldDesc, to: newDesc });
        }
      }

      if (changes.length === 0) {
        throw new ValidationError('No changes made to update.');
      }
    }

    // 1. Create or update submission
    const sub = await tx.availabilitySubmission.upsert({
      where: {
        studentProfileId_weekStart: {
          studentProfileId,
          weekStart,
        },
      },
      update: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        deadlineAt: deadline,
      },
      create: {
        studentProfileId,
        weekStart,
        weekEnd,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        deadlineAt: deadline,
      },
    });

    // 2. Clear old days
    await tx.availabilityDay.deleteMany({
      where: { submissionId: sub.id },
    });

    // 3. Insert days
    for (const [date, val] of Object.entries(days)) {
      const avail = val.status === 'available' ? 'AVAILABLE' : val.status === 'unavailable' ? 'UNAVAILABLE' : 'NONE';
      const createdDay = await tx.availabilityDay.create({
        data: {
          submissionId: sub.id,
          date,
          availability: avail,
        },
      });

      if (avail === 'AVAILABLE' && Array.isArray(val.slots) && val.slots.length > 0) {
        for (const slot of val.slots) {
          const upperSlot = slot.toUpperCase();
          if (['MORNING', 'AFTERNOON', 'EVENING'].includes(upperSlot)) {
            await tx.availabilitySlot.create({
              data: {
                dayId: createdDay.id,
                slot: upperSlot,
              },
            });
          }
        }
      }
    }

    // 4. Record history
    await tx.availabilityHistory.create({
      data: {
        submissionId: sub.id,
        type: isUpdate ? 'updated' : 'submitted',
        changes,
      },
    });

    return sub;
  });

  // 5. Send notification to student
  await createNotification({
    userId,
    category: 'submission_confirmation',
    title: `Availability ${submission.status === 'SUBMITTED' ? 'submitted' : 'updated'} for ${fmtRange(weekStart)}`,
    body: 'Your weekly availability was recorded before the deadline. Remember: availability is not an event acceptance.',
    link: { type: 'week', weekStart },
  });

  return submission;
};

/**
 * Get student availability history (weeks back & ahead).
 */
const getStudentHistory = async (studentProfileId) => {
  const currentWeek = weekStartOf(todayIST());
  const submissions = await prisma.availabilitySubmission.findMany({
    where: { studentProfileId },
    include: {
      days: true,
      history: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { weekStart: 'desc' },
  });

  const subMap = new Map(submissions.map((s) => [s.weekStart, s]));

  // Generate 8 weeks back and current week
  const weeks = [];
  for (let i = 8; i >= 0; i--) {
    const ws = addDays(currentWeek, -i * 7);
    const sub = subMap.get(ws);
    const deadline = deadlineFor(ws);
    const state = calculateWeekState(sub, deadline);

    let availableCount = 0;
    let unavailableCount = 0;
    let noneCount = 0;

    if (sub && sub.days) {
      sub.days.forEach((d) => {
        if (d.availability === 'AVAILABLE') availableCount++;
        else if (d.availability === 'UNAVAILABLE') unavailableCount++;
        else noneCount++;
      });
    }

    weeks.push({
      weekStart: ws,
      weekEnd: addDays(ws, 6),
      state,
      submittedAt: sub?.submittedAt || null,
      updatedAt: sub?.updatedAt || null,
      counts: {
        available: availableCount,
        unavailable: unavailableCount,
        none: noneCount,
      },
    });
  }

  return weeks.reverse();
};

// ── Templates ────────────────────────────────────────────────────────────────
const listTemplates = async (studentProfileId) => {
  return prisma.availabilityTemplate.findMany({
    where: { studentProfileId },
    orderBy: { createdAt: 'desc' },
  });
};

const createTemplate = async (studentProfileId, name, pattern) => {
  const n = name.trim();
  if (!n) throw new ValidationError('Template name is required');

  const existing = await prisma.availabilityTemplate.findUnique({
    where: {
      studentProfileId_name: {
        studentProfileId,
        name: n,
      },
    },
  });
  if (existing) throw new ValidationError('A template with this name already exists');

  return prisma.availabilityTemplate.create({
    data: {
      studentProfileId,
      name: n,
      pattern,
    },
  });
};

const deleteTemplate = async (studentProfileId, id) => {
  const template = await prisma.availabilityTemplate.findUnique({ where: { id } });
  if (!template || template.studentProfileId !== studentProfileId) {
    throw new NotFoundError('Template not found');
  }
  return prisma.availabilityTemplate.delete({ where: { id } });
};

// ── Officer Zone Monitoring ─────────────────────────────────────────────────
/**
 * Zone-level availability summary for officers.
 * Strictly scoped to officer's assigned zone.
 */
const getZoneAvailability = async (officerZoneId, weekStart, filters = {}) => {
  const deadline = deadlineFor(weekStart);
  const now = new Date();
  const isOpen = now < deadline;

  // 1. Get all students in officer's zone
  const studentWhere = { zoneId: officerZoneId, status: 'ACTIVE' };
  if (filters.institutionId) {
    studentWhere.institutionId = filters.institutionId;
  }

  const students = await prisma.studentProfile.findMany({
    where: studentWhere,
    include: {
      institution: { select: { id: true, code: true, name: true } },
      department: { select: { name: true } },
    },
  });

  const totalStudents = students.length;

  // 2. Get submissions for this week
  const submissions = await prisma.availabilitySubmission.findMany({
    where: {
      weekStart,
      studentProfile: { zoneId: officerZoneId },
    },
    include: {
      days: { include: { slots: true } },
    },
  });

  const subMap = new Map(submissions.map((s) => [s.studentProfileId, s]));

  let submittedCount = 0;
  let draftCount = 0;
  let notSubmittedCount = 0;

  // Heatmap: count available students per date in week
  const dates = weekDays(weekStart);
  const heatmap = {};
  dates.forEach((d) => {
    heatmap[d] = { date: d, available: 0, unavailable: 0, notSubmitted: 0 };
  });

  const studentRows = students.map((s) => {
    const sub = subMap.get(s.id);
    const state = calculateWeekState(sub, deadline, now);

    if (state === 'submitted' || state === 'locked') submittedCount++;
    else if (state === 'draft') draftCount++;
    else notSubmittedCount++;

    const daysStatus = {};
    dates.forEach((d) => {
      const dayRec = sub?.days?.find((day) => day.date === d);
      if (dayRec && dayRec.availability === 'AVAILABLE') {
        daysStatus[d] = 'available';
        heatmap[d].available++;
      } else if (dayRec && dayRec.availability === 'UNAVAILABLE') {
        daysStatus[d] = 'unavailable';
        heatmap[d].unavailable++;
      } else {
        daysStatus[d] = 'none';
        heatmap[d].notSubmitted++;
      }
    });

    return {
      studentId: s.id,
      code: s.studentId,
      name: s.name,
      institution: s.institution.name,
      institutionCode: s.institution.code,
      department: s.department?.name || '—',
      year: s.year,
      state,
      days: daysStatus,
      submittedAt: sub?.submittedAt || null,
    };
  });

  const submissionPercentage = totalStudents > 0
    ? Math.round((submittedCount / totalStudents) * 100)
    : 0;

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    deadline: deadline.toISOString(),
    isOpen,
    stats: {
      totalStudents,
      submittedCount,
      draftCount,
      notSubmittedCount,
      submissionPercentage,
    },
    heatmap: Object.values(heatmap),
    students: studentRows,
  };
};

/**
 * Recommend best dates for events in an officer's zone based on student availability.
 */
const getBestDatesForZone = async (officerZoneId, weekStart, minAvailabilityPercent = 40) => {
  const data = await getZoneAvailability(officerZoneId, weekStart);
  const total = data.stats.totalStudents;
  if (total === 0) return [];

  return data.heatmap
    .map((day) => {
      const percentage = Math.round((day.available / total) * 100);
      return {
        date: day.date,
        availableStudents: day.available,
        totalEligible: total,
        availabilityPercentage: percentage,
        isRecommended: percentage >= minAvailabilityPercent,
      };
    })
    .sort((a, b) => b.availabilityPercentage - a.availabilityPercentage);
};

module.exports = {
  getStudentWeekInfo,
  saveDraft,
  submitWeek,
  getStudentHistory,
  listTemplates,
  createTemplate,
  deleteTemplate,
  getZoneAvailability,
  getBestDatesForZone,
};
