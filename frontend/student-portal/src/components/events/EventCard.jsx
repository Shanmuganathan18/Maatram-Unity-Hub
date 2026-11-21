import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Video, Users, TriangleAlert, Timer } from 'lucide-react';
import { Badge, StatusBadge } from '../ui';
import { eventCategories } from '../../config/appConfig';
import { fmtDate, fmtInstant, fmtTimeRange } from '../../utils/dates';

export default function EventCard({ item, conflicts = [], children }) {
  const { event: e, invitation: inv } = item;
  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="border-navy/20 bg-lavender-100 text-navy">{eventCategories[e.category]}</Badge>
        {e.priority === 'mandatory' && <Badge className="border-rose-300 bg-rose-50 text-rose-800">Mandatory</Badge>}
        {e.status !== 'upcoming' && <StatusBadge kind={e.status} />}
        <span className="ml-auto"><StatusBadge kind={inv.response} /></span>
      </div>
      <h3 className="text-lg font-bold"><Link to={`/events/${e.id}`} className="hover:underline">{e.title}</Link></h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{e.description}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-700" aria-hidden />{fmtDate(e.date)}{e.originalDate && <span className="text-xs text-orange-800">(was {fmtDate(e.originalDate, { day: 'numeric', month: 'short' })})</span>}</li>
        <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-700" aria-hidden />{fmtTimeRange(e.startTime, e.endTime)}</li>
        <li className="flex items-center gap-2">{e.mode === 'online' ? <Video className="h-4 w-4 text-brand-700" aria-hidden /> : <MapPin className="h-4 w-4 text-brand-700" aria-hidden />}{e.mode === 'online' ? 'Online session' : e.venue}</li>
        <li className="flex items-center gap-2 text-ink-soft"><Users className="h-4 w-4" aria-hidden />{e.organizer.name} · {e.audience.label}</li>
        {e.responseDeadline && <li className="flex items-center gap-2 text-ink-soft"><Timer className="h-4 w-4" aria-hidden />Respond by {fmtInstant(Date.parse(e.responseDeadline))}</li>}
      </ul>
      {conflicts.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-amber-800"><TriangleAlert className="h-4 w-4" aria-hidden />{conflicts.some((c) => c.type === 'time') ? 'Time conflict' : 'Potential date conflict'} with {conflicts[0].event.title}</p>}
      {children && <div className="mt-3">{children}</div>}
    </article>
  );
}
