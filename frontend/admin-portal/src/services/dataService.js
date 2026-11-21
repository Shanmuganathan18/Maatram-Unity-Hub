// Import / export centre: central place for datasets that can be exported, plus import history (mock).
import { getState } from './store';
import { need, audit, can } from './accessService';
import { buildFile } from '../utils/exportFiles';
import * as m from './metrics';
import { exportRows as availRows, defaultWeek } from './availabilityService';
import { listLogs } from './auditService';

export const datasets = [
  { id: 'students', label: 'Students', perm: 'students.export', note: 'Contains personal data (email, phone).' },
  { id: 'institutions', label: 'Institutions', perm: 'reports.export' }, { id: 'officers', label: 'Officers', perm: 'reports.export' },
  { id: 'events', label: 'Events', perm: 'reports.export' }, { id: 'availability', label: 'Availability (current week)', perm: 'reports.export' }, { id: 'audit', label: 'Audit logs', perm: 'audit.export' },
];
export const exportable = (aid) => datasets.map((d) => ({ ...d, allowed: can(aid, d.perm) }));
export const datasetRows = (aid, id) => {
  const st = getState(); const d = datasets.find((x) => x.id === id); need(aid, d.perm);
  switch (id) {
    case 'students': return st.students.map((s) => ({ 'Student ID': s.studentId, Name: s.name, Email: s.email, Phone: s.phone, Zone: m.zoneShort(s.zoneId), Institution: m.instName(s.institutionId), Department: s.department, Year: s.year, Status: s.status }));
    case 'institutions': return st.institutions.map((i) => ({ Code: i.code, Name: i.name, Zone: m.zoneShort(i.zoneId), Location: i.location, Type: i.type, Status: i.status }));
    case 'officers': return st.officers.map((o) => ({ 'Officer ID': o.officerId, Name: o.name, Zone: o.zoneId ? m.zoneShort(o.zoneId) : 'Unassigned', Designation: o.designation, Status: o.status }));
    case 'events': return st.events.map((e) => ({ ID: e.id, Title: e.title, Zone: m.zoneShort(e.zoneId), Date: e.date, Status: e.status, Category: e.category }));
    case 'availability': return availRows(aid, defaultWeek(), {});
    default: return listLogs(aid, { pageSize: 1e6 }).all.map((a) => ({ 'Log ID': a.id, Action: a.action, User: a.actorName, At: new Date(a.at).toISOString(), Description: a.description }));
  }
};
export const exportDataset = (aid, id, format) => { const rows = datasetRows(aid, id); audit(aid, { action: 'report.exported', category: 'Report', description: `Data centre export: ${id} (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id, label: id } }); return buildFile(rows, format, `${id}-export`); };
export const importHistory = (aid) => { need(aid, 'data.view'); return [...getState().imports].sort((a, b) => b.uploadedAt - a.uploadedAt); };
