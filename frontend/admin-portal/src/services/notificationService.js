import { getState, mutate, delay } from './store';

const readSet = (aid) => new Set(getState().reads[aid] ?? []);
export const listNotifications = (aid, { category = '', read = 'all', from = '', to = '' } = {}) => { const r = readSet(aid); return getState().notifications.map((n) => ({ ...n, read: r.has(n.id) })).filter((n) => (!category || n.category === category) && (read === 'all' || (read === 'unread' ? !n.read : n.read)) && (!from || n.createdAt >= Date.parse(`${from}T00:00:00+05:30`)) && (!to || n.createdAt <= Date.parse(`${to}T23:59:59+05:30`))).sort((a, b) => b.createdAt - a.createdAt); };
export const unreadCount = (aid) => { const r = readSet(aid); return getState().notifications.filter((n) => !r.has(n.id)).length; };
export const markRead = async (aid, id) => mutate((s) => { (s.reads[aid] ??= []); if (!s.reads[aid].includes(id)) s.reads[aid].push(id); });
export const markAllRead = async (aid) => { await delay(150); mutate((s) => { s.reads[aid] = s.notifications.map((n) => n.id); }); };
