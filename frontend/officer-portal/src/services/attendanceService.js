import { mutate, delay, now } from './store';
import { appConfig } from '../config/appConfig';
import { scopedEvent, zoneInvitations, zoneStudents, instName, logActivity, AccessError } from './zoneScopeService';

export const attendanceOpen = (e) => ['in_progress', 'completed'].includes(e.status);

export const listParticipants = (oid, eventId, { q = '', institutionId = '', status = '' } = {}) => {
  const e = scopedEvent(oid, eventId); if (!e) return null;
  const studs = new Map(zoneStudents(oid).map((s) => [s.id, s])); const needle = q.trim().toLowerCase();
  // Only students who ACCEPTED are participants – acceptance is not attendance.
  return zoneInvitations(oid).filter((i) => i.eventId === eventId && i.response === 'accepted').map((i) => ({ ...i, student: studs.get(i.studentId), institution: instName(studs.get(i.studentId)?.institutionId) }))
    .filter((r) => r.student && (!institutionId || r.student.institutionId === institutionId) && (!status || (status === 'not_marked' ? !r.attendance : r.attendance === status)) && (!needle || r.student.name.toLowerCase().includes(needle) || r.student.studentId.toLowerCase().includes(needle)))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
};
export const attendanceSummary = (oid, eventId) => {
  const all = listParticipants(oid, eventId) ?? []; const c = (s) => all.filter((r) => r.attendance === s).length;
  const present = c('present');
  return { confirmed: all.length, present, absent: c('absent'), excused: c('excused'), notMarked: all.filter((r) => !r.attendance).length, pct: all.length ? Math.round((present / all.length) * 100) : 0 };
};
export const markAttendance = async (oid, eventId, invitationIds, status) => {
  await delay(300);
  const e = scopedEvent(oid, eventId); if (!e) throw new AccessError('Event not found.');
  if (!appConfig.permissions.canUpdateAttendance) throw new AccessError('Updating attendance is not permitted for this account.');
  if (!attendanceOpen(e)) throw new Error('Attendance can be recorded only while the event is In Progress or Completed.');
  if (status && !appConfig.attendanceStatuses.some((s) => s.id === status)) throw new Error('Invalid attendance status.');
  const ok = new Set(listParticipants(oid, eventId).map((r) => r.id)); const ids = invitationIds.filter((id) => ok.has(id));
  if (!ids.length) throw new Error('No eligible participants selected.');
  mutate((s) => s.invitations.forEach((i) => { if (ids.includes(i.id)) { i.attendance = status || null; i.attendanceAt = now(); } }));
  logActivity(oid, { type: 'attendance_updated', description: `Marked ${ids.length} student(s) as ${status || 'not marked'}`, related: { type: 'event', id: eventId, label: e.title } });
  return ids.length;
};
