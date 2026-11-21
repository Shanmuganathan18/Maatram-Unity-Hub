import { AlertTriangle, Lock, ShieldAlert, Timer } from 'lucide-react';
import { Progress, StatusBadge } from '../ui';
import { countdown, deadlineWindowStart, fmtCountdown, fmtDeadline } from '../../utils/dates';
import { cn } from '../../utils/cn';
import { appConfig } from '../../config/appConfig';

/** Deadline + live countdown (uses the configured deadline and demo clock, never a fake timer). */
export default function DeadlineBanner({ info, nowMs, compact }) {
  const { open, deadline, state, closesSoon, weekStart } = info;
  const cd = countdown(deadline - nowMs);
  const pct = ((nowMs - deadlineWindowStart(weekStart)) / (deadline - deadlineWindowStart(weekStart))) * 100;
  const tone = !open ? 'border-slate-300 bg-slate-50' : closesSoon ? 'border-rose-300 bg-rose-50' : 'border-lavender-300 bg-lavender-50';
  return (
    <div className={cn('rounded-2xl border p-4', tone)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Timer className="h-4 w-4" aria-hidden />Deadline: {fmtDeadline(deadline)} IST</div>
        <StatusBadge kind={state} />
      </div>
      {open ? (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-2xl font-extrabold tabular-nums text-navy" aria-label="Time remaining">{fmtCountdown(cd)}</p>
            {closesSoon && <span className="flex items-center gap-1 text-sm font-bold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />Closes soon</span>}
          </div>
          {!compact && <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-ink-soft"><span>Submission window</span><span>{Math.round(Math.max(0, Math.min(100, pct)))}% elapsed</span></div><Progress value={pct} label="Submission window elapsed" tone={closesSoon ? 'bg-rose-600' : 'bg-brand-600'} /></div>}
        </>
      ) : (
        <p className="mt-2 flex items-start gap-2 text-sm text-ink">
          {state === 'locked' ? <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" aria-hidden />}
          {state === 'locked' ? 'The window has closed. Your submission is locked and read-only.' : 'The window closed without a submitted availability, so this week is recorded as System-Assumed Unavailable.'}
        </p>
      )}
      {!compact && <p className="mt-2 text-xs text-ink-mute">Deadline rule is a configurable prototype assumption ({appConfig.timezone}).</p>}
    </div>
  );
}
