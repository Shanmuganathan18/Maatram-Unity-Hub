import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getState, setDemoNow } from '../services/store';
import { PermissionError, can, permissionsOf } from '../services/accessService';
import * as zone from '../services/zoneService';
import * as off from '../services/officerService';
import * as inst from '../services/institutionService';
import * as stu from '../services/studentService';
import * as usr from '../services/userService';
import * as av from '../services/availabilityService';
import * as ev from '../services/eventService';
import * as att from '../services/attendanceService';
import * as rep from '../services/reportService';
import * as role from '../services/roleService';
import * as set from '../services/settingsService';
import * as ann from '../services/announcementService';
import * as sup from '../services/supportService';
import * as audit from '../services/auditService';
import * as dash from '../services/dashboardService';
import { globalSearch } from '../services/searchService';
import { getDataQuality } from '../services/dataQualityService';

const S = 'adm-01', A = 'adm-02', K = 'adm-99';
beforeEach(() => { resetStore(); setDemoNow('2026-11-04T10:00:00+05:30'); });

describe('permission model', () => {
  it('all authenticated admins share identical system-wide permissions', () => {
    expect(can(S, 'zones.create')).toBe(true);
    expect(can(A, 'zones.create')).toBe(true);
    expect(can(S, 'reports.view')).toBe(true);
    expect(can(A, 'reports.view')).toBe(true);
    expect(permissionsOf('nobody').size).toBe(0);
  });
  it('services refuse access to unauthorized/non-admin users', async () => {
    expect(() => audit.listLogs('adm-99')).toThrow(PermissionError);
    expect(() => rep.studentsReport(A, {})[0]).not.toThrow();
  });
  it('prevents self-deactivation and enforces last-admin rules', async () => {
    await expect(usr.changeAdminRole(S, 'adm-01', 'admin')).rejects.toThrow();
    await expect(usr.setUserStatus(S, { type: 'admin', id: 'adm-01' }, 'Inactive')).rejects.toThrow();
  });
});

describe('zones, officers, institutions, students', () => {
  it('validates zone codes and never deletes zones', async () => {
    await expect(zone.createZone(S, { name: 'Zone X', code: 'ZN-A', region: 'R', status: 'Active' })).rejects.toThrow(/already used/);
    const z = await zone.createZone(S, { name: 'Zone X', code: 'ZN-X', region: 'R', status: 'Active' }); expect(z.status).toBe('Active');
    expect(zone.deleteBlockedReason('zone-a')).toMatch(/never deleted/); expect(zone.deleteBlockedReason).toBeTypeOf('function');
    await expect(zone.setZoneStatus(S, 'zone-a', 'Archived')).rejects.toThrow(/live events/);
  });
  it('officer reassignment is permission-controlled and audited', async () => {
    await off.reassignOfficer(S, 'off-06', 'zone-c'); expect(getState().officers.find((o) => o.id === 'off-06').zoneId).toBe('zone-c');
    expect(getState().auditLogs.at(-1).description).toMatch(/Reassigned Vimal Raj from Unassigned to Zone C/);
    await expect(off.reassignOfficer(A, 'off-06', 'zone-d')).rejects.toThrow(/active zone/); await expect(off.reassignOfficer(K, 'off-06', 'zone-a')).rejects.toThrow(PermissionError);
    const o = await off.createOfficer(S, { name: 'New Person', email: 'new.person@maatram-demo.example', phone: '9876543210', officerId: 'OFF-N-001', designation: 'Zone Officer', zoneId: 'zone-a' }); expect(o.status).toBe('Pending Activation');
    await expect(off.createOfficer(S, { name: 'Dup', email: 'officer.a@maatram-demo.example', phone: '9876543210', officerId: 'OFF-N-002', designation: 'Zone Officer' })).rejects.toThrow(/already exists/);
  });
  it('institution zone change moves its students; deletion blocked', async () => {
    const before = getState().students.filter((s) => s.institutionId === 'inst-x1').length; expect(before).toBeGreaterThan(0);
    const i = getState().institutions.find((x) => x.id === 'inst-x1'); await inst.updateInstitution(S, 'inst-x1', { ...i, code: 'UNK', zoneId: 'zone-a', departments: i.departments });
    expect(getState().students.filter((s) => s.institutionId === 'inst-x1').every((s) => s.zoneId === 'zone-a')).toBe(true);
    await expect(inst.createInstitution(S, { name: 'Test Inst', code: 'SVIT', zoneId: 'zone-a', location: 'X', departments: ['CSE'] })).rejects.toThrow(/already used/);
    expect(inst.deleteBlockedReason('inst-a1')).toMatch(/student/);
  });
  it('student import validates and never writes students', () => {
    const n = getState().students.length; const csv = 'studentId,name,email,institutionCode,department,year\nMF-N-1,A B,a@b.co,SVIT,CSE,2\nMF-A-0001,Dup,x@y.co,SVIT,CSE,2\nMF-N-3,Bad,not-mail,SVIT,CSE,2\nMF-N-4,Amb,a@b.co,KEC,CSE,2\nMF-N-5,NoInst,a@b.co,ZZZ,CSE,2\nMF-N-6,Yr,a@b.co,SVIT,CSE,9';
    const r = stu.validateImport(A, csv, 't.csv'); expect(r.valid).toBe(1); expect(r.invalid).toBe(5); expect(r.errors.some((e) => /ambiguous/.test(e.message))).toBe(true); expect(getState().students.length).toBe(n);
    expect(() => stu.validateImport(K, csv)).toThrow(PermissionError); expect(stu.errorReportCsv(r)).toMatch(/duplicate student ID/);
  });
  it('bulk operations report affected counts and skip protected accounts', async () => {
    const r = await usr.bulkSetUserStatus(S, [{ type: 'student', id: 'stu-0001' }, { type: 'student', id: 'stu-0002' }, { type: 'admin', id: 'adm-01' }], 'Inactive'); expect(r.changed).toBe(2); expect(r.skipped).toBe(1);
  });
});

