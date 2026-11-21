import { appConfig, eventCategories, eventStatuses } from '../config/appConfig';
import { zoneEvents, zoneInstitutions, zoneInvitations, zoneStudents, zoneIdOf, instName, logActivity } from './zoneScopeService';
import { matrix, weekOptions, weekStats, dayStats } from './availabilityService';
import { eventStats } from './eventService';
import { buildFile } from '../utils/exportFiles';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const inRange = (d, f) => (!f.from || d >= f.from) && (!f.to || d <= f.to);

export const weeklyAvailabilityReport = (oid, f = {}) => {
  const out = [];
  weekOptions().filter((ws) => (!f.from || addDaysStr(ws, 6) >= f.from) && (!f.to || ws <= f.to)).forEach((ws) => {
    const { rows, days, info } = matrix(oid, ws, { institutionId: f.institutionId, department: f.department, year: f.year });
    const groups = new Map(); rows.forEach((r) => { const k = r.student.institutionId; (groups.get(k) ?? groups.set(k, []).get(k)).push(r); });
    groups.forEach((rs, k) => { const w = weekStats(rs); const sat = dayStats(rs, days[5]);
      out.push({ Week: ws, Institution: instName(k), 'Locked': info.locked ? 'Yes' : 'No', 'Eligible students': rs.length, 'Submitted': w.submitted, 'Not submitted (incl. draft/assumed)': w.not_submitted + w.draft + w.system_assumed_unavailable, 'Saturday – Available': sat.available, 'Saturday – Unavailable': sat.unavailable, 'Saturday – No valid answer': sat.noValid + sat.not_selected, 'Submission rate %': w.submissionRate }); });
  });
  return out;
};
const addDaysStr = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const evtFilter = (oid, f) => zoneEvents(oid).filter((e) => inRange(e.date, f) && (!f.category || e.category === f.category) && (!f.status || e.status === f.status) && (!f.institutionId || e.targetInstitutionIds.includes(f.institutionId)));
export const eventReport = (oid, f = {}) => evtFilter(oid, f).sort((a, b) => a.date.localeCompare(b.date)).map((e) => { const s = eventStats(oid, e); return { Event: e.title, Category: eventCategories[e.category], Status: eventStatuses[e.status], Date: e.date, Invitations: s.invited, Accepted: s.accepted, Declined: s.declined, Pending: s.pending, Waitlisted: s.waitlisted, Present: s.present, Absent: s.absent, Excused: s.excused, 'Attendance % (of accepted)': pct(s.present, s.accepted) }; });

const studentFilter = (oid, f) => zoneStudents(oid).filter((s) => (!f.institutionId || s.institutionId === f.institutionId) && (!f.department || s.department === f.department) && (!f.year || s.year === Number(f.year)));
const invsFor = (oid, f) => { const ev = new Map(evtFilter(oid, f).map((e) => [e.id, e])); return zoneInvitations(oid).filter((i) => ev.has(i.eventId)).map((i) => ({ ...i, event: ev.get(i.eventId) })); };

export const institutionReport = (oid, f = {}) => {
  const invs = invsFor(oid, f); const cur = weekOptions()[weekOptions().length - 3];
  return zoneInstitutions(oid).filter((i) => !f.institutionId || i.id === f.institutionId).map((i) => {
    const studs = studentFilter(oid, f).filter((s) => s.institutionId === i.id); const ids = new Set(studs.map((s) => s.id));
    const mine = invs.filter((v) => ids.has(v.studentId)); const acc = mine.filter((v) => v.response === 'accepted').length; const att = mine.filter((v) => v.attendance === 'present').length;
    const w = weekStats(matrix(oid, cur, { institutionId: i.id, department: f.department, year: f.year }).rows);
    return { Institution: i.name, Code: i.code, Students: studs.length, 'Latest-week submission rate %': w.submissionRate, Invitations: mine.length, Accepted: acc, 'Participation % (accepted ÷ invited)': pct(acc, mine.length), Present: att, 'Attendance % (present ÷ accepted)': pct(att, acc) };
  });
};

export const participationReport = (oid, f = {}) => {
  const invs = invsFor(oid, f);
  const students = studentFilter(oid, f).map((s) => { const m = invs.filter((i) => i.studentId === s.id); const acc = m.filter((i) => i.response === 'accepted').length; return { 'Student ID': s.studentId, Student: s.name, Institution: instName(s.institutionId), Department: s.department, Year: s.year, Invited: m.length, Accepted: acc, Present: m.filter((i) => i.attendance === 'present').length }; });
  const byEvent = evtFilter(oid, f).map((e) => { const s = eventStats(oid, e); return { name: e.title.length > 22 ? `${e.title.slice(0, 20)}…` : e.title, date: e.date, accepted: s.accepted, attended: s.present, invited: s.invited }; }).sort((a, b) => a.date.localeCompare(b.date));
  const byInstitution = zoneInstitutions(oid).map((i) => { const ids = new Set(zoneStudents(oid).filter((s) => s.institutionId === i.id).map((s) => s.id)); const m = invs.filter((v) => ids.has(v.studentId)); return { name: i.code, accepted: m.filter((v) => v.response === 'accepted').length, attended: m.filter((v) => v.attendance === 'present').length }; });
  return { students, byEvent, byInstitution };
};

export const reportRows = (oid, type, f) => ({ availability: () => weeklyAvailabilityReport(oid, f), events: () => eventReport(oid, f), institutions: () => institutionReport(oid, f), participation: () => participationReport(oid, f).students })[type]();
export const exportReport = (oid, type, f, format) => {
  if (!appConfig.permissions.canExport) throw new Error('Export is not permitted for this account.');
  const rows = reportRows(oid, type, f);
  logActivity(oid, { type: 'report_exported', description: `Exported ${type} report (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id: type, label: `${type} report` } });
  return buildFile(rows, format, `${type}-report-${zoneIdOf(oid)}`);
};
