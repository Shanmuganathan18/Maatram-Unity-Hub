import { need, audit } from './accessService';
import * as m from './metrics';
import { getState } from './store';
import { buildFile } from '../utils/exportFiles';

export { states, BEST_DATE_NOTE } from './metrics';
export const weekOptions = (...a) => m.weekOptions(...a);
export const defaultWeek = (...a) => m.defaultWeek(...a);
export const overview = (aid, ws, filters = {}) => { need(aid, 'availability.view'); const x = m.matrix(ws, filters); return { ...x, stats: m.weekStats(x.rows) }; };
export const trend = (aid, filters) => { need(aid, 'availability.view'); return m.trend(filters); };
/** Compare groups: by 'zone' | 'institution' | 'year' */
export const compare = (aid, ws, by, filters = {}) => {
  need(aid, 'availability.view'); const { rows, days } = m.matrix(ws, filters);
  return m.groupRows(rows, by).map((g) => { const w = m.weekStats(g.rows); return { key: g.key, name: g.name, total: g.rows.length, submitted: w.submitted, notSubmitted: w.missing, submissionRate: w.submissionRate, available: g.rows.reduce((n, r) => n + Object.values(r.days).filter((v) => v === 'available').length, 0), unavailable: g.rows.reduce((n, r) => n + Object.values(r.days).filter((v) => v === 'unavailable').length, 0), satAvailable: g.rows.filter((r) => r.days[days[5]] === 'available').length, cells: days.map((d) => m.dayStats(g.rows, d)) }; }).sort((a, b) => a.name.localeCompare(b.name));
};
export const bestDates = (aid, ws, filters) => { need(aid, 'availability.view'); const { rows, days } = m.matrix(ws, filters); return m.bestDates(rows, days); };
export const dayStats = m.dayStats; export const weekStats = m.weekStats;
export const exportRows = (aid, ws, filters = {}) => {
  need(aid, 'availability.view'); const { rows, days } = m.matrix(ws, filters);
  return rows.map((r) => ({ 'Student ID': r.student.studentId, Student: r.student.name, Zone: m.zoneShort(r.student.zoneId), Institution: m.instName(r.student.institutionId), Department: r.student.department, Year: r.student.year, 'Week status': r.weekStatus, ...Object.fromEntries(days.map((d) => [d, r.days[d]])) }));
};
export const exportAvailability = (aid, ws, filters, format) => {
  need(aid, 'reports.export'); const rows = exportRows(aid, ws, filters);
  audit(aid, { action: 'report.exported', category: 'Report', description: `Exported availability for week of ${ws} (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id: 'availability', label: 'Availability' } });
  return buildFile(rows, format, `availability-${ws}`);
};
export const zoneOptions = () => getState().zones.map((z) => ({ value: z.id, label: `${z.name} • ${z.region}` }));
