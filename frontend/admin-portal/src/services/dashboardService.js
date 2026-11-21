import { getState, now } from './store';
import { need } from './accessService';
import * as m from './metrics';
import { getDataQuality } from './dataQualityService';
import { isOverdue } from './supportService';
import { todayIST } from '../utils/dates';
import { eventStatuses } from '../config/appConfig';

/** Every card & chart below is computed from the same filters. */
export const getDashboard = (aid, f = {}) => {
  need(aid, 'reports.view'); const st = getState(); const nowMs = now(); const today = todayIST(nowMs); const ws = m.defaultWeek(nowMs);
  const sf = { zoneId: f.zoneId, institutionId: f.institutionId, year: f.year }; const { rows, days, info } = m.matrix(ws, sf, nowMs); const w = m.weekStats(rows);
  const events = m.filterEvents({ zoneId: f.zoneId, institutionId: f.institutionId, category: f.category, from: f.from, to: f.to });
  const live = events.filter((e) => !['draft', 'cancelled'].includes(e.status)); const tot = m.sumStats(live);
  const statusCount = Object.fromEntries(Object.keys(eventStatuses).map((k) => [k, events.filter((e) => e.status === k).length]));
  const zones = st.zones.filter((z) => !f.zoneId || z.id === f.zoneId);
  const zoneCompare = zones.map((z) => { const zr = rows.filter((r) => r.student.zoneId === z.id); const zw = m.weekStats(zr); const ze = live.filter((e) => e.zoneId === z.id); const t = m.sumStats(ze); return { id: z.id, name: z.name, students: zr.length, submitted: zw.submitted, submissionRate: zw.submissionRate, participation: t.accepted, participationRate: m.pct(t.accepted, t.invited), attendanceRate: m.pct(t.present, t.accepted) }; });
  const perDay = days.map((d) => { const s = m.dayStats(rows, d); return { date: d, available: s.available, unavailable: s.unavailable, notSubmitted: s.noValid + s.not_selected }; });
  const instIds = [...new Set(rows.map((r) => r.student.institutionId))];
  const institutionAnalytics = instIds.map((id) => { const ir = rows.filter((r) => r.student.institutionId === id); const i = st.institutions.find((x) => x.id === id); const x = m.institutionMetrics(id); return { id, name: i.code, full: i.name, zone: m.zoneShort(i.zoneId), students: ir.length, submissionRate: m.weekStats(ir).submissionRate, participationRate: x.participationRate }; });
  const instByZone = zones.map((z) => ({ name: z.name, institutions: st.institutions.filter((i) => i.zoneId === z.id && (!f.institutionId || i.id === f.institutionId)).length }));
  const tickets = st.tickets.filter((t) => !f.zoneId || t.zoneId === f.zoneId); const openT = tickets.filter((t) => ['Open', 'In Progress', 'Waiting for User'].includes(t.status));

  // alerts – computed from mock data (clearly labelled mock in the UI)
  const alerts = [];
  zoneCompare.filter((z) => z.students && z.submissionRate < 60).forEach((z) => alerts.push({ id: `low-${z.id}`, severity: 'high', title: `Low availability submission: ${z.name} (${z.submissionRate}%)`, detail: `Below the 60% prototype threshold for week ${ws}.`, link: '/availability' }));
  st.officers.filter((o) => o.status === 'Inactive' && (!f.zoneId || o.zoneId === f.zoneId)).forEach((o) => alerts.push({ id: `inactive-${o.id}`, severity: 'medium', title: `Inactive officer: ${o.name}`, detail: 'Zone may lack active coverage.', link: `/officers/${o.id}` }));
  getDataQuality(aid).slice(0, 4).forEach((q) => alerts.push({ id: q.id, severity: q.severity, title: `${q.title} (${q.count})`, detail: 'Data quality – review records (nothing is changed automatically).', link: q.link }));
  live.filter((e) => ['invitations_open'].includes(e.status) && m.eventStats(e).invited >= 10 && m.eventStats(e).responseRate < 45).slice(0, 3).forEach((e) => alerts.push({ id: `resp-${e.id}`, severity: 'medium', title: `Low response rate: ${e.title} (${m.eventStats(e).responseRate}%)`, detail: `${m.zoneShort(e.zoneId)} · ${m.eventStats(e).pending} pending`, link: `/events/${e.id}` }));
  tickets.filter(isOverdue).forEach((t) => alerts.push({ id: `tk-${t.id}`, severity: 'medium', title: `Overdue ticket ${t.id}: ${t.subject}`, detail: `Open longer than the ${3}-day prototype SLA.`, link: '/support' }));
  st.imports.filter((i) => i.invalid > 0).forEach((i) => alerts.push({ id: `imp-${i.id}`, severity: 'low', title: `Import preview with errors: ${i.fileName} (${i.invalid} invalid)`, detail: 'Review the error report.', link: '/data-centre' }));
  const hrs = Math.round((info.deadline - nowMs) / 3600000); if (info.open && hrs <= 72) alerts.push({ id: 'deadline', severity: 'low', title: `Availability deadline in ${hrs} hours`, detail: `${w.missing} students have no valid submission yet.`, link: '/availability' });
  const order = { high: 0, medium: 1, low: 2 }; alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    weekStart: ws, today,
    cards: { zones: st.zones.length, activeZones: st.zones.filter((z) => z.status === 'Active').length, officers: st.officers.filter((o) => !f.zoneId || o.zoneId === f.zoneId).length, institutions: st.institutions.filter((i) => (!f.zoneId || i.zoneId === f.zoneId) && (!f.institutionId || i.id === f.institutionId)).length, students: rows.length, submissionRate: w.submissionRate, submitted: w.submitted, events: events.length, upcoming: events.filter((e) => e.date >= today && !['completed', 'cancelled', 'draft'].includes(e.status)).length, participation: tot.accepted, pendingTickets: openT.length },
    zoneCompare, perDay, trend: m.trend(sf, nowMs).map((t) => ({ weekStart: t.weekStart, submissionRate: t.submissionRate })), institutionAnalytics, instByZone,
    eventAnalytics: { statusCount, total: events.length, responseRate: m.pct(tot.invited - tot.pending, tot.invited), attendanceRate: m.pct(tot.present, tot.accepted) },
    alerts, activity: st.auditLogs.filter((a) => !f.zoneId || a.zoneId === f.zoneId || !a.zoneId).sort((a, b) => b.at - a.at).slice(0, 8),
  };
};
