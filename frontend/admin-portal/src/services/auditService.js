import { getState } from './store';
import { need, audit } from './accessService';
import { buildFile } from '../utils/exportFiles';
import { zoneShort } from './metrics';
import { roleLabel } from '../config/permissions';
import { api } from './api';

const SENSITIVE = /password|token|secret/i;
const clean = (s) => String(s ?? '').replace(SENSITIVE, '[redacted]');

export const fetchLogsLive = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.role) params.set('actorRole', filters.role);
    if (filters.zoneId) params.set('zoneId', filters.zoneId);
    if (filters.page) params.set('page', filters.page);
    if (filters.pageSize) params.set('limit', filters.pageSize);

    const res = await api.get(`/audit-logs?${params.toString()}`);
    if (res.data) {
      return {
        rows: (res.data.items || []).map((a) => ({ ...a, description: clean(a.description) })),
        total: res.data.meta?.total || (res.data.items || []).length,
        page: res.data.meta?.page || 1,
        pages: res.data.meta?.totalPages || 1,
      };
    }
    return null;
  } catch (err) {
    console.warn('Live audit logs fetch failed, fallback to store:', err.message);
    return null;
  }
};

export const listLogs = (aid, { q = '', actorId = '', role = '', zoneId = '', category = '', from = '', to = '', page = 1, pageSize = 12 } = {}) => {
  need(aid, 'audit.view'); const n = q.trim().toLowerCase();
  const all = getState().auditLogs.filter((a) => (!n || `${a.id} ${a.action} ${a.description} ${a.actorName} ${a.related?.label ?? ''}`.toLowerCase().includes(n)) && (!actorId || a.actorId === actorId) && (!role || a.actorRole === role) && (!zoneId || a.zoneId === zoneId) && (!category || a.category === category) && (!from || a.at >= Date.parse(`${from}T00:00:00+05:30`)) && (!to || a.at <= Date.parse(`${to}T23:59:59+05:30`))).sort((a, b) => b.at - a.at).map((a) => ({ ...a, description: clean(a.description) }));
  const total = all.length; const pages = Math.max(1, Math.ceil(total / pageSize)); const p = Math.min(page, pages); return { rows: all.slice((p - 1) * pageSize, p * pageSize), all, total, page: p, pages };
};
export const logFilterOptions = () => { const st = getState(); return { users: [...new Map(st.auditLogs.map((a) => [a.actorId, a.actorName])).entries()].map(([value, label]) => ({ value, label })), categories: [...new Set(st.auditLogs.map((a) => a.category))].sort() }; };
export const exportLogs = (aid, f, format) => {
  need(aid, 'audit.export'); const rows = listLogs(aid, { ...f, page: 1, pageSize: 1e6 }).all.map((a) => ({ 'Log ID': a.id, Action: a.action, User: a.actorName, Role: roleLabel(a.actorRole), Zone: a.zoneId ? zoneShort(a.zoneId) : '', Related: a.related?.label ?? '', 'Date (ISO)': new Date(a.at).toISOString(), Description: a.description }));
  audit(aid, { action: 'report.exported', category: 'Report', description: `Exported audit history (${format.toUpperCase()}, ${rows.length} rows)`, related: { type: 'report', id: 'audit', label: 'Audit history' } }); return buildFile(rows, format, 'audit-logs');
};
