// ALL FICTIONAL DEMO DATA. Names, emails, phones and institutions are invented.
// Only services/* may import this file; UI components must never import it directly.
import { addDays } from '../utils/dates';

export const institutions = [
  { id: 'inst-01', name: 'Sri Vidya Institute of Technology', city: 'Chennai' },
  { id: 'inst-02', name: 'Kaveri Engineering College', city: 'Tiruchirappalli' },
  { id: 'inst-03', name: 'Nilgiri College of Arts & Science', city: 'Coimbatore' },
  { id: 'inst-04', name: 'Vaigai Polytechnic University', city: 'Madurai' },
  { id: 'inst-05', name: 'Palar Institute of Management', city: 'Vellore' },
];
export const zones = [
  { id: 'zone-1', label: 'Zone 1 • North' },
  { id: 'zone-2', label: 'Zone 2 • South' },
  { id: 'zone-3', label: 'Zone 3 • West' },
];

export const students = [
  { id: 'stu-001', studentId: 'MF-2024-8842', name: 'Ananya S.', email: 'ananya.demo@example.org', phone: '9000000001', institutionId: 'inst-01', department: 'B.Tech IT', year: 3, zoneId: 'zone-2', groups: ['grp-mock-batch-4'], photoUrl: null, alternateEmail: '', whatsappEnabled: true, coordinator: 'Mr. Arun (Zone 2 Coordinator)' },
  { id: 'stu-002', studentId: 'MF-2025-1177', name: 'Karthik R.', email: 'karthik.demo@example.org', phone: '9000000002', institutionId: 'inst-02', department: 'B.E. CSE', year: 2, zoneId: 'zone-1', groups: [], photoUrl: null, alternateEmail: 'karthik.alt@example.org', whatsappEnabled: false, coordinator: 'Ms. Priya (Zone 1 Coordinator)' },
  { id: 'stu-003', studentId: 'MF-2023-0456', name: 'Meera V.', email: 'meera.demo@example.org', phone: '', institutionId: 'inst-03', department: 'B.Sc Computer Science', year: 4, zoneId: 'zone-3', groups: ['grp-mock-batch-4'], photoUrl: null, alternateEmail: '', whatsappEnabled: false, coordinator: 'Mr. Selvam (Zone 3 Coordinator)' },
  { id: 'stu-004', studentId: 'MF-2026-3310', name: 'Divya P.', email: 'divya.demo@example.org', phone: '9000000004', institutionId: 'inst-04', department: 'Diploma ECE', year: 1, zoneId: 'zone-2', groups: [], photoUrl: null, alternateEmail: '', whatsappEnabled: true, coordinator: 'Mr. Arun (Zone 2 Coordinator)' },
];

// ---- availability seeds: A=available all day, A:mae = available for listed slots, U=unavailable, -=not selected
const SLOT = { m: 'morning', a: 'afternoon', e: 'evening' };
const tok = (t) => (t === 'A' ? { status: 'available', slots: [] } : t === 'U' ? { status: 'unavailable', slots: [] } : t === '-' ? { status: 'none', slots: [] } : { status: 'available', slots: t.slice(2).split('').map((c) => SLOT[c]) });
export const patternToDays = (ws, p) => Object.fromEntries(p.map((t, i) => [addDays(ws, i), tok(t)]));
const ms = (iso) => Date.parse(iso);
const wk = (ws, p, status, saved, submitted, updated, history = []) => ({ weekStart: ws, status, days: patternToDays(ws, p), createdAt: ms(saved), lastSavedAt: ms(saved), submittedAt: submitted ? ms(submitted) : null, updatedAt: ms(updated || submitted || saved), history });

