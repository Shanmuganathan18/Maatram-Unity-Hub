/**
 * Central configuration. ASSUMPTION items are prototype defaults pending client confirmation
 * (see README "Client clarification register"). Flip permission flags to enable/disable actions.
 */
export const appConfig = {
  appName: 'Maatram Officer Portal',
  timezone: 'Asia/Kolkata',
  utcOffset: '+05:30',
  // ASSUMPTION: Friday 6:00 PM IST in the planned week (same as Student Portal).
  deadline: { dayOfWeek: 5, hour: 18, minute: 0, weekOffset: 0 },
  weeksBack: 5,
  weeksAhead: 2,
  // ASSUMPTION (pending client): after the deadline, no submission => "System-Assumed Unavailable".
  // If false, such students stay "Not Submitted".
  systemAssumedUnavailable: true,
  // ASSUMPTION (pending client): physical-verification eligibility = targeted AND marked Available on the event date.
  physicalVerificationRule: 'available_on_event_date',
  // ASSUMPTION (pending client): attendance statuses and who may update them.
  attendanceStatuses: [{ id: 'present', label: 'Present' }, { id: 'absent', label: 'Absent' }, { id: 'excused', label: 'Excused' }],
  // Permission switches. false = action is NOT assumed permitted; UI shows "pending client confirmation".
  permissions: {
    canEditStudents: false, canCreateStudents: false, canDeactivateStudents: false, canImportStudents: false,
    canEditInstitutions: false, canEditAvailability: false, canOverrideResponses: false, canSendAnnouncements: false,
    canPublishEvents: true, publishRequiresApproval: false, canCancelEvents: true, canPostponeEvents: true,
    canUpdateAttendance: true, canExport: true,
    canPromoteWaitlist: true, // ASSUMPTION: officer decision (priority rule itself unconfirmed)
  },
  features: { capacityWaitlist: true, feedbackAnalytics: false },
  // ASSUMPTION: waitlist priority = order of response time (client has not confirmed).
  waitlistPriority: 'response_time',
  demo: { now: '2026-11-04T10:00:00+05:30', password: 'Demo@123', showDevTools: false },
};

export const profileEditableFields = ['phone', 'photoUrl']; // name, email, designation, zone & status are read-only

export const eventCategories = {
  college_visit: 'College Visit', boot_camp: 'Boot Camp', mock_training: 'Mock Training',
  online_session: 'Online Session', physical_verification: 'Physical Verification', other: 'Other',
};
export const eventStatuses = {
  draft: 'Draft', published: 'Published', invitations_open: 'Invitations Open', in_progress: 'In Progress',
  completed: 'Completed', postponed: 'Postponed', cancelled: 'Cancelled',
};
// Allowed status transitions (workflow is a prototype assumption pending client approval rules).
export const transitions = {
  draft: ['published', 'invitations_open', 'cancelled'],
  published: ['invitations_open', 'postponed', 'cancelled'],
  invitations_open: ['in_progress', 'postponed', 'cancelled'],
  in_progress: ['completed'],
  postponed: ['invitations_open', 'cancelled'],
  completed: [], cancelled: [],
};
export const notificationCategories = {
  availability_reminder: 'Weekly availability reminder', availability_deadline: 'Availability submission deadline',
  event_invitation: 'Event invitation', event_update: 'Event update', event_postponed: 'Event postponed',
  event_cancelled: 'Event cancelled', event_reminder: 'Event reminder', announcement: 'General announcement',
};
