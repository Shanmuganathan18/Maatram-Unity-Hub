import { CheckCircle2, XCircle, CircleDashed, PencilLine, CheckCheck, Lock, ShieldAlert, Hourglass, Clock, Ban, CalendarClock, RefreshCw, Archive } from 'lucide-react';

// Every status has an ICON + LABEL + colour (never colour alone).
export const statusMeta = {
  available: { label: 'Available', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  unavailable: { label: 'Unavailable', icon: XCircle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  none: { label: 'Not selected', icon: CircleDashed, cls: 'bg-slate-50 text-slate-600 border-slate-300 border-dashed' },
  not_started: { label: 'Not started', icon: CircleDashed, cls: 'bg-slate-50 text-slate-700 border-slate-300' },
  draft: { label: 'Draft', icon: PencilLine, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  submitted: { label: 'Submitted', icon: CheckCheck, cls: 'bg-brand-50 text-brand-800 border-brand-300' },
  locked: { label: 'Locked', icon: Lock, cls: 'bg-slate-100 text-slate-800 border-slate-400' },
  system_assumed_unavailable: { label: 'System-Assumed Unavailable', icon: ShieldAlert, cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  // invitation responses
  pending: { label: 'Pending', icon: Hourglass, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  accepted: { label: 'Accepted', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  declined: { label: 'Declined', icon: XCircle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  withdrawn: { label: 'Withdrawn', icon: RefreshCw, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  // event statuses
  upcoming: { label: 'Upcoming', icon: Clock, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  updated: { label: 'Updated', icon: RefreshCw, cls: 'bg-violet-50 text-violet-800 border-violet-300' },
  postponed: { label: 'Postponed', icon: CalendarClock, cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  cancelled: { label: 'Cancelled', icon: Ban, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  completed: { label: 'Completed', icon: Archive, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
};
