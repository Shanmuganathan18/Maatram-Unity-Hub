// ALL FICTIONAL DEMO DATA, generated deterministically. Only services/store.js imports this file.
import { addDays, instantAt } from '../utils/dates';
import { matchesAudience } from '../utils/eligibility';
import { defaultSettings } from '../config/appConfig';
import { defaultRolePermissions } from '../config/permissions';

const rng = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const R = rng(4242);
const pick = (a) => a[Math.floor(R() * a.length)];
const pad = (n, l = 4) => String(n).padStart(l, '0');
const ms = (iso) => Date.parse(iso);

export const zones = [
  { id: 'zone-a', code: 'ZN-A', name: 'Zone A', region: 'Chennai', description: 'Chennai and surrounding districts.', status: 'Active', createdAt: ms('2026-06-01T10:00:00+05:30') },
  { id: 'zone-b', code: 'ZN-B', name: 'Zone B', region: 'Coimbatore', description: 'Coimbatore, Tiruppur and Pollachi.', status: 'Active', createdAt: ms('2026-06-01T10:00:00+05:30') },
  { id: 'zone-c', code: 'ZN-C', name: 'Zone C', region: 'Madurai', description: 'Madurai and southern districts.', status: 'Active', createdAt: ms('2026-06-15T10:00:00+05:30') },
  { id: 'zone-d', code: 'ZN-D', name: 'Zone D', region: 'Salem', description: 'Salem region – onboarding paused.', status: 'Inactive', createdAt: ms('2026-08-01T10:00:00+05:30') },
];

export const admins = [
  { id: 'adm-01', adminId: 'ADM-001', name: 'Hemesh Kumar', email: 'hemeshkumar576@gmail.com', phone: '9000033331', role: 'admin', status: 'Active', photoUrl: null, lastLogin: ms('2026-11-11T18:00:00+05:30'), createdAt: ms('2026-05-20T10:00:00+05:30') },
  { id: 'adm-02', adminId: 'ADM-002', name: 'Executive Administrator', email: 'admin.support@maatramfoundation.org', phone: '9000033332', role: 'admin', status: 'Active', photoUrl: null, lastLogin: ms('2026-11-03T17:10:00+05:30'), createdAt: ms('2026-06-02T10:00:00+05:30') },
];

export const officers = [
  { id: 'off-01', officerId: 'OFF-A-001', name: 'Arun Kumar', email: 'officer.a@maatram-demo.example', phone: '9000011111', designation: 'Zone In-charge', zoneId: 'zone-a', status: 'Active', lastLogin: ms('2026-11-04T07:50:00+05:30'), createdAt: ms('2026-06-03T10:00:00+05:30') },
  { id: 'off-02', officerId: 'OFF-A-002', name: 'Meena Subramaniam', email: 'meena.demo@maatram-demo.example', phone: '9000011112', designation: 'Zone Officer', zoneId: 'zone-a', status: 'Active', lastLogin: ms('2026-11-03T15:30:00+05:30'), createdAt: ms('2026-06-10T10:00:00+05:30') },
  { id: 'off-03', officerId: 'OFF-B-001', name: 'Priya Ramesh', email: 'officer.b@maatram-demo.example', phone: '9000022222', designation: 'Zone Officer', zoneId: 'zone-b', status: 'Active', lastLogin: ms('2026-11-04T09:05:00+05:30'), createdAt: ms('2026-06-03T10:00:00+05:30') },
  { id: 'off-04', officerId: 'OFF-C-001', name: 'Dinesh Babu', email: 'dinesh.demo@maatram-demo.example', phone: '9000044441', designation: 'Zone In-charge', zoneId: 'zone-c', status: 'Active', lastLogin: ms('2026-11-01T10:00:00+05:30'), createdAt: ms('2026-06-20T10:00:00+05:30') },
  { id: 'off-05', officerId: 'OFF-C-002', name: 'Lakshmi Narayanan', email: 'lakshmi.demo@maatram-demo.example', phone: '9000044442', designation: 'Zone Officer', zoneId: 'zone-c', status: 'Inactive', lastLogin: ms('2026-08-12T10:00:00+05:30'), createdAt: ms('2026-06-22T10:00:00+05:30') },
  { id: 'off-06', officerId: 'OFF-X-001', name: 'Vimal Raj', email: 'vimal.demo@maatram-demo.example', phone: '9000055551', designation: 'Zone Officer', zoneId: null, status: 'Pending Activation', lastLogin: null, createdAt: ms('2026-11-02T10:00:00+05:30') },
];

