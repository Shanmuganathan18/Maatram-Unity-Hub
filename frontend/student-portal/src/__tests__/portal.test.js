import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../services/store';
import { setDemoNow, now } from '../services/clock';
import * as av from '../services/availabilityService';
import * as ev from '../services/eventService';
import { deadlineFor, weekStartOf, isoWeekday, fmtRange, addWeeks } from '../utils/dates';
import { buildIcs, toCsv, scheduleRows } from '../utils/exports';

const S = 'stu-001';
beforeEach(() => { resetStore(); setDemoNow('2026-11-04T10:00:00+05:30'); });

describe('dates', () => {
  it('computes week start, range and Friday 6PM IST deadline', () => {
    expect(weekStartOf('2026-11-07')).toBe('2026-11-02');
    expect(isoWeekday('2026-11-08')).toBe(7);
    expect(fmtRange('2026-11-02')).toBe('2 – 8 Nov 2026');
    expect(deadlineFor('2026-11-02')).toBe(Date.parse('2026-11-06T18:00:00+05:30'));
  });
});

describe('weekly availability states', () => {
  it('open draft before deadline, locked/assumed after', () => {
    expect(av.getWeekInfo(S, '2026-11-02').state).toBe('draft');
    expect(av.getWeekInfo(S, '2026-11-09').state).toBe('not_started');
    expect(av.getWeekInfo(S, '2026-10-26').state).toBe('locked');
    expect(av.getWeekInfo(S, '2026-10-12').state).toBe('system_assumed_unavailable');
    expect(av.getWeekInfo(S, '2026-09-21').state).toBe('system_assumed_unavailable'); // draft never submitted
    setDemoNow('2026-11-06T18:01:00+05:30');
    expect(av.getWeekInfo(S, '2026-11-02').state).toBe('system_assumed_unavailable');
    expect(av.defaultPlanningWeek()).toBe('2026-11-09');
  });
  it('submits, updates with history, then rejects after lock', async () => {
    const days = av.getRecord(S, '2026-11-02').days;
    await av.submitWeek(S, '2026-11-02', days);
    expect(av.getWeekInfo(S, '2026-11-02').state).toBe('submitted');
    const changed = structuredClone(days); changed['2026-11-06'] = { status: 'available', slots: [] };
    await av.submitWeek(S, '2026-11-02', changed);
    const h = av.getRecord(S, '2026-11-02').history;
    expect(h.map((x) => x.type)).toEqual(['submitted', 'updated']);
    expect(h[1].changes[0].to).toBe('Available');
    setDemoNow('2026-11-06T18:01:00+05:30');
    await expect(av.submitWeek(S, '2026-11-02', changed)).rejects.toThrow(/locked/);
  });
  it('rejects empty submission', async () => { await expect(av.submitWeek(S, '2026-11-09', av.emptyDays('2026-11-09'))).rejects.toThrow(/at least one/); });
  it('repeat previous week maps weekdays, not dates', () => {
    const p = av.getPreviousPattern(S, '2026-11-02');
    const next = av.patternToWeek('2026-11-02', p);
    expect(next['2026-11-07'].slots).toEqual(['morning', 'evening']); // Sat copied from Sat 31 Oct
    expect(av.getPreviousPattern(S, '2026-10-19')).toBeNull(); // previous week (10-12) missed
  });
});

describe('events', () => {
  it('targets by audience and physical-verification eligibility', () => {
    const ids = (s) => ev.getEventsForStudent(s).map((x) => x.event.id);
    expect(ids(S)).toContain('evt-105');
    expect(ids(S)).not.toContain('evt-114'); // not eligible
    expect(ids(S)).not.toContain('evt-113'); // first-year only
    expect(ids('stu-002')).not.toContain('evt-105');
  });
  it('detects time and date-level conflicts without declining anything', () => {
    expect(ev.getConflicts(S, 'evt-101')[0]).toMatchObject({ type: 'time' });
    expect(ev.getConflicts(S, 'evt-105')[0]).toMatchObject({ type: 'date' });
    expect(ev.getEventForStudent(S, 'evt-101').invitation.response).toBe('pending');
  });
  it('availability never auto-accepts; response needs explicit action', async () => {
    await av.submitWeek(S, '2026-11-02', av.getRecord(S, '2026-11-02').days);
    expect(ev.getEventForStudent(S, 'evt-101').invitation.response).toBe('pending');
    await expect(ev.respond(S, 'evt-101', { response: 'declined' })).rejects.toThrow(/reason/);
    await ev.respond(S, 'evt-101', { response: 'accepted', answers: { q1: 'Full Stack', q2: true } });
    expect(ev.getEventForStudent(S, 'evt-101').invitation.response).toBe('accepted');
    await ev.withdraw(S, 'evt-101');
    expect(ev.getEventForStudent(S, 'evt-101').invitation.response).toBe('withdrawn');
  });
  it('blocks responses to cancelled events and after response deadline', async () => {
    await expect(ev.respond(S, 'evt-108', { response: 'accepted' })).rejects.toThrow(/cancelled/);
    setDemoNow('2026-11-06T13:00:00+05:30');
    await expect(ev.respond(S, 'evt-101', { response: 'accepted', answers: {} })).rejects.toThrow(/deadline/);
  });
});

describe('exports', () => {
  it('ICS contains accepted events only; untimed events are all-day', () => {
    const ics = buildIcs(ev.getEventsForStudent(S), now());
    expect(ics).toContain('SUMMARY:Full Stack Technical Boot Camp');
    expect(ics).not.toContain('Mock Technical Interview'); // pending
    expect(ics).not.toContain('Cloud Basics'); // cancelled
    expect(ics).toContain('DTSTART:20261114T040000Z'); // 09:30 IST
  });
  it('CSV has header and quotes', () => { expect(toCsv(scheduleRows(ev.getAcceptedUpcoming(S))).split('\r\n')[0]).toContain('"Event"'); });
});
