import { CheckCircle2, XCircle } from 'lucide-react';
import { appConfig } from '../../config/appConfig';
import { fmtDayNum, fmtWeekday, fmtDate } from '../../utils/dates';
import { StatusBadge } from '../ui';
import { cn } from '../../utils/cn';

const ring = { available: 'border-emerald-400 bg-emerald-50/60', unavailable: 'border-rose-300 bg-rose-50/60', none: 'border-dashed border-lavender-300 bg-white' };

export default function DayCard({ date, day, readOnly, today, onStatus, onSlot }) {
  const weekend = ['Sat', 'Sun'].includes(fmtWeekday(date));
  const name = fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className={cn('rounded-2xl border-2 p-3 transition-colors', ring[day.status])} role="group" aria-label={name}>
      <div className="flex items-center justify-between sm:block">
        <div className="flex items-baseline gap-2 sm:block sm:text-center">
          <p className={cn('text-xs font-bold uppercase tracking-wide', weekend ? 'text-brand-700' : 'text-ink-mute')}>{fmtWeekday(date)}{weekend && ' · weekend'}</p>
          <p className="text-2xl font-extrabold text-navy">{fmtDayNum(date)}{today && <span className="ml-1 align-middle text-[10px] font-bold text-brand-700">TODAY</span>}</p>
        </div>
        <div className="sm:mt-2 sm:text-center"><StatusBadge kind={day.status} /></div>
      </div>
      {!readOnly && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={day.status === 'available'} onClick={() => onStatus(date, 'available')} className={cn('flex min-h-[44px] items-center justify-center gap-1 rounded-xl border text-sm font-semibold', day.status === 'available' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-lavender-300 bg-white text-navy hover:bg-emerald-50')}><CheckCircle2 className="h-4 w-4" aria-hidden />Free</button>
          <button type="button" aria-pressed={day.status === 'unavailable'} onClick={() => onStatus(date, 'unavailable')} className={cn('flex min-h-[44px] items-center justify-center gap-1 rounded-xl border text-sm font-semibold', day.status === 'unavailable' ? 'border-rose-600 bg-rose-600 text-white' : 'border-lavender-300 bg-white text-navy hover:bg-rose-50')}><XCircle className="h-4 w-4" aria-hidden />Busy</button>
        </div>
      )}
      {appConfig.features.timeSlots && day.status === 'available' && (
        <div className="mt-3">
          {!readOnly && <p className="mb-1 text-xs text-ink-soft">Optional: pick the parts of the day you are free. None picked = whole day.</p>}
          <div className="flex flex-wrap gap-1.5">
            {appConfig.slots.map((s) => {
              const on = day.slots.includes(s.id);
              return readOnly ? (on && <span key={s.id} className="rounded-pill border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-800">{s.label}</span>)
                : <button key={s.id} type="button" aria-pressed={on} title={s.range} onClick={() => onSlot(date, s.id)} className={cn('min-h-[40px] rounded-pill border px-3 text-xs font-semibold', on ? 'border-brand-700 bg-brand-700 text-white' : 'border-lavender-300 bg-white text-navy')}>{s.label}</button>;
            })}
            {readOnly && day.slots.length === 0 && <span className="text-xs text-ink-soft">Whole day</span>}
          </div>
        </div>
      )}
    </div>
  );
}
