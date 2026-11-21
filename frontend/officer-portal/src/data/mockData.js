// ALL FICTIONAL DEMO DATA, generated deterministically (seeded RNG). Only src/services/store.js imports this file.
// Every zone-owned record carries a zoneId. Services (never components) enforce the zone scope.
import { addDays, instantAt } from '../utils/dates';
import { matchesAudience } from '../utils/eligibility';

const rng = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const R = rng(2026);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const pad = (n, l = 4) => String(n).padStart(l, '0');
const ms = (iso) => Date.parse(iso);

export const zones = [{ id: 'zone-a', name: 'Zone A', region: 'Chennai' }, { id: 'zone-b', name: 'Zone B', region: 'Coimbatore' }];

export const officers = [
  { id: 'off-a', officerId: 'OFF-A-001', name: 'Arun Kumar', email: 'officer.a@maatram-demo.example', phone: '9000011111', designation: 'Zone In-charge', zoneId: 'zone-a', status: 'Active', photoUrl: null },
  { id: 'off-b', officerId: 'OFF-B-001', name: 'Priya Ramesh', email: 'officer.b@maatram-demo.example', phone: '9000022222', designation: 'Zone Officer', zoneId: 'zone-b', status: 'Active', photoUrl: null },
];

const instDefs = [
  ['inst-a1', 'SVIT', 'Sri Vidya Institute of Technology', 'Chennai', 'zone-a', ['CSE', 'IT', 'ECE'], 16, 'Active'],
  ['inst-a2', 'MCE', 'Marina College of Engineering', 'Chennai', 'zone-a', ['CSE', 'Mechanical', 'ECE'], 15, 'Active'],
  ['inst-a3', 'AIM', 'Adyar Institute of Management', 'Chennai', 'zone-a', ['MBA', 'BBA'], 12, 'Active'],
  ['inst-a4', 'TPC', 'Thiruvallur Polytechnic College', 'Thiruvallur', 'zone-a', ['Diploma CSE', 'Diploma EEE'], 11, 'Onboarding'],
  ['inst-b1', 'NCAS', 'Nilgiri College of Arts & Science', 'Coimbatore', 'zone-b', ['B.Sc CS', 'B.Com', 'BCA'], 15, 'Active'],
  ['inst-b2', 'NIT-C', 'Noyyal Institute of Technology', 'Coimbatore', 'zone-b', ['CSE', 'IT', 'Civil'], 16, 'Active'],
  ['inst-b3', 'KEC', 'Kovai Engineering College', 'Tiruppur', 'zone-b', ['CSE', 'ECE', 'Mechanical'], 14, 'Active'],
  ['inst-b4', 'WGUC', 'Western Ghats University College', 'Pollachi', 'zone-b', ['MBA', 'BCA'], 12, 'Onboarding'],
];
export const institutions = instDefs.map(([id, code, name, location, zoneId, departments, , status]) => ({ id, code, name, location, zoneId, departments, status }));

const first = ['Ananya', 'Karthik', 'Meera', 'Divya', 'Rahul', 'Sneha', 'Vignesh', 'Lakshmi', 'Harish', 'Nithya', 'Surya', 'Kavya', 'Arjun', 'Pooja', 'Manoj', 'Deepa', 'Bharath', 'Swathi', 'Naveen', 'Keerthi', 'Gokul', 'Ishwarya', 'Prakash', 'Janani'];
const last = ['Sundaram', 'Raman', 'Venkat', 'Pillai', 'Iyer', 'Natarajan', 'Subbiah', 'Murugan', 'Krishnan', 'Balaji', 'Chandran', 'Selvam', 'Devi', 'Rajan', 'Gopal', 'Anand'];
const groupsAll = ['Batch-1', 'Batch-2', 'Mock Interview Pool', 'Leadership Cohort'];

export const students = [];
instDefs.forEach(([instId, , , , zoneId, depts, count]) => {
  for (let i = 0; i < count; i++) {
    const n = students.filter((s) => s.zoneId === zoneId).length + 1;
    const f = pick(first), l = pick(last), dept = pick(depts);
    const isMba = dept === 'MBA' || dept === 'BBA';
    const year = 1 + Math.floor(R() * (isMba ? 2 : 4));
    const g = new Set([pick(groupsAll)]); if (R() < 0.25) g.add(pick(groupsAll));
    students.push({ id: `stu-${zoneId.slice(-1)}-${pad(n)}`, studentId: `MF-${zoneId.slice(-1).toUpperCase()}-${pad(n)}`, name: `${f} ${l}`, email: `${f}.${l}${n}@students.example`.toLowerCase(), phone: `9${pad(Math.floor(R() * 1e9), 9)}`.slice(0, 10), institutionId: instId, zoneId, department: dept, year, groups: [...g] });
  }
});

