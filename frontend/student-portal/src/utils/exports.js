// Personal schedule exports (CSV + ICS). Only the signed-in student's accepted events are included.
import { appConfig } from '../config/appConfig';
import { fmtDate, fmtTimeRange, instantAt, addDays } from './dates';
import { eventCategories } from '../config/appConfig';

export const download = (filename, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

const place = (e) => (e.mode === 'online' ? `Online${e.meetingInfo ? ` – ${e.meetingInfo}` : ''}` : e.venue ?? '');

export const scheduleRows = (items) => items.map(({ event, invitation }) => ({
  Event: event.title, Category: eventCategories[event.category], Date: fmtDate(event.date), Time: fmtTimeRange(event.startTime, event.endTime),
  'Venue / Meeting': place(event), 'Event status': event.status, 'My response': invitation.response,
}));

export const toCsv = (rows) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(q).join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n');
};

const icsEsc = (t = '') => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ymd = (s) => s.replace(/-/g, '');

/** Accepted events only. Missing times become all-day entries with an honest note. */
export const buildIcs = (items, nowMs = Date.now()) => {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maatram//Student Portal Prototype//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  items.filter(({ invitation, event }) => invitation.response === 'accepted' && event.status !== 'cancelled').forEach(({ event: e }) => {
    lines.push('BEGIN:VEVENT', `UID:${e.id}@maatram-student-portal`, `DTSTAMP:${utc(nowMs)}`, `SUMMARY:${icsEsc(e.title)}`);
    if (e.startTime) {
      lines.push(`DTSTART:${utc(instantAt(e.date, e.startTime))}`, `DTEND:${utc(instantAt(e.date, e.endTime ?? e.startTime))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`);
    }
    lines.push(`LOCATION:${icsEsc(place(e))}`, `DESCRIPTION:${icsEsc(`${e.description}${e.startTime ? '' : ' (Exact time not yet confirmed.)'}`)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};
export const tzNote = appConfig.timezone;
