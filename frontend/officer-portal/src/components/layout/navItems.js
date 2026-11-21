import { LayoutDashboard, Users, Building2, CalendarCheck, CalendarDays, Ticket, BarChart3, Bell, ScrollText, UserRound } from 'lucide-react';
export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/institutions', label: 'Institutions', icon: Building2 },
  { to: '/availability', label: 'Availability', icon: CalendarCheck },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/events', label: 'Events', icon: Ticket },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/activity', label: 'Activity Log', icon: ScrollText },
  { to: '/profile', label: 'Profile', icon: UserRound },
];
