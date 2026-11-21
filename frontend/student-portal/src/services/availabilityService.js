import { getState, mutate, delay, uid } from './store';
import { now } from './clock';
import { appConfig } from '../config/appConfig';
import { addWeeks, weekDays, weekStartOf, todayIST, deadlineFor, fmtRange } from '../utils/dates';
import { pushNotification } from './notificationService';
import { api } from './api';

export const emptyDay = () => ({ status: 'none', slots: [] });
export const emptyDays = (ws) => Object.fromEntries(weekDays(ws).map((d) => [d, emptyDay()]));
export const getRecord = (sid, ws) => getState().availability[sid]?.[ws] ?? null;

const slotLabel = (id) => appConfig.slots.find((s) => s.id === id)?.label ?? id;
export const describeDay = (d) => {
  if (!d || d.status === 'none') return 'Not selected';
  if (d.status === 'unavailable') return 'Unavailable';
  return d.slots?.length ? `Available (${d.slots.map(slotLabel).join(', ')})` : 'Available';
};
export const diffDays = (a, b) => Object.keys(b).filter((k) => describeDay(a[k]) !== describeDay(b[k])).map((date) => ({ date, from: describeDay(a[date]), to: describeDay(b[date]) }));
export const summarize = (days = {}) => {
  const v = Object.values(days);
  return { available: v.filter((d) => d.status === 'available').length, unavailable: v.filter((d) => d.status === 'unavailable').length, none: v.filter((d) => d.status === 'none').length };
};

/** Central place that turns (record + clock) into one of the 5 spec states. */
export const getWeekInfo = (sid, ws, nowMs = now()) => {
  const record = getRecord(sid, ws);
  const deadline = deadlineFor(ws);
  const open = nowMs < deadline;
  let state;
  if (open) state = !record ? 'not_started' : record.status === 'submitted' ? 'submitted' : 'draft';
  else state = record?.status === 'submitted' ? 'locked' : 'system_assumed_unavailable'; // a draft is never a submission
  return { weekStart: ws, record, deadline, open, state, closesSoon: open && deadline - nowMs <= appConfig.closesSoonHours * 3600000 };
};

export const currentWeek = (nowMs = now()) => weekStartOf(todayIST(nowMs));
/** Default planning week = first week whose deadline has not passed. */
export const defaultPlanningWeek = (nowMs = now()) => {
  let ws = currentWeek(nowMs);
  for (let i = 0; i < 4 && deadlineFor(ws) <= nowMs; i++) ws = addWeeks(ws, 1);
  return ws;
};
export const eligibleWeeks = (nowMs = now()) => {
  const cur = currentWeek(nowMs);
  return Array.from({ length: appConfig.weeksBack + appConfig.weeksAhead + 1 }, (_, i) => addWeeks(cur, i - appConfig.weeksBack));
};
export const getDayInfo = (sid, date, nowMs = now()) => {
  const ws = weekStartOf(date);
  const info = getWeekInfo(sid, ws, nowMs);
  const day = info.record?.days?.[date] ?? emptyDay();
  return { date, weekStart: ws, day, ...info };
};

const normalise = (days) => Object.fromEntries(Object.entries(days).map(([k, d]) => [k, { status: d.status, slots: appConfig.features.timeSlots && d.status === 'available' ? [...d.slots] : [] }]));
const assertOpen = (sid, ws) => { const i = getWeekInfo(sid, ws); if (!i.open) throw new Error('This week is locked. The submission deadline has passed.'); return i; };

export const saveDraft = async (sid, ws, days) => {
  await delay();
  const info = assertOpen(sid, ws);
  if (info.record?.status === 'submitted') throw new Error('This week is already submitted. Use Update Availability.');
  const t = now();
  const clean = normalise(days);
  mutate((s) => { (s.availability[sid] ||= {})[ws] = { weekStart: ws, status: 'draft', days: clean, createdAt: info.record?.createdAt ?? t, lastSavedAt: t, submittedAt: null, updatedAt: t, history: info.record?.history ?? [] }; });

  if (api.getToken()) {
    try {
      await api.put(`/availability/week/${ws}/draft`, { days: clean });
    } catch (err) {
      console.warn('Backend draft sync notice:', err.message);
    }
  }
};

