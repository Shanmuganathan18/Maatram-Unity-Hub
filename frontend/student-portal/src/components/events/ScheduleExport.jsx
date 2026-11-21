import { toast } from 'sonner';
import { CalendarPlus, FileDown, Printer } from 'lucide-react';
import { Button } from '../ui';
import { buildIcs, download, scheduleRows, toCsv } from '../../utils/exports';
import { appConfig } from '../../config/appConfig';
import { getAcceptedUpcoming } from '../../services/eventService';
import { now } from '../../services/clock';

/** Exports only the signed-in student's accepted, upcoming events. */
export default function ScheduleExport({ sid }) {
  const items = () => getAcceptedUpcoming(sid);
  const guard = (fn) => { const list = items(); if (!list.length) { toast.info('You have no accepted upcoming events to export.'); return; } fn(list); };
  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => guard((l) => { download('my-maatram-schedule.csv', toCsv(scheduleRows(l)), 'text/csv;charset=utf-8'); toast.success('Schedule downloaded (CSV).'); })}><FileDown className="h-4 w-4" />CSV</Button>
      <Button size="sm" variant="outline" onClick={() => guard(() => window.print())}><Printer className="h-4 w-4" />Print</Button>
      {appConfig.features.ics && <Button size="sm" variant="outline" onClick={() => guard((l) => { download('my-maatram-events.ics', buildIcs(l, now()), 'text/calendar;charset=utf-8'); toast.success('Calendar file (.ics) downloaded. Pending invitations are not included.'); })}><CalendarPlus className="h-4 w-4" />.ics</Button>}
    </div>
  );
}
