import { History } from 'lucide-react';
import { fmtDate, fmtInstant } from '../../utils/dates';
import { EmptyState } from '../ui';

export default function EditHistory({ history = [] }) {
  if (!history.length) return <EmptyState icon={History} title="No edit history yet" text="Changes appear here after you submit this week." />;
  return (
    <ol className="space-y-3">
      {[...history].reverse().map((h) => (
        <li key={h.id} className="rounded-xl border border-lavender-200 p-3 text-sm">
          <p className="font-semibold text-navy">{h.type === 'submitted' ? 'Originally submitted' : 'Updated'} · <span className="font-normal text-ink-soft">{fmtInstant(h.at)}</span></p>
          {h.changes.length > 0 ? <ul className="mt-2 space-y-1">{h.changes.map((c) => <li key={c.date} className="text-ink-soft"><span className="font-semibold text-ink">{fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}:</span> {c.from} → <span className="font-semibold text-ink">{c.to}</span></li>)}</ul> : <p className="mt-1 text-ink-soft">{h.type === 'submitted' ? 'First submission.' : 'No date changes recorded.'}</p>}
        </li>
      ))}
    </ol>
  );
}
