import { getState } from './store';
import { zoneInstitutions, zoneStudents, scopedInstitution, zoneInvitations, zoneEvents } from './zoneScopeService';
import { defaultWeek, matrix, weekOptions, weekStats } from './availabilityService';

const rate = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const instStats = (oid, inst, ws) => {
  const studs = zoneStudents(oid).filter((s) => s.institutionId === inst.id);
  const ids = new Set(studs.map((s) => s.id));
  const invs = zoneInvitations(oid).filter((i) => ids.has(i.studentId));
  const w = weekStats(matrix(oid, ws, { institutionId: inst.id }).rows);
  const accepted = invs.filter((i) => i.response === 'accepted').length;
  const attended = invs.filter((i) => i.attendance === 'present').length;
  return { totalStudents: studs.length, submissionRate: w.submissionRate, invited: invs.length, accepted, attended, participationRate: rate(accepted, invs.length), attendanceRate: rate(attended, accepted) };
};

export const listInstitutions = (oid, { q = '', status = '', sort = 'name' } = {}) => {
  const ws = defaultWeek(); const needle = q.trim().toLowerCase();
  const rows = zoneInstitutions(oid).filter((i) => (!needle || i.name.toLowerCase().includes(needle) || i.code.toLowerCase().includes(needle) || i.location.toLowerCase().includes(needle)) && (!status || i.status === status))
    .map((i) => ({ ...i, ...instStats(oid, i, ws) }));
  rows.sort((a, b) => (sort === 'students' ? b.totalStudents - a.totalStudents : a.name.localeCompare(b.name)));
  return rows;
};

export const getInstitutionDetail = (oid, id) => {
  const inst = scopedInstitution(oid, id); if (!inst) return null;
  const studs = zoneStudents(oid).filter((s) => s.institutionId === id);
  const count = (key) => Object.entries(studs.reduce((m, s) => ({ ...m, [s[key]]: (m[s[key]] ?? 0) + 1 }), {})).map(([name, value]) => ({ name: key === 'year' ? `Year ${name}` : name, value })).sort((a, b) => a.name.localeCompare(b.name));
  const weekly = weekOptions().map((ws) => ({ weekStart: ws, ...weekStats(matrix(oid, ws, { institutionId: id }).rows) }));
  const events = zoneEvents(oid).filter((e) => e.targetInstitutionIds.includes(id)).sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
    const ids = new Set(studs.map((s) => s.id));
    const invs = getState().invitations.filter((i) => i.eventId === e.id && ids.has(i.studentId));
    return { event: e, invited: invs.length, accepted: invs.filter((i) => i.response === 'accepted').length, attended: invs.filter((i) => i.attendance === 'present').length };
  });
  return { institution: inst, ...instStats(oid, inst, defaultWeek()), departments: count('department'), years: count('year'), weekly, events };
};
