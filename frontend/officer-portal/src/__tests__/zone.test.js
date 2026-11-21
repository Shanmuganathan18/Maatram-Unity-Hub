import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getState, setDemoNow } from '../services/store';
import * as stu from '../services/studentService';
import * as inst from '../services/institutionService';
import * as av from '../services/availabilityService';
import * as ev from '../services/eventService';
import * as att from '../services/attendanceService';
import * as rep from '../services/reportService';
import * as dash from '../services/dashboardService';
import * as note from '../services/notificationService';
import * as act from '../services/activityService';
import { AccessError } from '../services/zoneScopeService';

const A = 'off-a', B = 'off-b';
const zoneOfStudent = (id) => getState().students.find((s) => s.id === id)?.zoneId;
beforeEach(() => { resetStore(); setDemoNow('2026-11-04T10:00:00+05:30'); });

describe('zone isolation', () => {
  it('lists only own-zone students, institutions, events', () => {
    for (const [o, z] of [[A, 'zone-a'], [B, 'zone-b']]) {
      expect(stu.listStudents(o, { pageSize: 500 }).rows.every((s) => s.zoneId === z)).toBe(true);
      expect(inst.listInstitutions(o).every((i) => i.zoneId === z)).toBe(true);
      expect(ev.listEvents(o).every((e) => e.zoneId === z)).toBe(true);
    }
    expect(stu.listStudents(A, { pageSize: 500 }).total).toBeGreaterThan(40);
  });
  it('treats other-zone ids as not found (IDOR)', () => {
    const b = getState().students.find((s) => s.zoneId === 'zone-b').id;
    expect(stu.getStudentDetail(A, b)).toBeNull();
    expect(inst.getInstitutionDetail(A, 'inst-b1')).toBeNull();
    expect(ev.getEvent(A, 'ev-b-02')).toBeNull();
    expect(ev.listResponses(A, 'ev-b-02')).toBeNull();
    expect(att.listParticipants(A, 'ev-b-06')).toBeNull();
  });
  it('search/filters never reveal other zone', () => {
    const nameB = getState().students.find((s) => s.zoneId === 'zone-b').name;
    expect(stu.listStudents(A, { q: nameB, pageSize: 500 }).rows.every((s) => s.zoneId === 'zone-a')).toBe(true);
    expect(stu.listStudents(A, { institutionId: 'inst-b1' }).total).toBe(0);
    expect(av.matrix(A, '2026-11-02', { institutionId: 'inst-b1' }).rows).toHaveLength(0);
  });
  it('availability, reports, exports and dashboard are zone-scoped', () => {
    const rows = av.matrix(A, '2026-11-02').rows; expect(rows.every((r) => zoneOfStudent(r.student.id) === 'zone-a')).toBe(true);
    const exp = av.exportAvailability(A, '2026-11-02', {}, 'csv'); expect(exp.content).not.toMatch(/MF-B-/); expect(exp.content).toMatch(/MF-A-/);
    for (const t of ['availability', 'events', 'institutions', 'participation']) { const csv = rep.exportReport(B, t, {}, 'csv').content; expect(csv).not.toMatch(/MF-A-|Sri Vidya|Marina College/); }
    expect(dash.getDashboard(A).cards.students).toBe(stu.listStudents(A, { pageSize: 500 }).total);
    expect(note.listNotifications(A).every((n) => n.zoneId === 'zone-a')).toBe(true);
    expect(act.listActivity(B).every((a) => a.zoneId === 'zone-b')).toBe(true);
  });
  it('rejects cross-zone writes', async () => {
    await expect(att.markAttendance(A, 'ev-b-06', ['x'], 'present')).rejects.toThrow(AccessError);
    await expect(ev.changeStatus(A, 'ev-b-02', 'cancelled')).rejects.toThrow(AccessError);
    const base = { title: 'Test event', category: 'other', date: '2026-12-01', startTime: '10:00', endTime: '12:00', targetInstitutionIds: ['inst-b1'], questions: [] };
    await expect(ev.createEvent(A, base)).rejects.toThrow(/outside your zone/);
    const e = await ev.createEvent(A, { ...base, targetInstitutionIds: ['inst-a1'], zoneId: 'zone-b' });
    expect(e.zoneId).toBe('zone-a'); // payload zone ignored
  });
});

describe('availability + events logic', () => {
  it('keeps availability states distinct and uses all-students denominator', () => {
    const { rows, days } = av.matrix(A, '2026-11-02'); const s = av.dayStats(rows, days[5]);
    expect(s.total).toBe(rows.length); expect(s.available + s.unavailable + s.not_selected + s.draft + s.not_submitted + s.system_assumed_unavailable).toBe(rows.length);
    expect(s.availablePct).toBe(Math.round((s.available / s.total) * 100));
    expect(rows.some((r) => r.weekStatus === 'not_submitted')).toBe(true);
    setDemoNow('2026-11-06T18:01:00+05:30');
    const closed = av.matrix(A, '2026-11-02').rows; expect(closed.some((r) => r.weekStatus === 'system_assumed_unavailable')).toBe(true); expect(closed.some((r) => r.weekStatus === 'draft')).toBe(false);
  });
  it('best dates are ranked by available count', () => { const { rows, days } = av.matrix(A, '2026-11-02'); const b = av.bestDates(rows, days); expect(b[0].available).toBeGreaterThanOrEqual(b[6].available); });
  it('physical verification invites only students marked Available; excluded have reasons', () => {
    const e = ev.getEvent(A, 'ev-a-03'); const p = ev.physicalEligibility(A, e);
    expect(p.excluded.every((x) => x.reason)).toBe(true);
    const invited = new Set(ev.listResponses(A, 'ev-a-03').map((r) => r.studentId)); expect(p.eligible.every((s) => invited.has(s.id))).toBe(true); expect(p.excluded.every((x) => !invited.has(x.student.id))).toBe(true);
  });
  it('acceptance is separate from attendance; status workflow + attendance rules', async () => {
    const parts = att.listParticipants(A, 'ev-a-06'); expect(parts.every((p) => p.response === 'accepted')).toBe(true);
    await expect(att.markAttendance(A, 'ev-a-02', [], 'present')).rejects.toThrow(/In Progress/);
    const ids = parts.filter((p) => !p.attendance).slice(0, 2).map((p) => p.id); await att.markAttendance(A, 'ev-a-06', ids, 'absent');
    expect(att.attendanceSummary(A, 'ev-a-06').absent).toBeGreaterThanOrEqual(2);
    await expect(ev.changeStatus(A, 'ev-a-05', 'cancelled')).rejects.toThrow(/Cannot move/);
    await ev.changeStatus(A, 'ev-a-07', 'invitations_open'); expect(ev.getEvent(A, 'ev-a-07').stats.invited).toBeGreaterThan(0);
  });
  it('capacity/waitlist counts and conflicts warn without blocking', async () => {
    const s = ev.getEvent(A, 'ev-a-02').stats; expect(s.accepted).toBeLessThanOrEqual(12); expect(s.waitlisted).toBeGreaterThanOrEqual(0);
    const c = ev.findConflicts(A, { id: 'new', date: '2026-11-07', startTime: '11:00', endTime: '12:00', targetInstitutionIds: ['inst-a1'] }); expect(c.length).toBeGreaterThan(0);
  });
});
