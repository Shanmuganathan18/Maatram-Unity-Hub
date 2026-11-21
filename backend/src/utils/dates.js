/**
 * src/utils/dates.js
 * Date/time utilities. All timestamps are stored in UTC.
 * India Standard Time (IST) = UTC+05:30, no DST.
 *
 * We deliberately avoid heavy DST libraries for IST since the offset is constant.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms

/** Current UTC timestamp as Date */
const nowUTC = () => new Date();

/** Current IST date string YYYY-MM-DD */
const todayIST = () => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
};

/** Convert a UTC Date to IST ISO string */
const toIST = (date) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().replace('Z', '+05:30');
};

/**
 * Returns the Monday (week start) for a given YYYY-MM-DD date string.
 * Week starts on Monday per the application spec.
 */
const weekStartOf = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // days to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
};

/** Add N days to a YYYY-MM-DD string, return YYYY-MM-DD */
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** All 7 dates of a week starting from weekStart (Mon–Sun) */
const weekDays = (weekStart) =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

/**
 * Deadline for a week's availability submission.
 * Default: Friday 18:00 IST in the same week.
 * Settings can override dayOfWeek (1=Mon…7=Sun) and hour/minute.
 */
const deadlineFor = (weekStart, settings = {}) => {
  const { deadlineDay = 5, deadlineHour = 18, deadlineMinute = 0 } = settings;
  const days = weekDays(weekStart);
  // deadlineDay: Mon=1 … Sun=7; days[0]=Mon … days[6]=Sun
  const targetDate = days[deadlineDay - 1] || days[4]; // fallback Friday
  // Build a UTC datetime for <targetDate> at deadlineHour:deadlineMinute IST
  const utcMs =
    new Date(targetDate + 'T00:00:00Z').getTime() +
    deadlineHour * 3600000 +
    deadlineMinute * 60000 -
    IST_OFFSET_MS;
  return new Date(utcMs);
};

/** Format a date range like "2 – 8 Nov 2026" */
const fmtRange = (weekStart) => {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(weekStart + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 6);
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })}`;
};

/** Parse pagination query params with safe defaults */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage || query.limit, 10) || 20));
  const skip = (page - 1) * perPage;
  return { page, perPage, skip, take: perPage };
};

/** Build pagination meta from Prisma-style results */
const paginationMeta = ({ page, perPage, total }) => ({
  page,
  perPage,
  total,
  totalPages: Math.ceil(total / perPage),
  hasNext: page < Math.ceil(total / perPage),
  hasPrev: page > 1,
});

module.exports = {
  nowUTC,
  todayIST,
  toIST,
  weekStartOf,
  addDays,
  weekDays,
  deadlineFor,
  fmtRange,
  parsePagination,
  paginationMeta,
  IST_OFFSET_MS,
};