export const availabilitySeed = {
  'stu-001': {
    '2026-11-02': wk('2026-11-02', ['A', 'U', 'A', 'U', '-', 'A:ma', 'A'], 'draft', '2026-11-03T20:15:00+05:30', null),
    '2026-10-26': wk('2026-10-26', ['A', 'U', 'A', 'U', 'U', 'A:me', 'A'], 'submitted', '2026-10-27T21:10:00+05:30', '2026-10-27T21:10:00+05:30', '2026-10-29T09:30:00+05:30', [
      { id: 'h1', at: ms('2026-10-27T21:10:00+05:30'), type: 'submitted', changes: [] },
      { id: 'h2', at: ms('2026-10-29T09:30:00+05:30'), type: 'updated', changes: [{ date: '2026-10-31', from: 'Available (Morning, Afternoon)', to: 'Available (Morning, Evening)' }, { date: '2026-10-30', from: 'Available', to: 'Unavailable' }] },
    ]),
    '2026-10-19': wk('2026-10-19', ['U', 'U', 'U', 'A', 'U', 'A:ma', 'A'], 'submitted', '2026-10-20T18:40:00+05:30', '2026-10-20T18:40:00+05:30', null, [{ id: 'h3', at: ms('2026-10-20T18:40:00+05:30'), type: 'submitted', changes: [] }]),
    '2026-10-05': wk('2026-10-05', ['A', 'A', 'U', 'U', 'A', 'A', 'U'], 'submitted', '2026-10-06T08:05:00+05:30', '2026-10-06T08:05:00+05:30', null, [{ id: 'h4', at: ms('2026-10-06T08:05:00+05:30'), type: 'submitted', changes: [] }]),
    '2026-09-28': wk('2026-09-28', ['U', 'U', 'U', 'U', 'U', 'A:e', 'A:ma'], 'submitted', '2026-09-29T19:00:00+05:30', '2026-09-29T19:00:00+05:30', null, [{ id: 'h5', at: ms('2026-09-29T19:00:00+05:30'), type: 'submitted', changes: [] }]),
    '2026-09-21': wk('2026-09-21', ['A', '-', '-', '-', '-', 'A', '-'], 'draft', '2026-09-23T22:00:00+05:30', null), // draft never submitted -> System-Assumed Unavailable
    '2026-09-14': wk('2026-09-14', ['A', 'U', 'U', 'U', 'A', 'A', 'A'], 'submitted', '2026-09-15T11:20:00+05:30', '2026-09-15T11:20:00+05:30', null, [{ id: 'h6', at: ms('2026-09-15T11:20:00+05:30'), type: 'submitted', changes: [] }]),
  },
  'stu-002': {
    '2026-10-26': wk('2026-10-26', ['U', 'U', 'U', 'U', 'U', 'A', 'A'], 'submitted', '2026-10-28T10:00:00+05:30', '2026-10-28T10:00:00+05:30', null, [{ id: 'k1', at: ms('2026-10-28T10:00:00+05:30'), type: 'submitted', changes: [] }]),
  },
  'stu-003': {}, 'stu-004': {},
};

export const templatesSeed = {
  'stu-001': [
    { id: 'tpl-1', name: 'Weekends only', createdAt: ms('2026-09-10T10:00:00+05:30'), pattern: ['U', 'U', 'U', 'U', 'U', 'A', 'A'].map(tok) },
    { id: 'tpl-2', name: 'Weekday evenings + Saturday', createdAt: ms('2026-09-18T10:00:00+05:30'), pattern: ['A:e', 'A:e', 'A:e', 'A:e', 'U', 'A', 'U'].map(tok) },
  ],
};

// ---- events ----
const contact = (zone) => ({ email: `zone${zone}.office@maatram-demo.example`, phone: '+91 90000 0000' + zone });
const base = { priority: 'standard', status: 'upcoming', statusNote: null, originalDate: null, declineReasonRequired: false, allowWithdraw: true, feedbackEnabled: false, questions: [], physicalVerification: null, meetingInfo: null, venue: null, support: contact(2), organizer: { name: 'Zone 2 Office Team', role: 'Zone In-charge' } };
const ev = (o) => ({ ...base, ...o });

