// In-memory mock "database" holding ALL zones. Components never import this; services do.
// Authorization lives in zoneScopeService – in production the backend enforces the same checks.
import { appConfig } from '../config/appConfig';
import * as seed from '../data/mockData';
import { api } from './api';

const clone = (o) => structuredClone(o);
const initial = () => ({
  clock: { baseMs: Date.parse(appConfig.demo.now), setAtReal: Date.now() },
  zones: clone(seed.zones), officers: clone(seed.officers), institutions: clone(seed.institutions), students: clone(seed.students),
  availability: clone(seed.availability), events: clone(seed.events), invitations: clone(seed.invitations),
  notifications: clone(seed.notifications), activity: clone(seed.activity),
});
let state = initial();
let version = 0;
const listeners = new Set();
export const getState = () => state;
export const getVersion = () => version;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const mutate = (fn) => { fn(state); version += 1; listeners.forEach((l) => l()); };
export const resetStore = () => { state = initial(); version += 1; listeners.forEach((l) => l()); };
export const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const now = () => state.clock.baseMs + (Date.now() - state.clock.setAtReal);
export const setDemoNow = (iso) => mutate((s) => { s.clock = { baseMs: Date.parse(iso), setAtReal: Date.now() }; });

/** Synchronize with live MySQL backend if authenticated */
export const syncBackendData = async () => {
  if (!api.getToken()) return;
  try {
    const [zRes, iRes, sRes, eRes] = await Promise.allSettled([
      api.get('/zones'),
      api.get('/institutions'),
      api.get('/students?perPage=100'),
      api.get('/events'),
    ]);

    mutate((s) => {
      if (zRes.status === 'fulfilled' && zRes.value?.data?.items) {
        s.zones = zRes.value.data.items.map((z) => ({
          id: z.id,
          code: z.code,
          name: z.name,
          region: z.region || '',
          status: z.status === 'ACTIVE' ? 'Active' : 'Inactive',
        }));
      }

      if (iRes.status === 'fulfilled' && Array.isArray(iRes.value?.data)) {
        s.institutions = iRes.value.data.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          type: i.type || 'Engineering',
          zoneId: i.zoneId,
          status: i.status === 'ACTIVE' ? 'Active' : 'Inactive',
        }));
      }

      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value?.data)) {
        const liveStudents = sRes.value.data.map((st) => ({
          id: st.id,
          studentId: st.studentId || st.registerNumber || st.id,
          name: st.name,
          email: st.email,
          phone: st.phone || '',
          department: st.department || 'General',
          year: st.year || 1,
          institutionId: st.institutionId,
          zoneId: st.zoneId,
          status: st.status || 'Active',
          availabilityStatus: 'not_submitted',
        }));
        if (liveStudents.length > 0) {
          s.students = liveStudents;
        }
      }

      if (eRes.status === 'fulfilled' && Array.isArray(eRes.value?.data)) {
        const liveEvents = eRes.value.data.map((e) => ({
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
          invitationCount: e.invitationsCount || 0,
        }));
        if (liveEvents.length > 0) {
          s.events = liveEvents;
        }
      }
    });
  } catch (err) {
    console.warn('Officer live backend sync warning:', err);
  }
};
