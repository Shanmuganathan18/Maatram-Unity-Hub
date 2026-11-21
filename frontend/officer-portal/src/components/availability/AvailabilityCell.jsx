import { statusMeta } from '../../utils/statusMeta';
import { cn } from '../../utils/cn';

export const cellStyle = {
  available: 'bg-emerald-500 text-white', unavailable: 'bg-rose-500 text-white', not_selected: 'bg-slate-200 text-slate-700',
  draft: 'bg-amber-300 text-amber-950', not_submitted: 'bg-white text-slate-500 border border-dashed border-slate-400', system_assumed_unavailable: 'bg-orange-300 text-orange-950',
};
const glyph = { available: '✓', unavailable: '✕', not_selected: '–', draft: 'D', not_submitted: '?', system_assumed_unavailable: 'S' };

export const AvailabilityCell = ({ state, onClick, selected }) => (
  <button type="button" onClick={onClick} disabled={!onClick} title={statusMeta[state].label} aria-label={statusMeta[state].label}
    className={cn('flex h-8 w-full min-w-[34px] items-center justify-center rounded-md text-xs font-extrabold', cellStyle[state], selected && 'ring-2 ring-navy ring-offset-1', onClick ? 'cursor-pointer' : 'cursor-default')}>{glyph[state]}</button>
);

export const HeatmapLegend = ({ keys = Object.keys(glyph) }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label="Legend">
    {keys.map((k) => <li key={k} className="flex items-center gap-1.5"><span className={cn('flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold', cellStyle[k])}>{glyph[k]}</span>{statusMeta[k].label}</li>)}
  </ul>
);

/** Intensity cell for aggregated % (number is always printed, colour is secondary). */
export const PctCell = ({ pct, count }) => {
  const a = pct >= 70 ? 'bg-emerald-600 text-white' : pct >= 50 ? 'bg-emerald-400 text-emerald-950' : pct >= 30 ? 'bg-emerald-200 text-emerald-950' : pct > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600';
  return <div className={cn('rounded-md px-1 py-1.5 text-center text-xs font-bold', a)} title={`${count} available (${pct}%)`}>{pct}%</div>;
};