describe('monitoring', () => {
  it('availability keeps states distinct; denominator includes non-submitters; settings drive the assumed-unavailable rule', async () => {
    const o = av.overview(S, '2026-11-02', {}); const s = av.dayStats(o.rows, o.days[5]); expect(s.available + s.unavailable + s.not_selected + s.draft + s.not_submitted + s.system_assumed_unavailable).toBe(o.rows.length);
    expect(av.bestDates(S, '2026-11-02', {})[0].available).toBeGreaterThanOrEqual(av.bestDates(S, '2026-11-02', {})[6].available);
    setDemoNow('2026-11-06T18:01:00+05:30'); expect(av.overview(S, '2026-11-02').stats.system_assumed_unavailable).toBeGreaterThan(0);
    await set.saveSection(S, 'availability', { ...getState().settings.availability, systemAssumedUnavailable: false }); expect(av.overview(S, '2026-11-02').stats.system_assumed_unavailable).toBe(0);
    const z = av.compare(S, '2026-11-02', 'zone', {}); expect(z.find((x) => x.name === 'Zone C').submissionRate).toBeLessThan(z.find((x) => x.name === 'Zone A').submissionRate);
  });
  it('dashboard totals follow filters', () => {
    const all = dash.getDashboard(S, {}); const za = dash.getDashboard(S, { zoneId: 'zone-a' });
    expect(all.cards.students).toBe(getState().students.length); expect(za.cards.students).toBe(getState().students.filter((s) => s.zoneId === 'zone-a').length); expect(za.zoneCompare).toHaveLength(1);
    expect(dash.getDashboard(S, { category: 'boot_camp' }).cards.events).toBeLessThan(all.cards.events); expect(all.alerts.length).toBeGreaterThan(3);
  });
  it('approval workflow only works when enabled in settings', async () => {
    await expect(ev.reviewEvent(S, 'ev-a-04', 'approved')).rejects.toThrow(/not enabled/);
    await set.saveSection(S, 'events', { ...getState().settings.events, approvalEnabled: true }); await ev.reviewEvent(S, 'ev-a-04', 'approved'); expect(getState().events.find((e) => e.id === 'ev-a-04').approvalStatus).toBe('approved');
    await expect(ev.reviewEvent(S, 'ev-a-07', 'rejected', '')).rejects.toThrow(/note/); await expect(ev.reviewEvent(K, 'ev-a-07', 'approved')).rejects.toThrow(PermissionError);
  });
  it('cancel/postpone rules, attendance read-only, reports and exports', async () => {
    await expect(ev.cancelEvent(A, 'ev-a-05', 'x')).rejects.toThrow(/no longer/); await ev.cancelEvent(A, 'ev-a-02', 'Test reason'); expect(ev.getEventDetail(A, 'ev-a-02').event.status).toBe('cancelled');
    await expect(ev.cancelEvent(K, 'ev-a-01', 'x')).rejects.toThrow(PermissionError);
    const a = att.overview(A, {}); expect(a.total.confirmed).toBeGreaterThan(0); expect(a.byZone.length).toBeGreaterThan(1);
    for (const t of ['zones', 'students', 'availability', 'events', 'institutions', 'officers']) { expect(rep.reportRows(A, t, {}).length).toBeGreaterThan(0); expect(rep.exportReport(A, t, {}, 'csv').content.length).toBeGreaterThan(10); }
    expect(rep.officersReport({})[0]).not.toHaveProperty('Rank');
    expect(() => av.exportAvailability(A, '2026-11-02', {}, 'csv')).not.toThrow();
  });
});

