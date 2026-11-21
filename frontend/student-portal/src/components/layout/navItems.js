import { LayoutDashboard, CalendarCheck, CalendarDays, Ticket, ClipboardCheck, Bell, History, Settings, UserRound, CircleHelp } from 'lucide-react';

export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/availability', label: 'Availability', icon: CalendarCheck },
  { to: '/calendar', label: 'My Calendar', icon: CalendarDays },
  { to: '/events', label: 'Events', icon: Ticket },
  { to: '/responses', label: 'My Responses', icon: ClipboardCheck },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/availability-history', label: 'History', icon: History },
  { to: '/settings/notifications', label: 'Preferences', icon: Settings },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/help', label: 'Help & FAQ', icon: CircleHelp },
];
export const bottomNav = ['/dashboard', '/availability', '/events', '/notifications'];
