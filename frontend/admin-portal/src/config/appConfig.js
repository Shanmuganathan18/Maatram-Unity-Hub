/** Defaults only. Editable values live in the settings store (System Settings). ASSUMPTION = awaiting client confirmation. */
export const appConfig = {
  appName: 'Maatram Admin Portal', timezone: 'Asia/Kolkata', utcOffset: '+05:30', weeksBack: 5, weeksAhead: 2,
  demo: { now: '2026-11-04T10:00:00+05:30', password: 'Demo@123', showDevTools: false },
  slaDays: 3, // tickets open longer than this are overdue
};
export const defaultSettings = {
  general: { appName: 'Maatram Student Availability Planner', description: 'Student availability, events and participation management.', supportEmail: 'support@maatramfoundation.org', supportPhone: '+91 44 2827 0000', timezone: 'Asia/Kolkata' },
  academic: { academicYear: '2026-27', period: 'Semester 1' },
  availability: { startDay: 1, deadlineDay: 5, deadlineHour: 18, deadlineMinute: 0, deadlineWeekOffset: 0, editUntilDeadline: true, lockAfterDeadline: true, systemAssumedUnavailable: true },
  events: { approvalEnabled: false, defaultResponseDeadlineDays: 2, reminderHoursBefore: 24 },
  notifications: { inApp: true, email: false, sms: false, whatsapp: false },
  security: { sessionTimeoutMinutes: 30, passwordGuidance: 'Minimum 8 characters; Supabase Auth will enforce the real policy.' },
};
export const eventCategories = { college_visit: 'College Visit', boot_camp: 'Boot Camp', mock_training: 'Mock Training', online_session: 'Online Session', physical_verification: 'Physical Verification', other: 'Other' };
export const eventStatuses = { draft: 'Draft', published: 'Published', invitations_open: 'Invitations Open', in_progress: 'In Progress', completed: 'Completed', postponed: 'Postponed', cancelled: 'Cancelled' };
export const accountStatuses = ['Active', 'Inactive', 'Suspended', 'Pending Activation'];
export const notificationCategories = {
  new_officer: 'New officer account', new_student: 'New student registration', availability_deadline: 'Availability deadline', low_submission: 'Low zone submission rate',
  event_invitation: 'Event invitation', event_update: 'Event update', event_cancelled: 'Event cancellation', event_reminder: 'Event reminder', support_update: 'Support ticket update', announcement: 'System announcement',
};
export const ticketCategories = ['Login problem', 'Account issue', 'Availability submission', 'Event invitation', 'Institution mapping', 'Technical error', 'Other'];
