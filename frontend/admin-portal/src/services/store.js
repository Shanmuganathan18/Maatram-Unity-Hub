// In-memory mock & synced live store for ALL zones.
import { appConfig } from '../config/appConfig';
import * as seed from '../data/mockData';
import { api } from './api';

const clone = (o) => structuredClone(o);
const initial = () => ({
  clock: { baseMs: Date.parse(appConfig.demo.now), setAtReal: Date.now() },
  zones: clone(seed.zones), admins: clone(seed.admins), officers: clone(seed.officers), institutions: clone(seed.institutions), students: clone(seed.students),
  availability: clone(seed.availability), events: clone(seed.events), invitations: clone(seed.invitations), auditLogs: clone(seed.auditLogs), permissionHistory: clone(seed.permissionHistory),
  tickets: clone(seed.tickets), notifications: clone(seed.notifications), reads: {}, announcements: clone(seed.announcements), imports: clone(seed.imports),
  roles: clone(seed.initialRoles), settings: clone(seed.initialSettings),
});
let state = initial(); let version = 0; const listeners = new Set();
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
    const [zRes, iRes, sRes, oRes, impRes, eRes, aRes, supRes] = await Promise.allSettled([
      api.get('/zones'),
      api.get('/institutions'),
      api.get('/students?perPage=100'),
      api.get('/officers'),
      api.get('/admin/students/imports'),
      api.get('/events'),
      api.get('/announcements'),
      api.get('/support'),
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
        // Merge or replace students with live database records
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

      if (oRes.status === 'fulfilled' && Array.isArray(oRes.value?.data)) {
        const liveOfficers = oRes.value.data.map((o) => ({
          id: o.id,
          officerId: o.officerId || o.employeeId || o.id,
          name: o.name,
          email: o.email,
          phone: o.phone || '',
          designation: o.designation || 'Zonal Officer',
          zoneId: o.zoneId,
          status: o.status || 'Active',
        }));
        if (liveOfficers.length > 0) {
          s.officers = liveOfficers;
        }
      }

      if (impRes.status === 'fulfilled' && Array.isArray(impRes.value?.data)) {
        s.imports = impRes.value.data.map((job) => ({
          id: job.id,
          fileName: job.fileName,
          uploadedAt: new Date(job.createdAt).getTime(),
          by: job.user?.name || job.user?.email || 'Admin',
          rows: job.totalRecords,
          valid: job.successCount,
          invalid: job.failedCount,
          status: job.status === 'COMPLETED' ? 'Completed' : job.status,
        }));
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
          createdBy: e.createdById,
          targetInstitutionIds: e.targetInstitutions ? e.targetInstitutions.map((ti) => ti.id) : [],
        }));
        if (liveEvents.length > 0) {
          s.events = liveEvents;
        }
      }

      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value?.data)) {
        s.announcements = aRes.value.data;
      }

      if (supRes.status === 'fulfilled' && Array.isArray(supRes.value?.data)) {
        s.tickets = supRes.value.data;
      }
    });
  } catch (err) {
    console.warn('Live backend sync warning:', err);
  }
};