export const eventsSeed = [
  ev({ id: 'evt-101', title: 'Mock Technical Interview', category: 'mock_interview', description: 'One-to-one mock technical interview with industry mentors. Bring your updated resume and one project to discuss.', date: '2026-11-07', startTime: '10:00', endTime: '13:00', mode: 'physical', venue: 'Zone 2 Training Centre, Lab 3, Chennai', priority: 'mandatory', audience: { label: 'Zone 2 · 3rd & Final Year', years: [3, 4], zoneIds: ['zone-2'] }, responseDeadline: '2026-11-06T12:00:00+05:30', declineReasonRequired: true, questions: [
    { id: 'q1', type: 'select', label: 'Preferred interview domain', required: true, options: ['Full Stack', 'Data & Analytics', 'Embedded Systems', 'Cloud & DevOps'] },
    { id: 'q2', type: 'checkbox', label: 'I will bring a printed copy of my resume', required: true },
    { id: 'q3', type: 'textarea', label: 'Anything the interviewer should know? (optional)', required: false },
  ] }),
  ev({ id: 'evt-102', title: 'Soft Skills & Leadership Bootcamp', category: 'boot_camp', description: 'Interactive online bootcamp on communication, teamwork and leadership with guest speaker Dr. K. Radhakrishnan (fictional).', date: '2026-11-08', startTime: '16:00', endTime: '18:00', mode: 'online', meetingInfo: 'Zoom link and passcode will be sent by email after you accept.', audience: { label: 'Foundation-wide', years: null }, organizer: { name: 'Maatram Foundation', role: 'Programme Team' }, responseDeadline: '2026-11-07T18:00:00+05:30' }),
  ev({ id: 'evt-103', title: 'College Visit – Sri Vidya Institute', category: 'college_visit', description: 'Maatram team visit to your campus: programme overview, Q&A and student meet-up.', date: '2026-11-07', startTime: '11:00', endTime: '12:30', mode: 'physical', venue: 'Sri Vidya Institute of Technology, Seminar Hall', audience: { label: 'Sri Vidya Institute students', institutionIds: ['inst-01'] } }),
  ev({ id: 'evt-104', title: 'Full Stack Technical Boot Camp', category: 'boot_camp', description: 'Full-day hands-on boot camp covering React, APIs and deployment for 3rd year students.', date: '2026-11-14', startTime: '09:30', endTime: '16:30', mode: 'physical', venue: 'Zone 2 Training Centre, Chennai', audience: { label: '3rd Year · Zone 2', years: [3], zoneIds: ['zone-2'] }, responseDeadline: '2026-11-12T18:00:00+05:30', questions: [{ id: 'q1', type: 'radio', label: 'Do you need a lunch provision?', required: true, options: ['Vegetarian', 'Non-vegetarian', 'No lunch needed'] }] }),
  ev({ id: 'evt-105', title: 'Physical Verification – Document Check', category: 'physical_verification', description: 'Original-document verification. Only students who are available on the scheduled date are enabled for this event. Bring your ID card and certificates.', date: '2026-11-14', startTime: null, endTime: null, mode: 'physical', venue: 'Zone 2 Office, Chennai', priority: 'mandatory', audience: { label: 'Zone 2 · Eligible students' }, physicalVerification: { eligibleStudentIds: ['stu-001', 'stu-004'] } }),
  ev({ id: 'evt-106', title: 'Online Session: Resume Workshop', category: 'online_session', description: 'Build a standout resume with a hiring mentor.', date: '2026-11-10', startTime: '18:00', endTime: '19:00', mode: 'online', meetingInfo: 'Google Meet link shared on acceptance.', audience: { label: 'All years' } }),
  ev({ id: 'evt-107', title: 'Domain Specialisation Webinar', category: 'online_session', description: 'Choose your specialisation track with guidance from alumni.', date: '2026-11-22', startTime: '17:00', endTime: '18:30', mode: 'online', meetingInfo: 'Link will be shared closer to the date.', status: 'postponed', originalDate: '2026-11-15', statusNote: 'Moved from Sun 15 Nov to Sun 22 Nov because of a speaker clash. Your response is kept; please re-confirm if you can no longer attend.', audience: { label: '3rd & Final Year', years: [3, 4] } }),
  ev({ id: 'evt-108', title: 'Cloud Basics Boot Camp', category: 'boot_camp', description: 'Introductory cloud workshop.', date: '2026-11-09', startTime: '10:00', endTime: '15:00', mode: 'physical', venue: 'Zone 2 Training Centre', status: 'cancelled', statusNote: 'Cancelled due to low enrolment. A new date will be announced.', audience: { label: '3rd Year · Zone 2', years: [3] } }),
  ev({ id: 'evt-109', title: 'Mock Training Module 1', category: 'mock_training', description: 'Aptitude and group-discussion practice.', date: '2026-10-25', startTime: '10:00', endTime: '13:00', mode: 'physical', venue: 'Zone 2 Training Centre', status: 'completed', feedbackEnabled: true, audience: { label: '3rd Year · Zone 2', years: [3] } }),
  ev({ id: 'evt-110', title: 'Online Session: Aptitude Basics', category: 'online_session', description: 'Quantitative aptitude refresher.', date: '2026-10-18', startTime: '18:00', endTime: '19:00', mode: 'online', status: 'completed', audience: { label: 'All years' } }),
  ev({ id: 'evt-111', title: 'College Visit – Zone 2 Cluster Meet', category: 'college_visit', description: 'Joint cluster meet for Zone 2 institutions.', date: '2026-11-21', startTime: '10:00', endTime: '14:00', mode: 'physical', venue: 'Hall B, Zone 2 Cluster Campus (venue changed)', status: 'updated', statusNote: 'Venue changed to Hall B and start time moved to 10:00 AM.', audience: { label: 'Zone 2 students', zoneIds: ['zone-2'] } }),
  ev({ id: 'evt-112', title: 'Online Session: Interview Etiquette', category: 'online_session', description: 'Interview etiquette and body-language tips.', date: '2026-10-11', startTime: '17:00', endTime: '18:00', mode: 'online', status: 'completed', feedbackEnabled: true, audience: { label: 'All years' } }),
  ev({ id: 'evt-113', title: 'First-Year Orientation Session', category: 'online_session', description: 'Orientation for new Maatram students.', date: '2026-11-11', startTime: '17:00', endTime: '18:00', mode: 'online', audience: { label: '1st Year', years: [1] } }),
  ev({ id: 'evt-114', title: 'Physical Verification – Batch B', category: 'physical_verification', description: 'Second batch of document verification.', date: '2026-11-16', startTime: '10:00', endTime: '12:00', mode: 'physical', venue: 'Zone 2 Office, Chennai', audience: { label: 'Zone 2 · Eligible students' }, physicalVerification: { eligibleStudentIds: ['stu-004'] } }),
];