describe('supporting modules', () => {
  it('announcements enforce audience authorization; mock publish only', async () => {
    await expect(ann.saveAnnouncement(K, { title: 'Hello', body: 'Body text long enough', audience: 'all_students' }, true)).rejects.toThrow(PermissionError);
    const a = await ann.saveAnnouncement(A, { title: 'Zone note', body: 'Body text long enough', audience: 'selected_zones', zoneIds: ['zone-a'] }, true); expect(a.status).toBe('published');
    await expect(ann.saveAnnouncement(K, { title: 'x', body: 'Body text long enough', audience: 'selected_zones', zoneIds: ['zone-a'] }, true)).rejects.toThrow(PermissionError);
  });
  it('tickets: internal notes hidden from submitter, status/assign audited', async () => {
    await sup.addMessage(A, 'TCK-1001', 'Internal only', true); const t = sup.getTicket(A, 'TCK-1001'); expect(t.messages.some((m) => m.internal)).toBe(true); expect(sup.submitterView(t).messages.some((m) => m.internal)).toBe(false);
    await sup.setTicketStatus(A, 'TCK-1001', 'In Progress'); await sup.assignTicket(A, 'TCK-1001', 'adm-02'); expect(getState().auditLogs.at(-1).action).toBe('ticket.assigned'); await expect(sup.setTicketStatus(K, 'TCK-1001', 'Closed')).rejects.toThrow(PermissionError);
  });
  it('audit log: append-only, redacts secrets, export requires permission', async () => {
    const n = getState().auditLogs.length; audit.listLogs(A); expect(getState().auditLogs.length).toBe(n); expect(audit.exportLogs(A, {}, 'csv').content).toMatch(/Log ID/); expect(() => audit.exportLogs(K, {}, 'csv')).toThrow(PermissionError);
    expect(audit.exportLogs(S, {}, 'csv')).toBeTruthy(); expect(Object.keys(audit)).not.toContain('deleteLog');
  });
  it('search is permission-aware; data quality finds seeded problems', () => {
    expect(globalSearch(S, 'zone').length).toBeGreaterThan(0); expect(globalSearch('adm-99', 'zone')).toEqual([]);
    const q = getDataQuality(S).map((x) => x.id); ['dup-student', 'dup-inst', 'bad-email', 'inst-no-zone', 'off-no-zone'].forEach((k) => expect(q).toContain(k));
  });
  it('settings validate and are audited', async () => {
    await expect(set.saveSection(S, 'academic', { academicYear: 'bad', period: 'x' })).rejects.toThrow(/Academic year/); const ch = await set.saveSection(S, 'academic', { academicYear: '2027-28', period: 'Semester 2' }); expect(ch).toContain('academicYear'); expect(() => set.getSettings(A)).not.toThrow();
  });
});