const instDefs = [
  ['inst-a1', 'SVIT', 'Sri Vidya Institute of Technology', 'Chennai', 'zone-a', 'Engineering', ['CSE', 'IT', 'ECE'], 16],
  ['inst-a2', 'MCE', 'Marina College of Engineering', 'Chennai', 'zone-a', 'Engineering', ['CSE', 'Mechanical', 'ECE'], 15],
  ['inst-a3', 'AIM', 'Adyar Institute of Management', 'Chennai', 'zone-a', 'Management', ['MBA', 'BBA'], 12],
  ['inst-a4', 'TPC', 'Thiruvallur Polytechnic College', 'Thiruvallur', 'zone-a', 'Polytechnic', ['Diploma CSE', 'Diploma EEE'], 11],
  ['inst-b1', 'NCAS', 'Nilgiri College of Arts & Science', 'Coimbatore', 'zone-b', 'Arts & Science', ['B.Sc CS', 'B.Com', 'BCA'], 15],
  ['inst-b2', 'NIT-C', 'Noyyal Institute of Technology', 'Coimbatore', 'zone-b', 'Engineering', ['CSE', 'IT', 'Civil'], 16],
  ['inst-b3', 'KEC', 'Kovai Engineering College', 'Tiruppur', 'zone-b', 'Engineering', ['CSE', 'ECE', 'Mechanical'], 14],
  ['inst-b4', 'WGUC', 'Western Ghats University College', 'Pollachi', 'zone-b', 'Arts & Science', ['MBA', 'BCA'], 12],
  ['inst-c1', 'VCET', 'Vaigai College of Engineering', 'Madurai', 'zone-c', 'Engineering', ['CSE', 'ECE', 'Civil'], 14],
  ['inst-c2', 'MAC', 'Meenakshi Arts College', 'Madurai', 'zone-c', 'Arts & Science', ['B.Sc CS', 'BCA', 'B.Com'], 13],
  ['inst-c3', 'KEC', 'Kanyakumari Engineering College', 'Nagercoil', 'zone-c', 'Engineering', ['CSE', 'IT'], 11], // duplicate code with Kovai (data-quality demo)
  ['inst-d1', 'SIT', 'Salem Institute of Technology', 'Salem', 'zone-d', 'Engineering', ['CSE', 'ECE'], 8],
  ['inst-x1', 'UNK', 'Unassigned Demo College', 'Erode', null, 'Arts & Science', ['BCA'], 4],
];
export const institutions = instDefs.map(([id, code, name, location, zoneId, type, departments], i) => ({
  id, code, name, location, zoneId, type, departments, status: id === 'inst-a4' || id === 'inst-b4' ? 'Onboarding' : id === 'inst-d1' ? 'Inactive' : 'Active',
  contactName: id === 'inst-c2' ? '' : `Coordinator ${i + 1}`, contactEmail: id === 'inst-c2' ? '' : `contact${i + 1}@${code.toLowerCase()}.example`, contactPhone: id === 'inst-c2' ? '' : `9${pad(100000000 + i * 1111, 9)}`.slice(0, 10), createdAt: ms('2026-06-05T10:00:00+05:30'),
}));

