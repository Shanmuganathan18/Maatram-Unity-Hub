import { getState, mutate, delay, now } from './store';
import { need, audit, getAdmin } from './accessService';
import { zoneName } from './metrics';
import { appConfig } from '../config/appConfig';
import { api } from './api';

export const isOverdue = (t) => ['Open', 'In Progress'].includes(t.status) && now() - t.createdAt > appConfig.slaDays * 86400000;
const view = (t) => ({ ...t, zoneLabel: t.zoneId ? zoneName(t.zoneId) : '—', overdue: isOverdue(t), assigneeName: getState().admins.find((a) => a.id === t.assignee)?.name ?? 'Unassigned' });
export const listTickets = (aid, { q = '', status = '', priority = '', zoneId = '', overdue = '' } = {}) => { need(aid, 'support.view'); const n = q.trim().toLowerCase(); return getState().tickets.map(view).filter((t) => (!n || `${t.id} ${t.subject} ${t.submittedBy}`.toLowerCase().includes(n)) && (!status || t.status === status) && (!priority || t.priority === priority) && (!zoneId || t.zoneId === zoneId) && (!overdue || t.overdue)).sort((a, b) => b.createdAt - a.createdAt); };
export const getTicket = (aid, id) => { need(aid, 'support.view'); const t = getState().tickets.find((x) => x.id === id); return t ? view(t) : null; };
const find = (id) => { const t = getState().tickets.find((x) => x.id === id); if (!t) throw new Error('Ticket not found.'); return t; };
const log = (aid, t, action, d) => audit(aid, { action, category: 'Support', description: d, zoneId: t.zoneId, related: { type: 'ticket', id: t.id, label: t.id } });

export const addMessage = async (aid, id, text, internal) => {
  need(aid, 'support.manage'); await delay(300); if (!text?.trim()) throw new Error('Write a message first.'); const t = find(id); const a = getAdmin(aid);
  mutate((s) => s.tickets.find((x) => x.id === id).messages.push({ id: `m-${Math.random().toString(36).slice(2, 7)}`, who: a.name, role: 'Admin', text: text.trim(), at: now(), internal: !!internal }));
  log(aid, t, internal ? 'ticket.note_added' : 'ticket.replied', internal ? 'Added internal note' : 'Replied to submitter');

  if (api.getToken()) {
    try {
      await api.post(`/support/${id}/messages`, { text: text.trim(), internal: Boolean(internal) });
    } catch (err) {
      console.warn('Backend support message sync notice:', err.message);
    }
  }
};
export const setTicketStatus = async (aid, id, status) => {
  need(aid, 'support.manage'); await delay(300); const t = find(id); mutate((s) => { const x = s.tickets.find((v) => v.id === id); x.status = status; x.history.push({ at: now(), text: `Status set to ${status}` }); }); log(aid, t, 'ticket.status_changed', `Ticket ${id} set to ${status}`);

  if (api.getToken()) {
    try {
      await api.patch(`/support/${id}/status`, { status });
    } catch (err) {
      console.warn('Backend support status sync notice:', err.message);
    }
  }
};
export const assignTicket = async (aid, id, adminId) => {
  need(aid, 'support.manage'); await delay(300); const t = find(id); const a = getState().admins.find((x) => x.id === adminId); mutate((s) => { const x = s.tickets.find((v) => v.id === id); x.assignee = adminId || null; x.history.push({ at: now(), text: a ? `Assigned to ${a.name}` : 'Unassigned' }); }); log(aid, t, 'ticket.assigned', `Ticket ${id} ${a ? `assigned to ${a.name}` : 'unassigned'}`);

  if (api.getToken()) {
    try {
      await api.patch(`/support/${id}/assign`, { assigneeId: adminId || null });
    } catch (err) {
      console.warn('Backend support assign sync notice:', err.message);
    }
  }
};
export const submitterView = (t) => ({ ...t, messages: t.messages.filter((m) => !m.internal) });
export const adminOptions = () => getState().admins.filter((a) => a.status === 'Active' && a.role !== 'readonly').map((a) => ({ value: a.id, label: a.name }));
