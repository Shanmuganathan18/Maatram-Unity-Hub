// Pure calculations over the store (no permission checks – public services guard access before calling these).
import { getState, now } from './store';
import { addWeeks, deadlineFor as _d, instantAt, addDays, todayIST, weekDays, weekStartOf } from '../utils/dates';
import { appConfig } from '../config/appConfig';

export const settings = () => getState().settings;
export const zoneName = (id) => { const z = getState().zones.find((x) => x.id === id); return z ? `${z.name} • ${z.region}` : 'Unassigned'; };
export const zoneShort = (id) => getState().zones.find((x) => x.id === id)?.name ?? 'Unassigned';
export const instName = (id) => getState().institutions.find((i) => i.id === id)?.name ?? '—';
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ---- availability (deadline & assumed-unavailable rule come from System Settings) ----
export const deadlineFor = (ws) => { const a = settings().availability; return instantAt(addDays(ws, a.deadlineDay - 1 + a.deadlineWeekOffset * 7), `${String(a.deadlineHour).padStart(2, '0')}:${String(a.deadlineMinute).padStart(2, '0')}`); };
export const weekInfo = (ws, nowMs = now()) => { const deadline = deadlineFor(ws); return { weekStart: ws, deadline, open: nowMs < deadline, locked: nowMs >= deadline }; };
export const defaultWeek = (nowMs = now()) => { let ws = weekStartOf(todayIST(nowMs)); for (let i = 0; i < 4 && deadlineFor(ws) <= nowMs; i++) ws = addWeeks(ws, 1); return ws; };
export const weekOptions = (nowMs = now()) => { const cur = weekStartOf(todayIST(nowMs)); return Array.from({ length: appConfig.weeksBack + appConfig.weeksAhead + 1 }, (_, i) => addWeeks(cur, i - appConfig.weeksBack)); };
export const states = ['available', 'unavailable', 'not_selected', 'draft', 'not_submitted', 'system_assumed_unavailable'];

const missing = (info) => (info.open ? 'not_submitted' : settings().availability.systemAssumedUnavailable ? 'system_assumed_unavailable' : 'not_submitted');
const weekStatusFor = (rec, info) => (rec?.status === 'submitted' ? 'submitted' : rec?.status === 'draft' && info.open ? 'draft' : missing(info));
const dayStateFor = (rec, info, d) => { if (rec?.status === 'submitted') { const v = rec.days[d] ?? 'none'; return v === 'none' ? 'not_selected' : v; } if (rec?.status === 'draft' && info.open) return 'draft'; return missing(info); };

export const filterStudents = ({ zoneId, institutionId, department, year, status } = {}) => getState().students.filter((s) => (!zoneId || s.zoneId === zoneId) && (!institutionId || s.institutionId === institutionId) && (!department || s.department === department) && (!year || s.year === Number(year)) && (!status || s.status === status));

export const matrix = (ws, filters = {}, nowMs = now()) => {
  const info = weekInfo(ws, nowMs); const days = weekDays(ws);
  const rows = filterStudents(filters).map((s) => { const rec = getState().availability[s.id]?.[ws] ?? null; return { student: s, weekStatus: weekStatusFor(rec, info), days: Object.fromEntries(days.map((d) => [d, dayStateFor(rec, info, d)])), lastSubmittedAt: rec?.submittedAt ?? null }; });
  return { info, days, rows };
};
const zero = () => Object.fromEntries(states.map((k) => [k, 0]));
export const dayStats = (rows, date) => {
  const c = zero(); rows.forEach((r) => { c[r.days[date]] += 1; }); const total = rows.length; const noValid = c.draft + c.not_submitted + c.system_assumed_unavailable; const answered = c.available + c.unavailable + c.not_selected;
  return { date, total, ...c, noValid, availablePct: pct(c.available, total), availableOfAnsweredPct: pct(c.available, answered) };
};
export const weekStats = (rows) => { const c = { submitted: 0, draft: 0, not_submitted: 0, system_assumed_unavailable: 0 }; rows.forEach((r) => { c[r.weekStatus] += 1; }); return { total: rows.length, ...c, missing: c.draft + c.not_submitted + c.system_assumed_unavailable, submissionRate: pct(c.submitted, rows.length) }; };
export const bestDates = (rows, days) => days.map((d) => dayStats(rows, d)).sort((a, b) => b.available - a.available || a.date.localeCompare(b.date));
export const BEST_DATE_NOTE = 'Availability % = students marked Available ÷ ALL students in the selected scope. Students who have not submitted (or only hold a draft) stay in the denominator and are not counted as available. This is guidance only – availability is not a confirmed attendance.';
export const trend = (filters = {}, nowMs = now()) => weekOptions(nowMs).map((ws) => { const { rows, info } = matrix(ws, filters, nowMs); return { weekStart: ws, open: info.open, ...weekStats(rows) }; });

