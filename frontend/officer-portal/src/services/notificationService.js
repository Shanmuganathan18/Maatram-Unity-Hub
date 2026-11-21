import { getState, mutate, delay } from './store';
import { requireOfficer } from './zoneScopeService';

const mine = (oid) => { const z = requireOfficer(oid).zoneId; return getState().notifications.filter((n) => n.zoneId === z); };
export const listNotifications = (oid, { category = '', read = 'all', from = '', to = '' } = {}) => mine(oid)
  .filter((n) => (!category || n.category === category) && (read === 'all' || (read === 'unread' ? !n.read : n.read)) && (!from || n.createdAt >= Date.parse(`${from}T00:00:00+05:30`)) && (!to || n.createdAt <= Date.parse(`${to}T23:59:59+05:30`)))
  .sort((a, b) => b.createdAt - a.createdAt);
export const unreadCount = (oid) => mine(oid).filter((n) => !n.read).length;
export const markRead = async (oid, id) => { const ids = new Set(mine(oid).map((n) => n.id)); if (ids.has(id)) mutate((s) => { s.notifications.find((n) => n.id === id).read = true; }); };
export const markAllRead = async (oid) => { await delay(150); const ids = new Set(mine(oid).map((n) => n.id)); mutate((s) => s.notifications.forEach((n) => { if (ids.has(n.id)) n.read = true; })); };