// ---- weekly availability: availability[studentId][weekStart] = {status, days:{date:'available'|'unavailable'|'none'}, submittedAt, updatedAt}
export const weekStarts = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
const subP = [0.82, 0.8, 0.78, 0.85, 0.8, 0.62, 0.22];
export const availability = {};
students.forEach((s) => {
  availability[s.id] = {};
  weekStarts.forEach((ws, wi) => {
    const r = R(); const current = wi >= 5;
    const status = r < subP[wi] ? 'submitted' : r < subP[wi] + (current ? 0.12 : 0.05) ? 'draft' : null;
    if (!status) return;
    const days = {};
    for (let d = 0; d < 7; d++) {
      const x = R(); const wk = d >= 5;
      let v = wk ? (x < 0.72 ? 'available' : x < 0.93 ? 'unavailable' : 'none') : (x < 0.45 ? 'available' : x < 0.9 ? 'unavailable' : 'none');
      if (status === 'draft' && R() < 0.5) v = 'none';
      days[addDays(ws, d)] = v;
    }
    const at = instantAt(addDays(ws, Math.floor(R() * 4)), `${pad(8 + Math.floor(R() * 12), 2)}:15`);
    availability[s.id][ws] = { status, days, submittedAt: status === 'submitted' ? at : null, updatedAt: at };
  });
});

// ---- events
const zq = (n) => [
  { id: 'q1', type: 'yesno', label: 'Do you require transportation?', required: true },
  { id: 'q2', type: 'yesno', label: 'Are you bringing a laptop?', required: true },
  { id: 'q3', type: 'single', label: 'Meal preference', required: true, options: ['Vegetarian', 'Non-vegetarian', 'No meal needed'] },
  { id: 'q4', type: 'long', label: 'Any accessibility requirements?', required: false },
].slice(0, n);

const T = (o) => ({ description: 'Prototype event description for demonstration.', organizer: null, contact: null, mode: 'physical', venue: null, address: '', platform: '', link: '', instructions: '', departments: [], years: [], groups: [], questions: [], capacity: null, waitlistEnabled: false, originalDate: null, statusNote: '', ...o });
const zoneEvents = (z, off, names, I) => [
  T({ id: `ev-${z}-01`, title: names[0], category: 'college_visit', date: '2026-11-05', startTime: '10:00', endTime: '12:30', status: 'invitations_open', targetInstitutionIds: [I[0]], venue: 'Seminar Hall', responseDeadline: '2026-11-04T18:00:00+05:30' }),
  T({ id: `ev-${z}-02`, title: names[1], category: 'boot_camp', date: '2026-11-14', startTime: '09:30', endTime: '16:30', status: 'invitations_open', targetInstitutionIds: [I[0], I[1]], years: [3, 4], venue: 'Zone Training Centre', address: 'Training Centre, Main Road', questions: zq(4), capacity: 12, waitlistEnabled: true, responseDeadline: '2026-11-12T18:00:00+05:30' }),
  T({ id: `ev-${z}-03`, title: names[2], category: 'physical_verification', date: '2026-11-07', startTime: '10:00', endTime: '13:00', status: 'invitations_open', targetInstitutionIds: [I[0], I[1], I[2]], venue: 'Zone Office', address: 'Zone Office, City Centre', instructions: 'Bring original ID card and certificates.', responseDeadline: '2026-11-06T12:00:00+05:30' }),
  T({ id: `ev-${z}-04`, title: names[3], category: 'online_session', date: '2026-11-08', startTime: '16:00', endTime: '18:00', status: 'published', targetInstitutionIds: [I[0], I[1], I[2], I[3]], mode: 'online', platform: 'Zoom', link: 'https://meet.example/demo', responseDeadline: '2026-11-07T18:00:00+05:30' }),
  T({ id: `ev-${z}-05`, title: names[4], category: 'mock_training', date: '2026-10-25', startTime: '10:00', endTime: '13:00', status: 'completed', targetInstitutionIds: [I[0], I[1]], years: [3, 4], venue: 'Zone Training Centre', questions: zq(2), responseDeadline: '2026-10-23T18:00:00+05:30' }),
  T({ id: `ev-${z}-06`, title: names[5], category: 'boot_camp', date: '2026-11-04', startTime: '09:00', endTime: '16:00', status: 'in_progress', targetInstitutionIds: [I[1], I[2]], venue: 'Zone Training Centre', responseDeadline: '2026-11-02T18:00:00+05:30' }),
  T({ id: `ev-${z}-07`, title: names[6], category: 'other', date: '2026-11-21', startTime: '10:00', endTime: '14:00', status: 'draft', targetInstitutionIds: [I[0], I[2]], venue: 'Cluster Hall', responseDeadline: '2026-11-19T18:00:00+05:30' }),
  T({ id: `ev-${z}-08`, title: names[7], category: 'online_session', date: '2026-11-22', originalDate: '2026-11-15', startTime: '17:00', endTime: '18:30', status: 'postponed', statusNote: 'Moved because of a speaker clash.', targetInstitutionIds: [I[0], I[1]], mode: 'online', platform: 'Google Meet', link: 'https://meet.example/demo2', responseDeadline: '2026-11-20T18:00:00+05:30' }),
  T({ id: `ev-${z}-09`, title: names[8], category: 'boot_camp', date: '2026-11-09', startTime: '10:00', endTime: '15:00', status: 'cancelled', statusNote: 'Cancelled due to low enrolment.', targetInstitutionIds: [I[1], I[3]], venue: 'Zone Training Centre', responseDeadline: '2026-11-07T18:00:00+05:30' }),
  T({ id: `ev-${z}-10`, title: names[9], category: 'online_session', date: '2026-10-11', startTime: '17:00', endTime: '18:00', status: 'completed', targetInstitutionIds: [I[0], I[1], I[2], I[3]], mode: 'online', platform: 'Zoom', link: 'https://meet.example/demo3', responseDeadline: '2026-10-09T18:00:00+05:30' }),
].map((e) => ({ ...e, zoneId: off.zoneId, organizer: `${off.name} (${off.designation})`, contact: off.email, createdBy: off.id, createdAt: ms('2026-10-01T10:00:00+05:30') }));

