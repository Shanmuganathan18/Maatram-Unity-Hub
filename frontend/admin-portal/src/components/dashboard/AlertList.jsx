import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { EmptyState, StatusBadge } from '../ui';
export default function AlertList({ alerts }) {
  if (!alerts.length) return <EmptyState icon={BellRing} title="Nothing needs attention" text="No alerts for the selected filters." />;
  return <ul className="divide-y divide-lavender-200">{alerts.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 py-2.5"><StatusBadge kind={a.severity} /><div className="min-w-0 flex-1"><Link to={a.link} className="block text-sm font-semibold text-navy hover:underline">{a.title}</Link><p className="text-xs text-ink-soft">{a.detail}</p></div></li>)}</ul>;
}
