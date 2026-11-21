import { mutate, delay } from './store';
import { requireOfficer, logActivity } from './zoneScopeService';
import { profileEditableFields } from '../config/appConfig';

/** Only whitelisted fields can change. Zone, role, status, name and email are never writable from the UI. */
export const updateProfile = async (oid, patch) => {
  await delay(350); requireOfficer(oid);
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => profileEditableFields.includes(k)));
  mutate((s) => Object.assign(s.officers.find((o) => o.id === oid), safe));
  logActivity(oid, { type: 'profile_updated', description: 'Updated own profile', related: { type: 'profile', id: oid, label: 'Officer profile' } });
};
