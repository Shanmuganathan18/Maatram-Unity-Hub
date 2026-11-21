import { getState } from './store';
import { zoneStudents, zoneInvitations, scopedStudent, instName, zoneInstitutions } from './zoneScopeService';
import { defaultWeek, weekInfo, weekOptions, weekStatusFor, dayStateFor } from './availabilityService';
import { weekDays } from '../utils/dates';

const invsOf = (oid) => { const m = new Map(); zoneInvitations(oid).forEach((i) => { (m.get(i.studentId) ?? m.set(i.studentId, []).get(i.studentId)).push(i); }); return m; };
export const participationOf = (list = []) => {
  const invited = list.length, accepted = list.filter((i) => i.response === 'accepted').length, attended = list.filter((i) => i.attendance === 'present').length;
  return { invited, accepted, attended, label: attended ? 'Attended' : accepted ? 'Confirmed' : invited ? 'Invited' : 'Not invited' };
};

export const listStudents = (oid, { q = '', institutionId = '', department = '', year = '', availability = '', sortKey = 'name', sortDir = 'asc', page = 1, pageSize = 10 } = {}) => {
  const ws = defaultWeek(); const info = weekInfo(ws); const invs = invsOf(oid);
  let rows = zoneStudents(oid).map((s) => ({ ...s, institution: instName(s.institutionId), availabilityStatus: weekStatusFor(getState().availability[s.id]?.[ws], info), participation: participationOf(invs.get(s.id)) }));
  const needle = q.trim().toLowerCase();
  rows = rows.filter((s) => (!needle || s.name.toLowerCase().includes(needle) || s.studentId.toLowerCase().includes(needle)) && (!institutionId || s.institutionId === institutionId) && (!department || s.department === department) && (!year || s.year === Number(year)) && (!availability || s.availabilityStatus === availability));
  const dir = sortDir === 'desc' ? -1 : 1;
  const get = { name: (s) => s.name, institution: (s) => s.institution, year: (s) => s.year, id: (s) => s.studentId }[sortKey] ?? ((s) => s.name);
  rows.sort((a, b) => { const x = get(a), y = get(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir || a.name.localeCompare(b.name); });
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / pageSize)); const p = Math.min(page, pages);
  return { rows: rows.slice((p - 1) * pageSize, p * pageSize), total, page: p, pages, weekStart: ws };
};

export const studentFilterOptions = (oid) => ({ institutions: zoneInstitutions(oid).map((i) => ({ id: i.id, name: i.name })), departments: [...new Set(zoneStudents(oid).map((s) => s.department))].sort(), years: [1, 2, 3, 4] });

/** Returns null when the student does not exist in the officer's zone (same as not found). */
export const getStudentDetail = (oid, id) => {
  const s = scopedStudent(oid, id); if (!s) return null;
  const st = getState();
  const weeks = weekOptions().slice().reverse().map((ws) => {
    const info = weekInfo(ws); const rec = st.availability[s.id]?.[ws] ?? null;
    const dayStates = weekDays(ws).map((d) => dayStateFor(rec, info, d));
    return { weekStart: ws, status: weekStatusFor(rec, info), locked: info.locked, available: dayStates.filter((x) => x === 'available').length, unavailable: dayStates.filter((x) => x === 'unavailable').length, submittedAt: rec?.submittedAt ?? null, days: weekDays(ws).map((d, i) => ({ date: d, state: dayStates[i] })) };
  });
  const invitations = st.invitations.filter((i) => i.studentId === s.id).map((i) => ({ ...i, event: st.events.find((e) => e.id === i.eventId) })).filter((i) => i.event?.zoneId === s.zoneId).sort((a, b) => b.event.date.localeCompare(a.event.date));
  return { student: { ...s, institution: instName(s.institutionId) }, weeks, invitations, participation: participationOf(invitations) };
};