const inv = (response = 'pending', extra = {}) => ({ response, answers: {}, declineReason: '', respondedAt: null, ...extra });
export const invitationsSeed = {
  'stu-001': {
    'evt-101': inv(),
    'evt-102': inv(),
    'evt-103': inv('accepted', { respondedAt: ms('2026-11-01T09:00:00+05:30') }),
    'evt-104': inv('accepted', { answers: { q1: 'Vegetarian' }, respondedAt: ms('2026-11-02T14:20:00+05:30') }),
    'evt-105': inv(),
    'evt-106': inv('declined', { declineReason: 'Exam preparation that evening.', respondedAt: ms('2026-11-03T08:10:00+05:30') }),
    'evt-107': inv('accepted', { respondedAt: ms('2026-10-30T12:00:00+05:30') }),
    'evt-108': inv('accepted', { respondedAt: ms('2026-10-29T12:00:00+05:30') }),
    'evt-109': inv('accepted', { respondedAt: ms('2026-10-20T12:00:00+05:30') }),
    'evt-110': inv('declined', { declineReason: 'Clashing class test.', respondedAt: ms('2026-10-12T12:00:00+05:30') }),
    'evt-111': inv(),
    'evt-112': inv('accepted', { respondedAt: ms('2026-10-05T12:00:00+05:30') }),
  },
  'stu-002': { 'evt-102': inv(), 'evt-106': inv() },
  'stu-003': { 'evt-102': inv(), 'evt-106': inv(), 'evt-107': inv() },
  'stu-004': { 'evt-102': inv(), 'evt-105': inv(), 'evt-106': inv(), 'evt-113': inv(), 'evt-114': inv() },
};

