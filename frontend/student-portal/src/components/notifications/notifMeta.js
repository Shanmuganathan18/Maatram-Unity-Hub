import { Bell, CalendarClock, CalendarPlus, CheckCheck, Megaphone, RefreshCw, Ban, Timer, AlarmClock } from 'lucide-react';

const map = {
  availability_reminder: AlarmClock, deadline_reminder: Timer, submission_confirmation: CheckCheck, event_invitation: CalendarPlus,
  event_updated: RefreshCw, event_postponed: CalendarClock, event_cancelled: Ban, event_reminder: Bell, announcement: Megaphone,
};
export const notifIcon = (c) => map[c] ?? Bell;