const first = ['Ananya', 'Karthik', 'Meera', 'Divya', 'Rahul', 'Sneha', 'Vignesh', 'Lakshmi', 'Harish', 'Nithya', 'Surya', 'Kavya', 'Arjun', 'Pooja', 'Manoj', 'Deepa', 'Bharath', 'Swathi', 'Naveen', 'Keerthi', 'Gokul', 'Ishwarya', 'Prakash', 'Janani'];
const last = ['Sundaram', 'Raman', 'Venkat', 'Pillai', 'Iyer', 'Natarajan', 'Subbiah', 'Murugan', 'Krishnan', 'Balaji', 'Chandran', 'Selvam', 'Devi', 'Rajan', 'Gopal', 'Anand'];
const groupsAll = ['Batch-1', 'Batch-2', 'Mock Interview Pool', 'Leadership Cohort'];
export const students = [];
instDefs.forEach(([instId, , , , zoneId, , depts, count]) => {
  for (let i = 0; i < count; i++) {
    const n = students.length + 1; const f = pick(first), l = pick(last), dept = pick(depts);
    const mba = dept === 'MBA' || dept === 'BBA'; const year = 1 + Math.floor(R() * (mba ? 2 : 4)); const g = new Set([pick(groupsAll)]);
    const z = (zoneId ?? 'x').slice(-1).toUpperCase(); const r = R();
    students.push({ id: `stu-${pad(n)}`, studentId: `MF-${z}-${pad(n)}`, name: `${f} ${l}`, email: `${f}.${l}${n}@students.example`.toLowerCase(), phone: `9${pad(Math.floor(R() * 1e9), 9)}`.slice(0, 10), institutionId: instId, zoneId, department: dept, year, groups: [...g],
      status: r < 0.9 ? 'Active' : r < 0.94 ? 'Inactive' : r < 0.97 ? 'Pending Activation' : 'Suspended', lastLogin: ms('2026-10-20T10:00:00+05:30') + Math.floor(R() * 1.2e9), createdAt: ms('2026-07-01T10:00:00+05:30') + Math.floor(R() * 5e9) });
  }
});
// deliberate data-quality problems (prototype demo)
students[3].email = 'not-an-email'; students[7].phone = ''; students[11].email = ''; students[20].studentId = students[19].studentId;

// ---- availability[studentId][weekStart]
export const weekStarts = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
const subP = [0.82, 0.8, 0.78, 0.85, 0.8, 0.62, 0.22]; const zoneBias = { 'zone-a': 0.05, 'zone-b': 0, 'zone-c': -0.22, 'zone-d': -0.3 };
export const availability = {};
students.forEach((s) => {
  availability[s.id] = {};
  weekStarts.forEach((ws, wi) => {
    const r = R(); const cur = wi >= 5; const p = Math.max(0.05, subP[wi] + (zoneBias[s.zoneId] ?? 0));
    const status = r < p ? 'submitted' : r < p + (cur ? 0.12 : 0.05) ? 'draft' : null; if (!status) return;
    const days = {};
    for (let d = 0; d < 7; d++) { const x = R(); const wk = d >= 5; let v = wk ? (x < 0.72 ? 'available' : x < 0.93 ? 'unavailable' : 'none') : (x < 0.45 ? 'available' : x < 0.9 ? 'unavailable' : 'none'); if (status === 'draft' && R() < 0.5) v = 'none'; days[addDays(ws, d)] = v; }
    const at = instantAt(addDays(ws, Math.floor(R() * 4)), `${pad(8 + Math.floor(R() * 12), 2)}:15`);
    availability[s.id][ws] = { status, days, submittedAt: status === 'submitted' ? at : null, updatedAt: at };
  });
});

