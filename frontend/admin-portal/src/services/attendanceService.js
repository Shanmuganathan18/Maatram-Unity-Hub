import { getState, mutate, delay, now } from './store';
import { need, audit } from './accessService';
import { filterEvents, instName, zoneName, zoneShort, pct } from './metrics';

/** Attendance recorded by officers. Admin sees it read-only unless attendance.override is granted (unconfirmed → off). */
export const overview = (aid, f = {}) => {
  need(aid, 'attendance.view'); const st = getState(); const studs = new Map(st.students.map((s) => [s.id, s]));
  const rows = filterEvents({ zoneId: f.zoneId, category: f.category, from: f.from, to: f.to, institutionId: f.institutionId }).filter((e) => !['draft', 'cancelled'].includes(e.status)).map((e) => {
    const acc = st.invitations.filter((i) => i.eventId === e.id && i.response === 'accepted' && (!f.institutionId || studs.get(i.studentId)?.institutionId === f.institutionId));
    const c = (s) => acc.filter((i) => i.attendance === s).length;
    return { event: e, zoneLabel: zoneName(e.zoneId), confirmed: acc.length, present: c('present'), absent: c('absent'), excused: c('excused'), notMarked: acc.filter((i) => !i.attendance).length, pct: pct(c('present'), acc.length) };
  }).filter((r) => r.confirmed > 0 && (!f.status || (f.status === 'not_marked' ? r.notMarked : r[f.status]) > 0));
  const group = (keyFn, nameFn) => { const m = new Map(); rows.forEach((r) => { const k = keyFn(r); const g = m.get(k) ?? { name: nameFn(k), confirmed: 0, present: 0, absent: 0, excused: 0 }; g.confirmed += r.confirmed; g.present += r.present; g.absent += r.absent; g.excused += r.excused; m.set(k, g); }); return [...m.values()].map((g) => ({ ...g, pct: pct(g.present, g.confirmed) })); };
  const byZone = group((r) => r.event.zoneId, (k) => zoneShort(k));
  const instMap = new Map(); st.invitations.filter((i) => i.response === 'accepted' && rows.some((r) => r.event.id === i.eventId)).forEach((i) => { const s = studs.get(i.studentId); if (!s || (f.institutionId && s.institutionId !== f.institutionId)) return; const g = instMap.get(s.institutionId) ?? { name: instName(s.institutionId), confirmed: 0, present: 0, absent: 0, excused: 0 }; g.confirmed++; if (i.attendance) g[i.attendance]++; instMap.set(s.institutionId, g); });
  const total = rows.reduce((a, r) => ({ confirmed: a.confirmed + r.confirmed, present: a.present + r.present, absent: a.absent + r.absent, excused: a.excused + r.excused }), { confirmed: 0, present: 0, absent: 0, excused: 0 });
  return { rows, byZone, byInstitution: [...instMap.values()].map((g) => ({ ...g, pct: pct(g.present, g.confirmed) })).sort((a, b) => a.name.localeCompare(b.name)), total: { ...total, pct: pct(total.present, total.confirmed) } };
};
export const participants = (aid, eventId) => { need(aid, 'attendance.view'); const st = getState(); const studs = new Map(st.students.map((s) => [s.id, s])); return st.invitations.filter((i) => i.eventId === eventId && i.response === 'accepted').map((i) => ({ ...i, student: studs.get(i.studentId), institution: instName(studs.get(i.studentId)?.institutionId) })).sort((a, b) => a.student.name.localeCompare(b.student.name)); };
export const overrideAttendance = async (aid, invId, status) => {
  need(aid, 'attendance.override'); await delay(300); const inv = getState().invitations.find((i) => i.id === invId); if (!inv) throw new Error('Record not found.');
  if (status && !['present', 'absent', 'excused'].includes(status)) throw new Error('Invalid status.');
  mutate((s) => { const x = s.invitations.find((i) => i.id === invId); x.attendance = status || null; x.attendanceAt = now(); });
  const e = getState().events.find((x) => x.id === inv.eventId); audit(aid, { action: 'attendance.overridden', category: 'Attendance', description: `Admin override: attendance set to ${status || 'not marked'}`, zoneId: e.zoneId, related: { type: 'event', id: e.id, label: e.title } });
};
