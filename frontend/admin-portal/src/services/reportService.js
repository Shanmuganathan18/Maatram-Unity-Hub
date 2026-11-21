import { getState } from './store';
import { need, audit, can } from './accessService';
import { eventCategories, eventStatuses } from '../config/appConfig';
import * as m from './metrics';
import { buildFile } from '../utils/exportFiles';

const inRange = (d, f) => (!f.from || d >= f.from) && (!f.to || d <= f.to);
const evs = (f) => m.filterEvents({ zoneId: f.zoneId, institutionId: f.institutionId, category: f.category, status: f.status, from: f.from, to: f.to });
const studs = (f) => m.filterStudents({ zoneId: f.zoneId, institutionId: f.institutionId, department: f.department, year: f.year });

export const zonesReport = (f = {}) => getState().zones.filter((z) => !f.zoneId || z.id === f.zoneId).map((z) => { const x = m.zoneMetrics(z.id); return { Zone: `${z.name} • ${z.region}`, Code: z.code, Status: z.status, Officers: x.officers, Institutions: x.institutions, Students: x.students, 'Submission rate %': x.submissionRate, Events: x.events, 'Participation % (accepted ÷ invited)': x.participationRate, 'Attendance % (present ÷ accepted)': x.attendanceRate }; });
export const studentsReport = (aid, f = {}) => { const withPII = can(aid, 'students.export'); return studs(f).map((s) => ({ 'Student ID': s.studentId, Name: s.name, Zone: m.zoneShort(s.zoneId), Institution: m.instName(s.institutionId), Department: s.department, Year: s.year, Status: s.status, ...(withPII ? { Email: s.email, Phone: s.phone } : {}) })); };
export const availabilityReport = (f = {}) => {
  const out = []; m.weekOptions().filter((ws) => (!f.to || ws <= f.to)).forEach((ws) => { const { rows, days } = m.matrix(ws, { zoneId: f.zoneId, institutionId: f.institutionId, department: f.department, year: f.year });
    m.groupRows(rows, 'institution').forEach((g) => { const w = m.weekStats(g.rows); const s = m.dayStats(g.rows, days[5]); out.push({ Week: ws, Zone: m.zoneShort(g.rows[0].student.zoneId), Institution: g.name, Students: g.rows.length, Submitted: w.submitted, 'Not submitted (incl. draft/assumed)': w.missing, 'Saturday – Available': s.available, 'Saturday – Unavailable': s.unavailable, 'Saturday – no valid answer': s.noValid + s.not_selected, 'Submission rate %': w.submissionRate }); }); }); return out;
};
export const eventsReport = (f = {}) => evs(f).sort((a, b) => a.date.localeCompare(b.date)).map((e) => { const s = m.eventStats(e); return { Event: e.title, Category: eventCategories[e.category], Status: eventStatuses[e.status], Zone: m.zoneShort(e.zoneId), Officer: m.officerName(e.createdBy), Date: e.date, Invitations: s.invited, Accepted: s.accepted, Declined: s.declined, Pending: s.pending, 'Response rate %': s.responseRate, Present: s.present, 'Attendance % (of accepted)': s.attendanceRate }; });
export const institutionsReport = (f = {}) => getState().institutions.filter((i) => (!f.zoneId || i.zoneId === f.zoneId) && (!f.institutionId || i.id === f.institutionId)).map((i) => { const x = m.institutionMetrics(i.id); return { Institution: i.name, Code: i.code, Zone: i.zoneId ? m.zoneShort(i.zoneId) : 'Unassigned', Status: i.status, Students: x.students, 'Latest-week submission %': x.submissionRate, Accepted: x.accepted, 'Participation %': x.participationRate, 'Attendance %': x.attendanceRate }; });
/** Operational indicators only – NOT a performance ranking (activity depends on zone size, events and availability of students). */
export const officersReport = (f = {}) => getState().officers.filter((o) => !f.zoneId || o.zoneId === f.zoneId).map((o) => { const mine = m.filterEvents({ officerId: o.id, from: f.from, to: f.to, category: f.category }); const done = mine.filter((e) => e.status === 'completed').length; return { Officer: o.name, 'Officer ID': o.officerId, Zone: o.zoneId ? m.zoneShort(o.zoneId) : 'Unassigned', Status: o.status, 'Events managed': mine.length, 'Events completed': done, 'Events cancelled': mine.filter((e) => e.status === 'cancelled').length, 'Audit actions recorded': getState().auditLogs.filter((a) => a.actorId === o.id && inRange(new Date(a.at).toISOString().slice(0, 10), f)).length, 'Zone submission rate % (context)': o.zoneId ? m.zoneMetrics(o.zoneId).submissionRate : '' }; });

export const reportRows = (aid, type, f = {}) => { need(aid, 'reports.view'); return { zones: () => zonesReport(f), students: () => studentsReport(aid, f), availability: () => availabilityReport(f), events: () => eventsReport(f), institutions: () => institutionsReport(f), officers: () => officersReport(f) }[type](); };
/** Extra breakdowns used by charts on the student report. */
export const studentBreakdowns = (f = {}) => { const s = studs(f); const count = (fn) => Object.entries(s.reduce((a, x) => { const k = fn(x); a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)); return { byZone: count((x) => m.zoneShort(x.zoneId)), byDepartment: count((x) => x.department), byYear: count((x) => `Year ${x.year}`), byStatus: count((x) => x.status) }; };
export const exportReport = (aid, type, f, format) => {
  need(aid, 'reports.export'); const rows = reportRows(aid, type, f);
  audit(aid, { action: 'report.exported', category: 'Report', description: `Exported ${type} report (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id: type, label: `${type} report` } });
  return buildFile(rows, format, `${type}-report`);
};