// ---- events (per active zone)
const zq = (n) => [{ id: 'q1', type: 'yesno', label: 'Do you require transportation?', required: true }, { id: 'q2', type: 'yesno', label: 'Are you bringing a laptop?', required: true }, { id: 'q3', type: 'single', label: 'Meal preference', required: true, options: ['Vegetarian', 'Non-vegetarian', 'No meal needed'] }, { id: 'q4', type: 'long', label: 'Any accessibility requirements?', required: false }].slice(0, n);
const T = (o) => ({ description: 'Prototype event description for demonstration.', mode: 'physical', venue: null, address: '', platform: '', link: '', instructions: '', departments: [], years: [], groups: [], questions: [], capacity: null, originalDate: null, statusNote: '', approvalStatus: 'approved', ...o });
const zoneEvents = (z, officer, names, I) => [
  T({ id: `ev-${z}-01`, title: names[0], category: 'college_visit', date: '2026-11-05', startTime: '10:00', endTime: '12:30', status: 'invitations_open', targetInstitutionIds: [I[0]], venue: 'Seminar Hall', responseDeadline: '2026-11-04T18:00:00+05:30' }),
  T({ id: `ev-${z}-02`, title: names[1], category: 'boot_camp', date: '2026-11-14', startTime: '09:30', endTime: '16:30', status: 'invitations_open', targetInstitutionIds: [I[0], I[1]], years: [3, 4], venue: 'Zone Training Centre', questions: zq(4), capacity: 12, responseDeadline: '2026-11-12T18:00:00+05:30' }),
  T({ id: `ev-${z}-03`, title: names[2], category: 'physical_verification', date: '2026-11-07', startTime: '10:00', endTime: '13:00', status: 'invitations_open', targetInstitutionIds: [I[0], I[1], I[2]], venue: 'Zone Office', responseDeadline: '2026-11-06T12:00:00+05:30' }),
  T({ id: `ev-${z}-04`, title: names[3], category: 'online_session', date: '2026-11-08', startTime: '16:00', endTime: '18:00', status: 'published', targetInstitutionIds: I, mode: 'online', platform: 'Zoom', link: 'https://meet.example/demo', responseDeadline: '2026-11-07T18:00:00+05:30', approvalStatus: 'pending' }),
  T({ id: `ev-${z}-05`, title: names[4], category: 'mock_training', date: '2026-10-25', startTime: '10:00', endTime: '13:00', status: 'completed', targetInstitutionIds: [I[0], I[1]], years: [3, 4], venue: 'Zone Training Centre', questions: zq(2), responseDeadline: '2026-10-23T18:00:00+05:30' }),
  T({ id: `ev-${z}-06`, title: names[5], category: 'boot_camp', date: '2026-11-04', startTime: '09:00', endTime: '16:00', status: 'in_progress', targetInstitutionIds: [I[1], I[2] ?? I[0]], venue: 'Zone Training Centre', responseDeadline: '2026-11-02T18:00:00+05:30' }),
  T({ id: `ev-${z}-07`, title: names[6], category: 'other', date: '2026-11-21', startTime: '10:00', endTime: '14:00', status: 'draft', targetInstitutionIds: [I[0], I[2] ?? I[1]], venue: 'Cluster Hall', responseDeadline: '2026-11-19T18:00:00+05:30', approvalStatus: 'pending' }),
  T({ id: `ev-${z}-08`, title: names[7], category: 'online_session', date: '2026-11-22', originalDate: '2026-11-15', startTime: '17:00', endTime: '18:30', status: 'postponed', statusNote: 'Moved because of a speaker clash.', targetInstitutionIds: [I[0], I[1]], mode: 'online', platform: 'Google Meet', link: 'https://meet.example/demo2', responseDeadline: '2026-11-20T18:00:00+05:30' }),
  T({ id: `ev-${z}-09`, title: names[8], category: 'boot_camp', date: '2026-11-09', startTime: '10:00', endTime: '15:00', status: 'cancelled', statusNote: 'Cancelled due to low enrolment.', targetInstitutionIds: [I[1], I[3] ?? I[0]], venue: 'Zone Training Centre', responseDeadline: '2026-11-07T18:00:00+05:30' }),
  T({ id: `ev-${z}-10`, title: names[9], category: 'online_session', date: '2026-10-11', startTime: '17:00', endTime: '18:00', status: 'completed', targetInstitutionIds: I, mode: 'online', platform: 'Zoom', link: 'https://meet.example/demo3', responseDeadline: '2026-10-09T18:00:00+05:30' }),
].map((e, i) => ({ ...e, zoneId: officer.zoneId, organizer: officer.name, contact: officer.email, createdBy: Array.isArray(officer) ? null : officer.id, createdAt: ms('2026-10-01T10:00:00+05:30'), _i: i }));
const iz = (zid) => institutions.filter((i) => i.zoneId === zid).map((i) => i.id);
const nm = (s) => [`College Visit – ${s}`, 'Full Stack Technical Boot Camp', `Physical Verification – ${s}`, 'Online Soft Skills Session', 'Mock Training Module 1', 'Interview Skills Boot Camp', 'Cluster Meet', 'Domain Specialisation Webinar', 'Cloud Basics Boot Camp', 'Resume Workshop (Online)'];
export const events = [
  ...zoneEvents('a', officers[0], nm('Sri Vidya'), iz('zone-a')), ...zoneEvents('b', officers[2], nm('Nilgiri'), iz('zone-b')), ...zoneEvents('c', officers[3], nm('Vaigai'), iz('zone-c')),
].map(({ _i, ...e }) => e);

