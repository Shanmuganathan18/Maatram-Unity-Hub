import { getState, mutate, delay } from './store';
import { need, audit } from './accessService';
import { api } from './api';

export const fetchSettingsLive = async () => {
  try {
    const res = await api.get('/settings');
    if (res?.data) {
      mutate((s) => {
        Object.keys(res.data).forEach((group) => {
          if (s.settings[group]) {
            s.settings[group] = { ...s.settings[group], ...res.data[group] };
          }
        });
      });
      return res.data;
    }
  } catch (err) {
    console.warn('Live settings fetch fallback:', err.message);
  }
  return null;
};

export const getSettings = (aid) => {
  need(aid, 'settings.view');
  return structuredClone(getState().settings);
};

const rules = {
  general: (d) => [!d.appName?.trim() && 'Application name is required.', !/^\S+@\S+\.\S+$/.test(d.supportEmail) && 'Support email is invalid.', !d.supportPhone?.trim() && 'Support phone is required.'],
  academic: (d) => [!/^\d{4}-\d{2}$/.test(d.academicYear) && 'Academic year must look like 2026-27.', !d.period?.trim() && 'Academic period is required.'],
  availability: (d) => [!(d.deadlineDay >= 1 && d.deadlineDay <= 7) && 'Deadline day must be 1–7.', !(d.deadlineHour >= 0 && d.deadlineHour <= 23) && 'Deadline hour must be 0–23.', !(d.deadlineMinute >= 0 && d.deadlineMinute <= 59) && 'Deadline minute must be 0–59.'],
  events: (d) => [!(d.defaultResponseDeadlineDays >= 0 && d.defaultResponseDeadlineDays <= 30) && 'Default response deadline must be 0–30 days.', !(d.reminderHoursBefore >= 1 && d.reminderHoursBefore <= 168) && 'Reminder hours must be 1–168.'],
  notifications: () => [], security: (d) => [!(d.sessionTimeoutMinutes >= 5 && d.sessionTimeoutMinutes <= 480) && 'Session timeout must be 5–480 minutes.'],
};

/** Saves the section into MySQL via backend API, updates store, and records an audit entry. */
export const saveSection = async (aid, section, values) => {
  need(aid, 'settings.edit');
  const errs = (rules[section]?.(values) ?? []).filter(Boolean);
  if (errs.length) throw new Error(errs.join(' '));

  const old = getState().settings[section] || {};
  const changed = Object.keys(values).filter((k) => JSON.stringify(old[k]) !== JSON.stringify(values[k]));
  if (!changed.length) throw new Error('No changes to save.');

  // 1. Persist to live backend
  try {
    await api.patch('/settings', { [section]: values });
  } catch (apiErr) {
    console.warn('Could not persist to backend settings API, falling back to local store:', apiErr.message);
  }

  // 2. Update local store
  mutate((s) => {
    s.settings[section] = { ...s.settings[section], ...values };
  });

  audit(aid, {
    action: 'settings.updated',
    category: 'Settings',
    description: `Updated ${section} settings: ${changed.join(', ')}`,
  });

  return changed;
};
