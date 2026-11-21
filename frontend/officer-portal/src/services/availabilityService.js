import { now } from './store';
import { getState } from './store';
import { appConfig } from '../config/appConfig';
import { addWeeks, deadlineFor, todayIST, weekDays, weekStartOf } from '../utils/dates';
import { zoneStudents, zoneIdOf, instName, logActivity, zoneInstitutions } from './zoneScopeService';
import { buildFile } from '../utils/exportFiles';

// Day/week states are intentionally distinct (see spec §11).
export const states = ['available', 'unavailable', 'not_selected', 'draft', 'not_submitted', 'system_assumed_unavailable'];

export const weekInfo = (ws, nowMs = now()) => { const deadline = deadlineFor(ws); const open = nowMs < deadline; return { weekStart: ws, deadline, open, locked: !open }; };
export const defaultWeek = (nowMs = now()) => { let ws = weekStartOf(todayIST(nowMs)); for (let i = 0; i < 4 && deadlineFor(ws) <= nowMs; i++) ws = addWeeks(ws, 1); return ws; };
export const weekOptions = (nowMs = now()) => { const cur = weekStartOf(todayIST(nowMs)); return Array.from({ length: appConfig.weeksBack + appConfig.weeksAhead + 1 }, (_, i) => addWeeks(cur, i - appConfig.weeksBack)); };

const missing = (info) => (info.open ? 'not_submitted' : appConfig.systemAssumedUnavailable ? 'system_assumed_unavailable' : 'not_submitted');
export const weekStatusFor = (rec, info) => (rec?.status === 'submitted' ? 'submitted' : rec?.status === 'draft' && info.open ? 'draft' : missing(info));
export const dayStateFor = (rec, info, date) => {
  if (rec?.status === 'submitted') { const v = rec.days[date] ?? 'none'; return v === 'none' ? 'not_selected' : v; }
  if (rec?.status === 'draft' && info.open) return 'draft';
  return missing(info);
};

/** Student × day matrix for a week, zone-scoped, with optional filters. */
export const matrix = (oid, ws, { institutionId, department, year } = {}, nowMs = now()) => {
  const info = weekInfo(ws, nowMs); const days = weekDays(ws);
  const rows = zoneStudents(oid)
    .filter((s) => (!institutionId || s.institutionId === institutionId) && (!department || s.department === department) && (!year || s.year === Number(year)))
    .map((s) => { const rec = getState().availability[s.id]?.[ws] ?? null; return { student: s, weekStatus: weekStatusFor(rec, info), days: Object.fromEntries(days.map((d) => [d, dayStateFor(rec, info, d)])), lastSubmittedAt: rec?.submittedAt ?? null }; });
  return { info, days, rows };
};

const zero = () => Object.fromEntries(states.map((k) => [k, 0]));
export const dayStats = (rows, date) => {
  const c = zero(); rows.forEach((r) => { c[r.days[date]] += 1; });
  const total = rows.length; const noValid = c.draft + c.not_submitted + c.system_assumed_unavailable;
  const responders = c.available + c.unavailable + c.not_selected;
  return { date, total, ...c, noValid, availablePct: total ? Math.round((c.available / total) * 100) : 0, availableOfRespondersPct: responders ? Math.round((c.available / responders) * 100) : 0 };
};
export const weekStats = (rows) => {
  const c = { submitted: 0, draft: 0, not_submitted: 0, system_assumed_unavailable: 0 };
  rows.forEach((r) => { c[r.weekStatus] += 1; });
  return { total: rows.length, ...c, submissionRate: rows.length ? Math.round((c.submitted / rows.length) * 100) : 0 };
};
/** Best dates: ranked by Available count. Denominator = ALL eligible students (non-submitters count as not available). */
export const bestDates = (rows, days) => days.map((d) => dayStats(rows, d)).sort((a, b) => b.available - a.available || a.date.localeCompare(b.date));
export const BEST_DATE_NOTE = 'Availability % = students marked Available ÷ all eligible students in the selected group. Students who have not submitted (or only have a draft) stay in the denominator and are not counted as available. This is guidance only – it does not guarantee attendance.';

export const compare = (oid, ws, by = 'institution', filters = {}) => {
  const { rows } = matrix(oid, ws, filters);
  const key = (r) => (by === 'year' ? `Year ${r.student.year}` : instName(r.student.institutionId));
  const groups = new Map();
  rows.forEach((r) => { const k = key(r); (groups.get(k) ?? groups.set(k, []).get(k)).push(r); });
  return [...groups.entries()].map(([name, rs]) => {
    const w = weekStats(rs); const sat = rs.map((r) => r.days[weekDays(ws)[5]]);
    return { name, total: rs.length, submitted: w.submitted, submissionRate: w.submissionRate, available: rs.reduce((n, r) => n + Object.values(r.days).filter((v) => v === 'available').length, 0), satAvailable: sat.filter((v) => v === 'available').length };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

/** Submission-rate trend over the selectable weeks. */
export const trend = (oid, filters = {}, nowMs = now()) => weekOptions(nowMs).map((ws) => { const { rows, info } = matrix(oid, ws, filters, nowMs); return { weekStart: ws, open: info.open, ...weekStats(rows) }; });

export const exportRows = (oid, ws, filters = {}) => {
  const { rows, days } = matrix(oid, ws, filters);
  return rows.map((r) => ({ 'Student ID': r.student.studentId, Student: r.student.name, Institution: instName(r.student.institutionId), Department: r.student.department, Year: r.student.year, 'Week status': r.weekStatus, ...Object.fromEntries(days.map((d) => [d, r.days[d]])), 'Last submitted': r.lastSubmittedAt ? new Date(r.lastSubmittedAt).toISOString() : '' }));
};
export const exportAvailability = (oid, ws, filters, format) => {
  if (!appConfig.permissions.canExport) throw new Error('Export is not permitted for this account.');
  const rows = exportRows(oid, ws, filters);
  logActivity(oid, { type: 'report_exported', description: `Exported availability for week of ${ws} (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id: 'availability', label: 'Weekly availability' } });
  return buildFile(rows, format, `availability-${zoneIdOf(oid)}-${ws}`);
};
export const departments = (oid) => [...new Set(zoneStudents(oid).map((s) => s.department))].sort();
export const institutionOptions = (oid) => zoneInstitutions(oid).map((i) => ({ id: i.id, name: i.name }));