const ansFor = (q) => (q.type === 'yesno' ? (R() < 0.5 ? 'Yes' : 'No') : q.type === 'single' ? pick(q.options) : q.type === 'long' ? (R() < 0.8 ? '' : 'Needs ground-floor access.') : 'OK');
export const invitations = [];
events.filter((e) => ['invitations_open', 'in_progress', 'completed', 'postponed', 'cancelled'].includes(e.status)).forEach((e) => {
  const ws = (() => { let d = e.date; for (let i = 0; i < 7; i++) { if (weekStarts.includes(d)) return d; d = addDays(d, -1); } return null; })();
  const target = students.filter((s) => s.zoneId === e.zoneId && matchesAudience(s, e) && (e.category !== 'physical_verification' || (ws && availability[s.id][ws]?.status === 'submitted' && availability[s.id][ws].days[e.date] === 'available')));
  const done = ['completed', 'in_progress'].includes(e.status); const invitedAt = ms('2026-10-20T10:00:00+05:30');
  target.forEach((s) => {
    const r = R(); let response = done ? (r < 0.62 ? 'accepted' : r < 0.9 ? 'declined' : r < 0.94 ? 'withdrawn' : 'pending') : (r < 0.38 ? 'accepted' : r < 0.55 ? 'declined' : r < 0.58 ? 'withdrawn' : 'pending');
    if (e.status === 'completed' && response === 'pending') response = 'declined';
    let attendance = null; if (response === 'accepted' && done) { const a = R(); if (e.status === 'completed' || a < 0.5) attendance = R() < 0.75 ? 'present' : R() < 0.6 ? 'absent' : 'excused'; }
    invitations.push({ id: `inv-${e.id}-${s.id}`, eventId: e.id, studentId: s.id, response, answers: response === 'accepted' ? Object.fromEntries(e.questions.map((q) => [q.id, ansFor(q)])) : {}, invitedAt, respondedAt: response === 'pending' ? null : invitedAt + Math.floor(R() * 5e8) + 36e5, attendance, attendanceAt: attendance ? ms('2026-11-04T12:00:00+05:30') : null });
  });
  if (e.capacity) invitations.filter((i) => i.eventId === e.id && i.response === 'accepted').sort((a, b) => a.respondedAt - b.respondedAt).slice(e.capacity).forEach((i) => { i.response = 'waitlisted'; });
});

