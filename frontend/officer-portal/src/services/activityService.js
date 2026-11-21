import { getState } from './store';
import { requireOfficer } from './zoneScopeService';
// Read-only by design: there is no update/delete function for audit history.
export const listActivity = (oid, { type = '', q = '', from = '', to = '' } = {}) => {
  const z = requireOfficer(oid).zoneId; const needle = q.trim().toLowerCase();
  return getState().activity.filter((a) => a.zoneId === z && (!type || a.type === type) && (!needle || `${a.description} ${a.related?.label ?? ''} ${a.actorName}`.toLowerCase().includes(needle)) && (!from || a.at >= Date.parse(`${from}T00:00:00+05:30`)) && (!to || a.at <= Date.parse(`${to}T23:59:59+05:30`))).sort((a, b) => b.at - a.at);
};
