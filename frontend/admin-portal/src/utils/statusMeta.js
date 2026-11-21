import { LifeBuoy, MessageSquare, ShieldCheck, Megaphone, CalendarCheck2, FileEdit, AlertTriangle, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, CircleDashed, PencilLine, CheckCheck, Lock, ShieldAlert, Hourglass, Clock, Ban, CalendarClock, PlayCircle, Archive, UserCheck, UserX, UserMinus, Undo2, ListOrdered, Rocket, Mail, Building2 } from 'lucide-react';

// Every status = icon + label + colour (never colour alone).
export const statusMeta = {
  available: { label: 'Available', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  unavailable: { label: 'Unavailable', icon: XCircle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  not_selected: { label: 'Not selected', icon: CircleDashed, cls: 'bg-slate-50 text-slate-700 border-slate-300 border-dashed' },
  draft: { label: 'Draft', icon: PencilLine, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  not_submitted: { label: 'Not submitted', icon: Hourglass, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  system_assumed_unavailable: { label: 'System-assumed unavailable', icon: ShieldAlert, cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  submitted: { label: 'Submitted', icon: CheckCheck, cls: 'bg-brand-50 text-brand-800 border-brand-300' },
  locked: { label: 'Locked', icon: Lock, cls: 'bg-slate-100 text-slate-800 border-slate-400' },
  open: { label: 'Open', icon: Clock, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  // event statuses
  published: { label: 'Published', icon: Rocket, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  invitations_open: { label: 'Invitations Open', icon: Mail, cls: 'bg-brand-50 text-brand-800 border-brand-300' },
  in_progress: { label: 'In Progress', icon: PlayCircle, cls: 'bg-violet-50 text-violet-800 border-violet-300' },
  completed: { label: 'Completed', icon: Archive, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  postponed: { label: 'Postponed', icon: CalendarClock, cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  cancelled: { label: 'Cancelled', icon: Ban, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  // responses
  pending: { label: 'Pending', icon: Hourglass, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  accepted: { label: 'Accepted', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  declined: { label: 'Declined', icon: XCircle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  withdrawn: { label: 'Withdrawn', icon: Undo2, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  waitlisted: { label: 'Waitlisted', icon: ListOrdered, cls: 'bg-violet-50 text-violet-800 border-violet-300' },
  // attendance
  present: { label: 'Present', icon: UserCheck, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  absent: { label: 'Absent', icon: UserX, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  excused: { label: 'Excused', icon: UserMinus, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  not_marked: { label: 'Not marked', icon: CircleDashed, cls: 'bg-slate-50 text-slate-600 border-slate-300 border-dashed' },
  // institution
  Active: { label: 'Active', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  Onboarding: { label: 'Onboarding', icon: Building2, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  Inactive: { label: 'Inactive', icon: Ban, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  // participation
  Attended: { label: 'Attended', icon: UserCheck, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  Confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'bg-brand-50 text-brand-800 border-brand-300' },
  Invited: { label: 'Invited', icon: Mail, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  'Not invited': { label: 'Not invited', icon: CircleDashed, cls: 'bg-slate-50 text-slate-600 border-slate-300' },

  // account statuses
  Suspended: { label: 'Suspended', icon: Ban, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  'Pending Activation': { label: 'Pending Activation', icon: Hourglass, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  Archived: { label: 'Archived', icon: Archive, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  // tickets
  Open: { label: 'Open', icon: LifeBuoy, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  'In Progress': { label: 'In Progress', icon: PlayCircle, cls: 'bg-violet-50 text-violet-800 border-violet-300' },
  'Waiting for User': { label: 'Waiting for User', icon: MessageSquare, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  Resolved: { label: 'Resolved', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  Closed: { label: 'Closed', icon: Archive, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  Low: { label: 'Low', icon: CircleDashed, cls: 'bg-slate-50 text-slate-700 border-slate-300' },
  Medium: { label: 'Medium', icon: Clock, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  High: { label: 'High', icon: AlertTriangle, cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  Urgent: { label: 'Urgent', icon: AlertTriangle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  // announcements
  scheduled: { label: 'Scheduled', icon: CalendarCheck2, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  expired: { label: 'Expired', icon: Archive, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  // approval
  approved: { label: 'Approved', icon: ThumbsUp, cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Rejected', icon: ThumbsDown, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  changes_requested: { label: 'Changes requested', icon: FileEdit, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  // alert severity
  high: { label: 'High', icon: AlertTriangle, cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  medium: { label: 'Medium', icon: AlertTriangle, cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  low: { label: 'Low', icon: ShieldCheck, cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  Admin: { label: 'Admin', icon: ShieldCheck, cls: 'bg-lavender-100 text-navy border-lavender-300' }, Announcement: { label: 'Announcement', icon: Megaphone, cls: 'bg-lavender-100 text-navy border-lavender-300' },
};
