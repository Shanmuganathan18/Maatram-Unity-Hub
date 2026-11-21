// In-memory mock "database". Replace the service functions (not the UI) with API calls later.
import { appConfig } from '../config/appConfig';
import * as seed from '../data/mockData';
import { api } from './api';

const clone = (o) => structuredClone(o);
const initial = () => ({
  clock: { baseMs: Date.parse(appConfig.demo.now), setAtReal: Date.now() },
  students: clone(seed.students),
  institutions: clone(seed.institutions),
  zones: clone(seed.zones),
  availability: clone(seed.availabilitySeed),
  templates: clone(seed.templatesSeed),
  events: clone(seed.eventsSeed),
  invitations: clone(seed.invitationsSeed),
  feedback: clone(seed.feedbackSeed),
  notifications: clone(seed.notificationsSeed),
  preferences: clone(seed.preferencesSeed),
});

let state = initial();
let version = 0;
const listeners = new Set();

export const getState = () => state;
export const getVersion = () => version;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
/** Mutate state inside fn, then notify subscribers. */
export const mutate = (fn) => { fn(state); version += 1; listeners.forEach((l) => l()); };
export const resetStore = () => { state = initial(); version += 1; listeners.forEach((l) => l()); };
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/** Synchronize with live MySQL backend if authenticated */
export const syncBackendData = async () => {
  if (!api.getToken()) return;
  try {
    const [zRes, iRes, eRes, hRes, nRes] = await Promise.allSettled([
      api.get('/zones'),
      api.get('/institutions'),
      api.get('/events'),
      api.get('/availability/history'),
      api.get('/notifications'),
    ]);

    mutate((s) => {
      if (zRes.status === 'fulfilled' && zRes.value?.data?.items) {
        s.zones = zRes.value.data.items.map((z) => ({
          id: z.id,
          code: z.code,
          name: z.name,
          region: z.region || '',
        }));
      }

      if (iRes.status === 'fulfilled' && Array.isArray(iRes.value?.data)) {
        s.institutions = iRes.value.data.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          zoneId: i.zoneId,
        }));
      }

      if (eRes.status === 'fulfilled' && Array.isArray(eRes.value?.data)) {
        s.events = eRes.value.data.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category?.toLowerCase() || 'general',
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          mode: e.mode?.toLowerCase() || 'offline',
          venue: e.venue || '',
          zoneId: e.zoneId,
          status: e.status?.toLowerCase() || 'published',
        }));
      }

      if (nRes.status === 'fulfilled' && Array.isArray(nRes.value?.data?.items)) {
        s.notifications = nRes.value.data.items;
      }
    });
  } catch (err) {
    console.warn('Student live backend sync warning:', err);
  }
};
