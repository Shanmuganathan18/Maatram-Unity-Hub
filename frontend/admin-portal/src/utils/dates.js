// All calendar-date maths works on 'yyyy-MM-dd' strings (no browser-timezone surprises).
// Instants (deadlines, timestamps) are converted using the configured Asia/Kolkata offset.
import { appConfig } from '../config/appConfig';

const MS_DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const toYMD = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
export const addDays = (s, n) => toYMD(new Date(toUTC(s).getTime() + n * MS_DAY));
export const addWeeks = (ws, n) => addDays(ws, n * 7);
export const isoWeekday = (s) => toUTC(s).getUTCDay() || 7;
export const weekStartOf = (s) => addDays(s, -(isoWeekday(s) - 1));
export const weekDays = (ws) => Array.from({ length: 7 }, (_, i) => addDays(ws, i));
export const isoWeekNumber = (s) => {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - ys) / MS_DAY + 1) / 7);
};
export const todayIST = (ms) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: appConfig.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
export const instantAt = (dateStr, time = '00:00') => Date.parse(`${dateStr}T${time}:00${appConfig.utcOffset}`);

/** Deadline instant (ms) for the week starting `weekStart`. */
export const deadlineFor = (weekStart) => {
  const { dayOfWeek, hour, minute, weekOffset } = appConfig.deadline;
  return instantAt(addDays(weekStart, dayOfWeek - 1 + weekOffset * 7), `${pad(hour)}:${pad(minute)}`);
};
export const deadlineWindowStart = (weekStart) => deadlineFor(weekStart) - 7 * MS_DAY; // for the progress bar

// ---- formatting ----
const fmt = (opts, tz) => new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: tz });
export const fmtDate = (s, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => fmt(opts, 'UTC').format(toUTC(s));
export const fmtWeekday = (s) => fmtDate(s, { weekday: 'short' });
export const fmtDayNum = (s) => String(toUTC(s).getUTCDate());
export const fmtShort = (s) => fmtDate(s, { day: 'numeric', month: 'short' });
export const fmtRange = (ws) => {
  const a = toUTC(ws), b = toUTC(addDays(ws, 6));
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const left = fmtDate(ws, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  return `${left} – ${fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;
};
export const fmtTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};
export const fmtTimeRange = (s, e) => (s ? (e ? `${fmtTime(s)} – ${fmtTime(e)}` : fmtTime(s)) : 'Time to be confirmed');
export const fmtInstant = (ms, opts = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) =>
  fmt(opts, appConfig.timezone).format(new Date(ms)).replace(/\b(am|pm)\b/, (x) => x.toUpperCase());
export const fmtDeadline = (ms) => fmtInstant(ms, { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', '');

export const relativeTime = (ms, nowMs) => {
  const diff = nowMs - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  if (todayIST(nowMs) === todayIST(ms + MS_DAY)) return 'Yesterday';
  return fmtInstant(ms, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
};

export const countdown = (ms) => {
  const t = Math.max(0, ms);
  const s = Math.floor(t / 1000);
  return { total: t, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};
export const fmtCountdown = ({ d, h, m, s }) => `${d > 0 ? `${d}d ` : ''}${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