export const submitWeek = async (sid, ws, days) => {
  await delay(500);
  const info = assertOpen(sid, ws);
  const clean = normalise(days);
  if (summarize(clean).available + summarize(clean).unavailable === 0) throw new Error('Select at least one date as Available or Unavailable before submitting.');
  const t = now();
  const prev = info.record;
  const wasSubmitted = prev?.status === 'submitted';
  const changes = wasSubmitted ? diffDays(prev.days, clean) : [];
  if (wasSubmitted && changes.length === 0) throw new Error('No changes to update.');
  mutate((s) => {
    (s.availability[sid] ||= {})[ws] = {
      weekStart: ws, status: 'submitted', days: clean, createdAt: prev?.createdAt ?? t, lastSavedAt: t,
      submittedAt: prev?.submittedAt ?? t, updatedAt: t,
      history: [...(prev?.history ?? []), { id: uid('h'), at: t, type: wasSubmitted ? 'updated' : 'submitted', changes }],
    };
  });
  pushNotification(sid, { category: 'submission_confirmation', title: `Availability ${wasSubmitted ? 'updated' : 'submitted'} for ${fmtRange(ws)}`, body: 'Saved before the deadline. Remember: availability is not an event acceptance.', link: { type: 'week', weekStart: ws } });

  if (api.getToken()) {
    try {
      await api.post(`/availability/week/${ws}/submit`, { days: clean });
    } catch (err) {
      console.warn('Backend submit sync notice:', err.message);
    }
  }
};

/** Previous week's pattern by weekday position (Mon..Sun), never literal dates. */
export const getPreviousPattern = (sid, ws) => {
  const rec = getRecord(sid, addWeeks(ws, -1));
  if (!rec) return null;
  const p = weekDays(addWeeks(ws, -1)).map((d) => structuredClone(rec.days[d] ?? emptyDay()));
  return p.every((d) => d.status === 'none') ? null : p;
};
export const patternToWeek = (ws, pattern) => Object.fromEntries(weekDays(ws).map((d, i) => [d, structuredClone(pattern[i] ?? emptyDay())]));
export const daysToPattern = (ws, days) => weekDays(ws).map((d) => structuredClone(days[d] ?? emptyDay()));

// ---- templates ----
export const listTemplates = (sid) => getState().templates[sid] ?? [];
const checkName = (sid, name, exceptId) => {
  const n = name.trim();
  if (!n) throw new Error('Template name is required.');
  if (n.length > 40) throw new Error('Template name must be 40 characters or fewer.');
  if (listTemplates(sid).some((t) => t.id !== exceptId && t.name.toLowerCase() === n.toLowerCase())) throw new Error('A template with this name already exists.');
  return n;
};
export const createTemplate = async (sid, name, pattern) => { const n = checkName(sid, name); await delay(200); mutate((s) => { (s.templates[sid] ||= []).push({ id: uid('tpl'), name: n, pattern, createdAt: now() }); }); };
export const renameTemplate = async (sid, id, name) => { const n = checkName(sid, name, id); await delay(200); mutate((s) => { s.templates[sid].find((t) => t.id === id).name = n; }); };
export const deleteTemplate = async (sid, id) => { await delay(200); mutate((s) => { s.templates[sid] = s.templates[sid].filter((t) => t.id !== id); }); };

// ---- history ----
export const getHistory = (sid, nowMs = now()) => {
  const cur = currentWeek(nowMs);
  return eligibleWeeks(nowMs).filter((ws) => ws <= addWeeks(cur, 1)).map((ws) => { const info = getWeekInfo(sid, ws, nowMs); return { ...info, counts: summarize(info.record?.days) }; }).reverse();
};
