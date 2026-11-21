import { now } from './store';
import { todayIST, weekDays } from '../utils/dates';
import { zoneStudents, zoneInstitutions } from './zoneScopeService';
import { defaultWeek, matrix, weekStats, dayStats, compare, institutionOptions } from './availabilityService';
import { listEvents } from './eventService';
import { listActivity } from './activityService';

export const getDashboard = (oid) => {
  const nowMs = now();
  const today = todayIST(nowMs);
  const ws = defaultWeek(nowMs);
  const { rows = [], days = [] } = matrix(oid, ws);
  const w = weekStats(rows);
  const events = listEvents(oid) || [];

  const upcoming = events
    .filter((e) => e.date >= today && !['completed', 'cancelled', 'draft'].includes(e.status))
    .sort((a, b) => a.date.localeCompare(b.date));

  const live = events.filter((e) => e.status !== 'cancelled' && e.status !== 'draft');
  const accepted = live.reduce((n, e) => n + (e.stats?.accepted ?? 0), 0);
  const done = events.filter((e) => ['completed', 'in_progress'].includes(e.status));
  const present = done.reduce((n, e) => n + (e.stats?.present ?? 0), 0);
  const acceptedDone = done.reduce((n, e) => n + (e.stats?.accepted ?? 0), 0);

  const perDay = days.map((d) => {
    const s = dayStats(rows, d);
    return {
      date: d,
      label: d.slice(5),
      available: s.available,
      unavailable: s.unavailable,
      notSubmitted: s.noValid + s.not_selected,
    };
  });

  const instOpts = institutionOptions(oid) || [];
  const heat = instOpts.map((i) => {
    const rs = rows.filter((r) => r.student?.institutionId === i.id);
    return {
      institution: i.name,
      total: rs.length,
      cells: days.map((d) => ({
        date: d,
        pct: dayStats(rs, d).availablePct,
        available: dayStats(rs, d).available,
      })),
    };
  });

  const institutionRates = compare(oid, ws, 'institution').map((c) => ({
    name: (c.name || '').split(' ').slice(0, 2).join(' '),
    full: c.name || '',
    rate: c.submissionRate || 0,
  }));

  const participationTrend = events
    .filter((e) => !['draft', 'cancelled'].includes(e.status))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      name: (e.date || '').slice(5),
      title: e.title || '',
      accepted: e.stats?.accepted ?? 0,
      attended: e.stats?.present ?? 0,
    }));

  return {
    weekStart: ws,
    days,
    today,
    cards: {
      students: zoneStudents(oid).length,
      institutions: zoneInstitutions(oid).length,
      submitted: w.submitted || 0,
      notSubmitted: Math.max(0, (w.total || 0) - (w.submitted || 0)),
      submissionRate: w.submissionRate || 0,
      upcoming: upcoming.length,
      pendingResponses: live.reduce((n, e) => n + (e.stats?.pending ?? 0), 0),
      participation: accepted,
      attendanceRate: acceptedDone ? Math.round((present / acceptedDone) * 100) : 0,
    },
    perDay,
    heat,
    institutionRates,
    participationTrend,
    upcoming: upcoming.slice(0, 5),
    activity: (listActivity(oid) || []).slice(0, 6),
  };
};
