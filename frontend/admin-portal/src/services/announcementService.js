import { getState, mutate, delay, uid, now } from './store';
import { need, audit, can, getAdmin } from './accessService';
import { api } from './api';

export const audiences = [
  { id: 'all_users', label: 'All users', needsAll: true }, { id: 'all_students', label: 'All students', needsAll: true }, { id: 'all_officers', label: 'All officers', needsAll: true },
  { id: 'selected_zones', label: 'Selected zones', needsAll: false }, { id: 'selected_roles', label: 'Selected user roles', needsAll: false },
];
export const audienceAllowed = (aid, id) => !audiences.find((a) => a.id === id)?.needsAll || can(aid, 'announcements.send_all');
export const listAnnouncements = (aid) => { need(aid, 'announcements.view'); return getState().announcements.map((a) => ({ ...a, status: a.status === 'scheduled' && a.publishAt <= now() ? 'published' : a.status })).sort((a, b) => b.createdAt - a.createdAt); };
export const validate = (aid, d) => {
  const e = []; if (!d.title?.trim() || d.title.trim().length < 3) e.push('Title is required.'); if (!d.body?.trim() || d.body.trim().length < 10) e.push('Description must be at least 10 characters.');
  if (!audiences.find((a) => a.id === d.audience)) e.push('Choose an audience.'); else if (!audienceAllowed(aid, d.audience)) e.push('You are not authorized to announce to this audience.');
  if (d.audience === 'selected_zones' && !d.zoneIds?.length) e.push('Select at least one zone.'); if (d.audience === 'selected_roles' && !d.roles?.length) e.push('Select at least one role.');
  if (d.publishAt && d.expiresAt && d.expiresAt <= d.publishAt) e.push('Expiry must be after the publish date.'); return e;
};

export const saveAnnouncement = async (aid, d, publish) => {
  need(aid, 'announcements.manage'); await delay(400); const e = validate(aid, d); if (e.length) throw new Error(e.join(' '));
  const t = now(); const status = !publish ? 'draft' : d.publishAt && d.publishAt > t ? 'scheduled' : 'published';
  const a = { id: uid('ann'), title: d.title.trim(), body: d.body.trim(), audience: d.audience, zoneIds: d.audience === 'selected_zones' ? d.zoneIds : [], roles: d.audience === 'selected_roles' ? d.roles : [], publishAt: publish ? (d.publishAt ?? t) : d.publishAt ?? null, expiresAt: d.expiresAt ?? null, status, createdBy: getAdmin(aid).name, createdAt: t };
  mutate((s) => s.announcements.push(a)); audit(aid, { action: publish ? 'announcement.published' : 'announcement.drafted', category: 'Announcement', description: `${publish ? (status === 'scheduled' ? 'Scheduled' : 'Published') : 'Saved draft'} “${a.title}”`, related: { type: 'announcement', id: a.id, label: a.title } });

  if (api.getToken()) {
    try {
      const res = await api.post('/announcements', {
        title: a.title,
        body: a.body,
        audience: a.audience === 'all_users' ? 'ALL_USERS' : a.audience === 'all_students' ? 'ALL_STUDENTS' : a.audience === 'all_officers' ? 'ALL_OFFICERS' : 'SELECTED_ZONES',
        zoneIds: a.zoneIds,
        publishAt: a.publishAt ? new Date(a.publishAt).toISOString() : null,
      });
      if (res?.data?.id) a.id = res.data.id;
    } catch (err) {
      console.warn('Backend announcement sync notice:', err.message);
    }
  }

  return a;
};
export const publishDraft = async (aid, id) => {
  need(aid, 'announcements.manage'); await delay(300); const a = getState().announcements.find((x) => x.id === id); if (!a || a.status !== 'draft') throw new Error('Only drafts can be published.');
  const e = validate(aid, a); if (e.length) throw new Error(e.join(' ')); mutate((s) => { const x = s.announcements.find((v) => v.id === id); x.status = 'published'; x.publishAt = now(); }); audit(aid, { action: 'announcement.published', category: 'Announcement', description: `Published “${a.title}”`, related: { type: 'announcement', id, label: a.title } });

  if (api.getToken()) {
    try {
      await api.post(`/announcements/${id}/publish`);
    } catch (err) {
      console.warn('Backend publish announcement sync notice:', err.message);
    }
  }
};