const iz = (zid) => institutions.filter((i) => i.zoneId === zid).map((i) => i.id);
export const events = [
  ...zoneEvents('a', officers[0], ['College Visit – Sri Vidya Institute', 'Full Stack Technical Boot Camp', 'Physical Verification – Document Check', 'Online Soft Skills Session', 'Mock Training Module 1', 'Interview Skills Boot Camp', 'Zone Cluster Meet', 'Domain Specialisation Webinar', 'Cloud Basics Boot Camp', 'Resume Workshop (Online)'], iz('zone-a')),
  ...zoneEvents('b', officers[1], ['College Visit – Nilgiri College', 'Data Analytics Boot Camp', 'Physical Verification – Certificates', 'Online Career Guidance', 'Mock Training Module 1', 'Aptitude Boot Camp', 'Western Cluster Meet', 'Alumni Talk Webinar', 'Embedded Systems Boot Camp', 'Resume Workshop (Online)'], iz('zone-b')),
];

// ---- invitations (+ responses, answers, attendance). Physical verification: only students marked Available on the date.
const ansFor = (q) => (q.type === 'yesno' ? (R() < 0.5 ? 'Yes' : 'No') : q.type === 'single' ? pick(q.options) : q.type === 'long' ? (R() < 0.8 ? '' : 'Needs ground-floor access.') : 'OK');
export const invitations = [];
events.filter((e) => ['invitations_open', 'in_progress', 'completed', 'postponed', 'cancelled'].includes(e.status)).forEach((e) => {
  const ws = (() => { let d = e.date; for (let i = 0; i < 7; i++) { if (weekStarts.includes(d)) return d; d = addDays(d, -1); } return null; })();
  const target = students.filter((s) => s.zoneId === e.zoneId && matchesAudience(s, e) &&
    (e.category !== 'physical_verification' || (ws && availability[s.id][ws]?.status === 'submitted' && availability[s.id][ws].days[e.date] === 'available')));
  const done = ['completed', 'in_progress'].includes(e.status);
  const invitedAt = ms('2026-10-20T10:00:00+05:30');
  target.forEach((s) => {
    const r = R();
    let response = done ? (r < 0.62 ? 'accepted' : r < 0.9 ? 'declined' : r < 0.94 ? 'withdrawn' : 'pending') : (r < 0.38 ? 'accepted' : r < 0.55 ? 'declined' : r < 0.58 ? 'withdrawn' : 'pending');
    if (e.status === 'completed' && response === 'pending') response = 'declined';
    const answers = response === 'accepted' ? Object.fromEntries(e.questions.map((q) => [q.id, ansFor(q)])) : {};
    let attendance = null;
    if (response === 'accepted' && done) { const a = R(); if (e.status === 'completed' || a < 0.5) attendance = R() < 0.75 ? 'present' : R() < 0.6 ? 'absent' : 'excused'; }
    invitations.push({ id: `inv-${e.id}-${s.id}`, eventId: e.id, studentId: s.id, response, answers, invitedAt, respondedAt: response === 'pending' ? null : invitedAt + Math.floor(R() * 5e8) + 36e5, attendance, attendanceAt: attendance ? ms('2026-11-04T12:00:00+05:30') : null, attendanceBy: attendance ? e.createdBy : null });
  });
  if (e.capacity) { // overflow acceptances become waitlisted in response-time order (ASSUMED priority rule)
    const acc = invitations.filter((i) => i.eventId === e.id && i.response === 'accepted').sort((a, b) => a.respondedAt - b.respondedAt);
    acc.slice(e.capacity).forEach((i) => { i.response = 'waitlisted'; });
  }
});

