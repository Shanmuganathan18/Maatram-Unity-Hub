import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Notice } from '../ui';
import { fmtDate, fmtTimeRange } from '../../utils/dates';

/** Shows conflicts but never declines anything automatically. */
export default function ConflictWarning({ conflicts }) {
  if (!conflicts.length) return null;
  return (
    <Notice tone="warn" icon={TriangleAlert} title="Possible schedule conflict">
      <ul className="mt-1 space-y-1">
        {conflicts.map((c) => (
          <li key={c.event.id}>
            {c.type === 'time'
              ? <>Overlaps your accepted event <Link className="font-semibold underline" to={`/events/${c.event.id}`}>{c.event.title}</Link> ({fmtTimeRange(c.event.startTime, c.event.endTime)}).</>
              : <>Potential date-level conflict with <Link className="font-semibold underline" to={`/events/${c.event.id}`}>{c.event.title}</Link> on {fmtDate(c.event.date)} – exact times aren’t both confirmed yet.</>}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs">Nothing has been declined for you. Choose what works best.</p>
    </Notice>
  );
}