// ---- audit log
const au = (n, who, role, action, category, description, at, zoneId = null, related = null) => ({
  id: `LOG-${pad(n, 5)}`,
  actorId: who?.id || 'adm-01',
  actorName: who?.name || 'Hemesh Kumar',
  actorRole: role,
  action,
  category,
  description,
  at: ms(at),
  zoneId,
  related
});
const S = admins[0], A = admins[1] || admins[0], K = admins[0];
export const auditLogs = [
  au(1, S, 'admin', 'zone.created', 'Zone', 'Created zone ZN-A', '2026-06-01T10:00:00+05:30', 'zone-a', { type: 'zone', id: 'zone-a', label: 'Zone A' }),
  au(2, S, 'admin', 'zone.created', 'Zone', 'Created zone ZN-B', '2026-06-01T10:05:00+05:30', 'zone-b', { type: 'zone', id: 'zone-b', label: 'Zone B' }),
  au(3, A, 'admin', 'officer.created', 'User', 'Invited officer Arun Kumar', '2026-06-03T10:00:00+05:30', 'zone-a', { type: 'officer', id: 'off-01', label: 'Arun Kumar' }),
  au(4, A, 'admin', 'institution.updated', 'Institution', 'Updated contact details', '2026-09-02T12:00:00+05:30', 'zone-a', { type: 'institution', id: 'inst-a1', label: 'Sri Vidya Institute of Technology' }),
  au(5, S, 'admin', 'role.updated', 'Role', 'Updated permissions of role Admin', '2026-09-10T10:00:00+05:30', null, { type: 'role', id: 'admin', label: 'Admin' }),
  au(6, officers[0], 'zone_officer', 'event.created', 'Event', 'Created event Full Stack Technical Boot Camp', '2026-10-01T10:00:00+05:30', 'zone-a', { type: 'event', id: 'ev-a-02', label: 'Full Stack Technical Boot Camp' }),
  au(7, officers[0], 'zone_officer', 'event.invitation_sent', 'Event', 'Invitations sent', '2026-10-20T10:00:00+05:30', 'zone-a', { type: 'event', id: 'ev-a-02', label: 'Full Stack Technical Boot Camp' }),
  au(8, officers[2], 'zone_officer', 'event.cancelled', 'Event', 'Cancelled event', '2026-11-01T17:00:00+05:30', 'zone-b', { type: 'event', id: 'ev-b-09', label: 'Cloud Basics Boot Camp' }),
  au(9, officers[3], 'zone_officer', 'attendance.updated', 'Attendance', 'Attendance updated', '2026-10-25T14:00:00+05:30', 'zone-c', { type: 'event', id: 'ev-c-05', label: 'Mock Training Module 1' }),
  au(10, S, 'admin', 'report.exported', 'Report', 'Exported audit history (CSV)', '2026-10-30T16:00:00+05:30', null, { type: 'report', id: 'audit', label: 'Audit history' }),
  au(11, A, 'admin', 'student.import_previewed', 'Student', 'Previewed import students_zoneA_batch1.csv (2 invalid rows)', '2026-10-28T11:00:00+05:30', 'zone-a', null),
  au(12, A, 'admin', 'announcement.published', 'Announcement', 'Published “Availability deadline reminder”', '2026-11-03T09:00:00+05:30', null, { type: 'announcement', id: 'ann-01', label: 'Availability deadline reminder' }),
  au(13, S, 'admin', 'officer.deactivated', 'User', 'Deactivated officer Lakshmi Narayanan', '2026-08-12T10:00:00+05:30', 'zone-c', { type: 'officer', id: 'off-05', label: 'Lakshmi Narayanan' }),
  au(14, A, 'admin', 'zone.updated', 'Zone', 'Marked zone ZN-D Inactive', '2026-09-20T10:00:00+05:30', 'zone-d', { type: 'zone', id: 'zone-d', label: 'Zone D' }),
  au(15, S, 'admin', 'login', 'Login', 'Signed in', '2026-11-04T08:40:00+05:30'), au(16, A, 'admin', 'login', 'Login', 'Signed in', '2026-11-03T17:10:00+05:30'),
  au(18, A, 'admin', 'ticket.status_changed', 'Support', 'Ticket TCK-1004 set to In Progress', '2026-11-02T14:00:00+05:30', 'zone-b', { type: 'ticket', id: 'TCK-1004', label: 'TCK-1004' }),
  au(19, S, 'admin', 'settings.updated', 'Settings', 'Updated academic year to 2026-27', '2026-07-01T09:00:00+05:30'),
  au(20, A, 'admin', 'student.updated', 'Student', 'Corrected institution mapping', '2026-10-15T10:30:00+05:30', 'zone-b', { type: 'student', id: 'stu-0030', label: 'Student MF-B-0030' }),
];
export const permissionHistory = [{ id: 'ph-1', at: ms('2026-09-10T10:00:00+05:30'), actorName: 'Hemesh Kumar', role: 'admin', change: 'Removed settings.edit and roles.manage from Admin', note: 'Initial mock configuration' }];