const nt = (id, zoneId, category, title, body, at, read, link) => ({ id, zoneId, category, title, body, createdAt: ms(at), read, link });
export const notifications = ['a', 'b'].flatMap((z) => {
  const zid = `zone-${z}`;
  return [
    nt(`n-${z}1`, zid, 'availability_deadline', 'Availability deadline approaching', 'Weekly submissions close Friday 6:00 PM. Several students have not submitted.', '2026-11-04T08:00:00+05:30', false, { type: 'availability', weekStart: '2026-11-02' }),
    nt(`n-${z}2`, zid, 'event_invitation', 'Invitations opened', 'Invitations are open for the Full Stack boot camp.', '2026-11-03T15:00:00+05:30', false, { type: 'event', eventId: `ev-${z}-02` }),
    nt(`n-${z}3`, zid, 'event_reminder', 'Event today', 'The interview skills boot camp is in progress – update attendance.', '2026-11-04T07:30:00+05:30', false, { type: 'attendance', eventId: `ev-${z}-06` }),
    nt(`n-${z}4`, zid, 'event_postponed', 'Event postponed', 'The webinar was moved to 22 Nov.', '2026-11-02T11:00:00+05:30', true, { type: 'event', eventId: `ev-${z}-08` }),
    nt(`n-${z}5`, zid, 'event_cancelled', 'Event cancelled', 'The boot camp scheduled for 9 Nov was cancelled.', '2026-11-01T17:00:00+05:30', true, { type: 'event', eventId: `ev-${z}-09` }),
    nt(`n-${z}6`, zid, 'availability_reminder', 'Weekly reminder cycle', 'Reminders for week 45 are scheduled (preview only in prototype).', '2026-10-31T09:00:00+05:30', true, null),
    nt(`n-${z}7`, zid, 'announcement', 'Foundation announcement', 'New reporting format will be introduced next month.', '2026-10-28T10:00:00+05:30', true, null),
  ];
});

const act = (id, zoneId, actor, type, description, at, related) => ({ id, zoneId, actorId: actor.id, actorName: actor.name, type, description, at: ms(at), related });
export const activity = officers.flatMap((o, k) => {
  const z = k ? 'b' : 'a'; const ev = (n) => ({ type: 'event', id: `ev-${z}-${n}`, label: events.find((e) => e.id === `ev-${z}-${n}`).title });
  return [
    act(`ac-${z}1`, o.zoneId, o, 'event_created', 'Created event', '2026-10-01T10:00:00+05:30', ev('02')),
    act(`ac-${z}2`, o.zoneId, o, 'invitation_sent', 'Invitations sent to targeted students', '2026-10-20T10:00:00+05:30', ev('02')),
    act(`ac-${z}3`, o.zoneId, o, 'event_published', 'Published event', '2026-10-22T09:00:00+05:30', ev('04')),
    act(`ac-${z}4`, o.zoneId, o, 'event_postponed', 'Postponed event to 22 Nov', '2026-11-02T11:00:00+05:30', ev('08')),
    act(`ac-${z}5`, o.zoneId, o, 'event_cancelled', 'Cancelled event', '2026-11-01T17:00:00+05:30', ev('09')),
    act(`ac-${z}6`, o.zoneId, o, 'attendance_updated', 'Attendance updated', '2026-10-25T14:00:00+05:30', ev('05')),
    act(`ac-${z}7`, o.zoneId, o, 'report_exported', 'Exported availability report (CSV)', '2026-10-30T16:00:00+05:30', { type: 'report', id: 'availability', label: 'Weekly availability report' }),
  ];
});