/** group rows by zone | institution | year */
export const groupRows = (rows, by) => {
  const key = (r) => (by === 'zone' ? r.student.zoneId ?? 'none' : by === 'year' ? `Y${r.student.year}` : r.student.institutionId);
  const label = (k) => (by === 'zone' ? zoneShort(k === 'none' ? null : k) : by === 'year' ? `Year ${k.slice(1)}` : instName(k));
  const m = new Map(); rows.forEach((r) => { const k = key(r); (m.get(k) ?? m.set(k, []).get(k)).push(r); });
  return [...m.entries()].map(([k, rs]) => ({ key: k, name: label(k), rows: rs }));
};

// ---- events / participation ----
export const invitationsOf = (eventId) => getState().invitations.filter((i) => i.eventId === eventId);
export const eventStats = (e) => {
  const inv = invitationsOf(e.id); const n = (r) => inv.filter((i) => i.response === r).length; const accepted = n('accepted');
  const responded = inv.length - n('pending');
  return { invited: inv.length, accepted, declined: n('declined'), pending: n('pending'), withdrawn: n('withdrawn'), waitlisted: n('waitlisted'), present: inv.filter((i) => i.attendance === 'present').length, absent: inv.filter((i) => i.attendance === 'absent').length, excused: inv.filter((i) => i.attendance === 'excused').length, responseRate: pct(responded, inv.length), attendanceRate: pct(inv.filter((i) => i.attendance === 'present').length, accepted) };
};
export const filterEvents = ({ zoneId, officerId, institutionId, category, status, from, to, q } = {}) => getState().events.filter((e) => (!zoneId || e.zoneId === zoneId) && (!officerId || e.createdBy === officerId) && (!institutionId || e.targetInstitutionIds.includes(institutionId)) && (!category || e.category === category) && (!status || e.status === status) && (!from || e.date >= from) && (!to || e.date <= to) && (!q || e.title.toLowerCase().includes(q.toLowerCase())));
export const officerName = (id) => getState().officers.find((o) => o.id === id)?.name ?? '—';
export const sumStats = (events) => events.reduce((a, e) => { const s = eventStats(e); ['invited', 'accepted', 'declined', 'pending', 'present', 'absent', 'excused'].forEach((k) => { a[k] += s[k]; }); return a; }, { invited: 0, accepted: 0, declined: 0, pending: 0, present: 0, absent: 0, excused: 0 });

export const zoneMetrics = (zoneId, nowMs = now()) => {
  const st = getState(); const ws = defaultWeek(nowMs); const { rows } = matrix(ws, { zoneId }, nowMs); const w = weekStats(rows);
  const evs = st.events.filter((e) => e.zoneId === zoneId); const live = evs.filter((e) => !['draft', 'cancelled'].includes(e.status)); const t = sumStats(live);
  return { students: rows.length, institutions: st.institutions.filter((i) => i.zoneId === zoneId).length, officers: st.officers.filter((o) => o.zoneId === zoneId).length, submitted: w.submitted, submissionRate: w.submissionRate, events: evs.length, participation: t.accepted, participationRate: pct(t.accepted, t.invited), attendanceRate: pct(t.present, t.accepted), week: w };
};
export const institutionMetrics = (id, nowMs = now()) => {
  const ws = defaultWeek(nowMs); const { rows } = matrix(ws, { institutionId: id }, nowMs); const ids = new Set(rows.map((r) => r.student.id));
  const inv = getState().invitations.filter((i) => ids.has(i.studentId)); const acc = inv.filter((i) => i.response === 'accepted').length; const pr = inv.filter((i) => i.attendance === 'present').length;
  return { students: rows.length, submissionRate: weekStats(rows).submissionRate, invited: inv.length, accepted: acc, participationRate: pct(acc, inv.length), attendanceRate: pct(pr, acc), present: pr };
};
