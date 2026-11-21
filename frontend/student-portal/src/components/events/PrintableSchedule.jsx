import { getAcceptedUpcoming } from '../../services/eventService';
import { fmtDate, fmtTimeRange } from '../../utils/dates';

/** Visible only when printing. */
export default function PrintableSchedule({ sid, name }) {
  const list = getAcceptedUpcoming(sid);
  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-bold">Personal schedule – {name}</h1>
      <p className="mb-4 text-sm">Accepted upcoming events only · Maatram Foundation</p>
      <table className="w-full border-collapse text-sm"><thead><tr>{['Event', 'Date', 'Time', 'Venue / meeting', 'Response'].map((h) => <th key={h} className="border border-black p-2 text-left">{h}</th>)}</tr></thead>
        <tbody>{list.map(({ event: e, invitation: i }) => <tr key={e.id}><td className="border border-black p-2">{e.title}</td><td className="border border-black p-2">{fmtDate(e.date)}</td><td className="border border-black p-2">{fmtTimeRange(e.startTime, e.endTime)}</td><td className="border border-black p-2">{e.mode === 'online' ? 'Online' : e.venue}</td><td className="border border-black p-2">{i.response}</td></tr>)}</tbody></table>
    </div>
  );
}
