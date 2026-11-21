import { getState, mutate, delay, uid } from './store';
import { now } from './clock';
import { notificationCategories } from '../config/appConfig';

export const listNotifications = (sid) => [...(getState().notifications[sid] || [])].sort((a, b) => b.createdAt - a.createdAt);
export const unreadCount = (sid) => (getState().notifications[sid] || []).filter((n) => !n.read).length;
export const pushNotification = (sid, n) => mutate((s) => { (s.notifications[sid] ||= []).push({ id: uid('n'), read: false, createdAt: now(), link: null, ...n }); });
export const markRead = async (sid, id) => { mutate((s) => { const n = s.notifications[sid]?.find((x) => x.id === id); if (n) n.read = true; }); };
export const markAllRead = async (sid) => { await delay(150); mutate((s) => (s.notifications[sid] || []).forEach((n) => { n.read = true; })); };

export const getPreferences = (sid) => {
  const saved = getState().preferences[sid] || {};
  return Object.fromEntries(notificationCategories.map((c) => [c.id, { inApp: true, email: true, sms: false, whatsapp: false, ...(saved[c.id] || {}) }]));
};
/** Only channels the product supports AND the account has configured. */
export const availableChannels = (profile) => [
  { id: 'inApp', label: 'In-app', note: 'Primary channel – always on', locked: true },
  profile.email && { id: 'email', label: 'Email', note: profile.email },
  profile.phone && { id: 'sms', label: 'SMS', note: `+91 ${profile.phone}` },
  profile.phone && profile.whatsappEnabled && { id: 'whatsapp', label: 'WhatsApp', note: `+91 ${profile.phone}` },
].filter(Boolean);
export const savePreferences = async (sid, prefs) => {
  await delay();
  // In-app is always on, so mandatory notices can never be fully disabled.
  mutate((s) => { s.preferences[sid] = Object.fromEntries(notificationCategories.map((c) => [c.id, { ...prefs[c.id], inApp: true }])); });
};