export const feedbackSeed = { 'stu-001': { 'evt-112': { rating: 4, comment: 'Practical tips, very useful.', suggestion: 'Add a live mock round.', submittedAt: ms('2026-10-12T10:00:00+05:30') } } };

const n = (id, category, title, body, at, read, link) => ({ id, category, title, body, createdAt: ms(at), read, link });
export const notificationsSeed = {
  'stu-001': [
    n('n1', 'availability_reminder', 'Reminder: submit your availability', 'Your weekly availability for 2 – 8 Nov is still a draft. Deadline: Friday 6:00 PM.', '2026-11-04T05:00:00+05:30', false, { type: 'week', weekStart: '2026-11-02' }),
    n('n2', 'event_invitation', 'New invitation: Mock Technical Interview', 'Zone 2 Office Team invited you. Please accept or decline.', '2026-11-04T07:30:00+05:30', false, { type: 'event', eventId: 'evt-101' }),
    n('n3', 'event_invitation', 'New invitation: Soft Skills & Leadership Bootcamp', 'Foundation-wide online bootcamp on Sunday.', '2026-11-03T16:00:00+05:30', false, { type: 'event', eventId: 'evt-102' }),
    n('n4', 'event_postponed', 'Event postponed: Domain Specialisation Webinar', 'Moved to Sun 22 Nov. Please re-confirm your attendance.', '2026-11-03T11:00:00+05:30', false, { type: 'event', eventId: 'evt-107' }),
    n('n5', 'event_cancelled', 'Event cancelled: Cloud Basics Boot Camp', 'This boot camp has been cancelled.', '2026-11-02T18:00:00+05:30', true, { type: 'event', eventId: 'evt-108' }),
    n('n6', 'event_updated', 'Event updated: College Visit – Zone 2 Cluster Meet', 'Venue and start time changed.', '2026-11-02T10:00:00+05:30', true, { type: 'event', eventId: 'evt-111' }),
    n('n7', 'submission_confirmation', 'Availability updated for 26 Oct – 1 Nov', 'Your change was saved before the deadline.', '2026-10-29T09:30:00+05:30', true, { type: 'week', weekStart: '2026-10-26' }),
    n('n8', 'event_reminder', 'Tomorrow: Mock Training Module 1', 'Starts 10:00 AM at Zone 2 Training Centre.', '2026-10-24T18:00:00+05:30', true, { type: 'event', eventId: 'evt-109' }),
    n('n9', 'announcement', 'Maatram Foundation Day greetings', 'Thank you for being part of the community.', '2026-10-20T09:00:00+05:30', true, null),
  ],
  'stu-002': [n('k1', 'availability_reminder', 'Reminder: submit your availability', 'Week 2 – 8 Nov has no submission yet.', '2026-11-04T05:00:00+05:30', false, { type: 'week', weekStart: '2026-11-02' })],
  'stu-003': [], 'stu-004': [],
};

// preferences[category][channel]; channelsConfigured says which channels the account can use
export const preferencesSeed = {
  'stu-001': Object.fromEntries(['availability_reminder', 'deadline_reminder', 'submission_confirmation', 'event_invitation', 'event_updated', 'event_postponed', 'event_cancelled', 'event_reminder', 'announcement'].map((c) => [c, { inApp: true, email: true, sms: false, whatsapp: c !== 'announcement' }])),
};