// ---- support tickets
const msg = (who, role, text, at, internal = false) => ({ id: `m-${Math.random().toString(36).slice(2, 7)}`, who, role, text, at: ms(at), internal });
const tk = (n, subject, by, role, zoneId, category, priority, status, created, assignee, messages) => ({ id: `TCK-${1000 + n}`, subject, submittedBy: by, userRole: role, zoneId, category, priority, status, createdAt: ms(created), assignee, messages, history: [{ at: ms(created), text: 'Ticket created' }] });
export const tickets = [
  tk(1, 'Cannot sign in with college email', 'Karthik Raman', 'Student', 'zone-b', 'Login problem', 'High', 'Open', '2026-10-28T09:00:00+05:30', null, [msg('Karthik Raman', 'Student', 'I get “incorrect password” even after reset.', '2026-10-28T09:00:00+05:30')]),
  tk(2, 'Availability not saving on phone', 'Divya Pillai', 'Student', 'zone-a', 'Availability submission', 'Medium', 'In Progress', '2026-11-01T10:00:00+05:30', 'adm-02', [msg('Divya Pillai', 'Student', 'Tapping submit does nothing.', '2026-11-01T10:00:00+05:30'), msg('Hemesh Kumar', 'Admin', 'Could you share your phone model?', '2026-11-02T10:00:00+05:30'), msg('Hemesh Kumar', 'Admin', 'Possible browser cache issue – escalate if repeated.', '2026-11-02T10:05:00+05:30', true)]),
  tk(3, 'Institution mapped to wrong zone', 'Dinesh Babu', 'Officer', 'zone-c', 'Institution mapping', 'High', 'Open', '2026-10-30T11:00:00+05:30', null, [msg('Dinesh Babu', 'Officer', 'Kanyakumari Engineering College should be in Zone C only.', '2026-10-30T11:00:00+05:30')]),
  tk(4, 'Invitation not visible', 'Meera Venkat', 'Student', 'zone-b', 'Event invitation', 'Medium', 'In Progress', '2026-11-02T08:00:00+05:30', 'adm-02', [msg('Meera Venkat', 'Student', 'My friend got the boot camp invitation, I did not.', '2026-11-02T08:00:00+05:30')]),
  tk(5, 'Error 500 on report export', 'Priya Ramesh', 'Officer', 'zone-b', 'Technical error', 'Urgent', 'Waiting for User', '2026-11-03T12:00:00+05:30', 'adm-01', [msg('Priya Ramesh', 'Officer', 'Export button shows an error.', '2026-11-03T12:00:00+05:30')]),
  tk(6, 'Change email address', 'Surya Anand', 'Student', 'zone-a', 'Account issue', 'Low', 'Resolved', '2026-10-20T10:00:00+05:30', 'adm-02', [msg('Surya Anand', 'Student', 'Please update my email.', '2026-10-20T10:00:00+05:30')]),
  tk(7, 'Need access to Zone D data', 'Arun Kumar', 'Officer', 'zone-a', 'Other', 'Low', 'Closed', '2026-10-10T10:00:00+05:30', 'adm-01', [msg('Arun Kumar', 'Officer', 'Can I see Zone D reports?', '2026-10-10T10:00:00+05:30')]),
  tk(8, 'Duplicate student ID reported', 'Meena Subramaniam', 'Officer', 'zone-a', 'Account issue', 'Medium', 'Open', '2026-10-29T10:00:00+05:30', null, [msg('Meena Subramaniam', 'Officer', 'Two students show the same ID.', '2026-10-29T10:00:00+05:30')]),
  tk(9, 'Password reset email not received', 'Nithya Gopal', 'Student', 'zone-c', 'Login problem', 'Medium', 'Open', '2026-11-03T16:00:00+05:30', null, [msg('Nithya Gopal', 'Student', 'No reset email arrives.', '2026-11-03T16:00:00+05:30')]),
].map((t) => ({ ...t, history: [...t.history, ...(t.status !== 'Open' ? [{ at: t.createdAt + 36e5, text: `Status set to ${t.status}` }] : [])] }));

