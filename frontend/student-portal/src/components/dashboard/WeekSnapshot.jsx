import { Link } from 'react-router-dom';
import { fmtDayNum, fmtWeekday, todayIST } from '../../utils/dates';
import { statusMeta } from '../../utils/statusMeta';
import { cn } from '../../utils/cn';

const dayLabel = { available: 'Free', unavailable: 'Busy', none: '—' };
export default function WeekSnapshot({ info, days, nowMs }) {
  const today = todayIST(nowMs);
  const assumed = info.state === 'system_assumed_unavailable';
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Weekly availability snapshot">
      {days.map((d) => {
        const st = assumed ? 'system_assumed_unavailable' : info.record?.days[d]?.status ?? 'none';
        const m = statusMeta[st]; const I = m.icon;
        return (
          <li key={d}>
            <Link to={`/availability?week=${info.weekStart}`} className={cn('flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center', m.cls, today === d && 'ring-2 ring-brand-600')} aria-label={`${fmtWeekday(d)} ${fmtDayNum(d)}: ${m.label}`}>
              <span className="text-[10px] font-bold uppercase sm:text-xs">{fmtWeekday(d)}</span>
              <span className="text-base font-extrabold sm:text-lg">{fmtDayNum(d)}</span>
              <I className="h-4 w-4" aria-hidden />
              <span className="text-[10px] font-semibold sm:text-xs">{assumed ? 'Assumed' : info.state === 'draft' && st !== 'none' ? `Draft` : dayLabel[st]}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
