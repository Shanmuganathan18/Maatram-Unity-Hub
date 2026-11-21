/**
 * src/components/layout/navItems.js
 *
 * Consolidated 9-item administrative navigation hierarchy:
 * 1. Dashboard: Overall platform overview.
 * 2. People & Access: Students, Officers, Admins, All Accounts, Activation, and Import History.
 * 3. Institutions & Zones: Regional Zones, Partner Institutions, Academic Departments.
 * 4. Events & Availability: Availability monitoring, Events, and Attendance records.
 * 5. Notifications & Communication: Credential Email Centre, Notifications, Announcements.
 * 6. Reports & Analytics: Performance Overview and Dataset Export Centre.
 * 7. System Settings: General, Security, Roles & Permissions, and Configuration.
 * 8. Activity & Audit Logs: System audit trail and event history.
 * 9. Help & Support: Inbound user tickets and support triage.
 */
import {
  LayoutDashboard,
  UsersRound,
  Building2,
  CalendarCheck,
  Megaphone,
  BarChart3,
  Settings,
  ScrollText,
  LifeBuoy,
} from 'lucide-react';

export const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    perm: 'reports.view',
  },
  {
    to: '/people',
    label: 'People & Access',
    icon: UsersRound,
    perm: 'users.view',
  },
  {
    to: '/institutions-zones',
    label: 'Institutions & Zones',
    icon: Building2,
    perm: 'institutions.view',
  },
  {
    to: '/events-availability',
    label: 'Events & Availability',
    icon: CalendarCheck,
    perm: 'availability.view',
  },
  {
    to: '/communication',
    label: 'Communication',
    icon: Megaphone,
    perm: 'announcements.view',
  },
  {
    to: '/reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    perm: 'reports.view',
  },
  {
    to: '/settings',
    label: 'System Settings',
    icon: Settings,
    perm: 'settings.view',
  },
  {
    to: '/activity-logs',
    label: 'Activity Logs',
    icon: ScrollText,
    perm: 'audit.view',
  },
  {
    to: '/support',
    label: 'Help & Support',
    icon: LifeBuoy,
    perm: 'support.view',
  },
];