// ---- notifications / announcements / imports
const nt = (id, category, title, body, at, link) => ({ id, category, title, body, createdAt: ms(at), link });
export const notifications = [
  nt('n1', 'low_submission', 'Low submission rate: Zone C', 'Zone C is well below the other zones this week.', '2026-11-04T08:00:00+05:30', '/availability'),
  nt('n2', 'availability_deadline', 'Availability deadline Friday 6:00 PM', 'Week 45 submissions close in 2 days.', '2026-11-04T07:00:00+05:30', '/availability'),
  nt('n3', 'new_officer', 'New officer account pending', 'Vimal Raj has no zone assignment yet.', '2026-11-02T10:00:00+05:30', '/officers/off-06'),
  nt('n4', 'support_update', 'Ticket TCK-1005 waiting for user', 'Priya Ramesh has not replied yet.', '2026-11-03T15:00:00+05:30', '/support'),
  nt('n5', 'event_cancelled', 'Event cancelled in Zone B', 'Cloud Basics Boot Camp was cancelled by the officer.', '2026-11-01T17:00:00+05:30', '/events/ev-b-09'),
  nt('n6', 'event_update', 'Event postponed in Zone A', 'Domain Specialisation Webinar moved to 22 Nov.', '2026-11-02T11:00:00+05:30', '/events/ev-a-08'),
  nt('n7', 'new_student', 'Student import previewed', '118 valid rows in students_zoneA_batch1.csv.', '2026-10-28T11:00:00+05:30', '/data-centre'),
  nt('n8', 'event_reminder', 'Physical verification this Saturday', 'Zone A, B and C each have a verification day on 7 Nov.', '2026-11-04T06:00:00+05:30', '/events'),
  nt('n9', 'announcement', 'Announcement published', 'Availability deadline reminder was published.', '2026-11-03T09:00:00+05:30', '/announcements'),
  nt('n10', 'event_invitation', 'Invitations opened', 'Full Stack Technical Boot Camp invitations are open in 3 zones.', '2026-10-20T10:00:00+05:30', '/events'),
];
export const announcements = [
  { id: 'ann-01', title: 'Availability deadline reminder', body: 'Please submit weekly availability before Friday 6:00 PM.', audience: 'all_students', zoneIds: [], roles: [], publishAt: ms('2026-11-03T09:00:00+05:30'), expiresAt: ms('2026-11-07T00:00:00+05:30'), status: 'published', createdBy: 'Hemesh Kumar', createdAt: ms('2026-11-02T16:00:00+05:30') },
  { id: 'ann-02', title: 'Zone C onboarding session', body: 'Online orientation for Zone C institutions next week.', audience: 'selected_zones', zoneIds: ['zone-c'], roles: [], publishAt: ms('2026-11-10T09:00:00+05:30'), expiresAt: null, status: 'scheduled', createdBy: 'Hemesh Kumar', createdAt: ms('2026-11-03T12:00:00+05:30') },
  { id: 'ann-03', title: 'Officer training notes', body: 'Draft notes for officer refresher.', audience: 'all_officers', zoneIds: [], roles: [], publishAt: null, expiresAt: null, status: 'draft', createdBy: 'Hemesh Kumar', createdAt: ms('2026-10-30T12:00:00+05:30') },
  { id: 'ann-04', title: 'Foundation Day greetings', body: 'Thank you for being part of Maatram.', audience: 'all_users', zoneIds: [], roles: [], publishAt: ms('2026-10-15T09:00:00+05:30'), expiresAt: ms('2026-10-20T00:00:00+05:30'), status: 'expired', createdBy: 'Hemesh Kumar', createdAt: ms('2026-10-14T12:00:00+05:30') },
];
export const imports = [
  { id: 'imp-1', fileName: 'students_zoneA_batch1.csv', uploadedAt: ms('2026-10-28T11:00:00+05:30'), by: 'Hemesh Kumar', rows: 120, valid: 118, invalid: 2, status: 'Previewed (mock – nothing written)' },
  { id: 'imp-2', fileName: 'students_zoneB.csv', uploadedAt: ms('2026-10-12T15:00:00+05:30'), by: 'Hemesh Kumar', rows: 90, valid: 90, invalid: 0, status: 'Previewed (mock – nothing written)' },
  { id: 'imp-3', fileName: 'institutions_zoneC.csv', uploadedAt: ms('2026-10-05T10:00:00+05:30'), by: 'Hemesh Kumar', rows: 6, valid: 3, invalid: 3, status: 'Failed validation' },
];
export const initialRoles = JSON.parse(JSON.stringify(defaultRolePermissions));
export const initialSettings = JSON.parse(JSON.stringify(defaultSettings));
