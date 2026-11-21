/**
 * Central configuration. Deadline, timezone, slots, feature flags and
 * notification categories live here so nothing is hard-coded in components.
 * Items marked ASSUMPTION are prototype defaults awaiting client confirmation.
 */
export const appConfig = {
  appName: 'Maatram Student Portal',
  timezone: 'Asia/Kolkata',
  utcOffset: '+05:30', // India has no DST, so a fixed offset is exact for Asia/Kolkata.

  // Weekly submission deadline. dayOfWeek: Mon=1 … Sun=7.
  // weekOffset 0 = deadline falls in the same week being planned (matches the reference design,
  // Week 14 / Fri 6:00 PM). Use -1 to make the deadline the Friday BEFORE the planned week.
  // ASSUMPTION: Friday 6:00 PM IST (from the client reference design; client to confirm).
  deadline: { dayOfWeek: 5, hour: 18, minute: 0, weekOffset: 0 },
  closesSoonHours: 24, // show "Closes soon" warning within this many hours
  weeksBack: 8, // how many past weeks can be browsed
  weeksAhead: 3, // how many future weeks can be submitted in advance

  features: { timeSlots: true, templates: true, eventConflicts: true, feedback: true, ics: true },

  // ASSUMPTION: slot definitions are configurable; empty slots on an available date = whole day.
  slots: [
    { id: 'morning', label: 'Morning', range: '8 AM – 12 PM' },
    { id: 'afternoon', label: 'Afternoon', range: '12 PM – 4 PM' },
    { id: 'evening', label: 'Evening', range: '4 PM – 8 PM' },
  ],

  // Reminder cadence is NOT specified by the client. These are example values used only for
  // mock notifications; the real cadence will be configured in the backend.
  reminderCadenceExample: [{ label: 'Weekly cycle opens', hoursBeforeDeadline: 120 }, { label: 'Reminder', hoursBeforeDeadline: 48 }, { label: 'Final reminder', hoursBeforeDeadline: 6 }],

  // Developer tooling (clock simulation + account switcher). Disable for production.
  demo: { now: '2026-11-04T10:00:00+05:30', showDevTools: false, password: 'Demo@123' },

  support: { email: 'support@maatramfoundation.org', phone: '+91 44 2827 0000', hours: 'Mon–Sat, 10 AM – 6 PM IST' },
};

// ASSUMPTION: which notices are mandatory (cannot be switched off) is pending client policy.
export const notificationCategories = [
  { id: 'availability_reminder', label: 'Weekly availability reminder', mandatory: true },
  { id: 'deadline_reminder', label: 'Submission deadline reminder', mandatory: true },
  { id: 'submission_confirmation', label: 'Availability submission confirmation', mandatory: false },
  { id: 'event_invitation', label: 'New event invitation', mandatory: true },
  { id: 'event_updated', label: 'Event updated', mandatory: true },
  { id: 'event_postponed', label: 'Event postponed', mandatory: true },
  { id: 'event_cancelled', label: 'Event cancelled', mandatory: true },
  { id: 'event_reminder', label: 'Upcoming event reminder', mandatory: false },
  { id: 'announcement', label: 'General announcement', mandatory: false },
];

export const eventCategories = {
  college_visit: 'College visit',
  boot_camp: 'Boot camp',
  mock_training: 'Mock training',
  mock_interview: 'Mock interview',
  online_session: 'Online session',
  physical_verification: 'Physical verification',
  other: 'Other',
};
