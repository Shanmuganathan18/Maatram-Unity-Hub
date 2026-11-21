import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
} from 'lucide-react';
import { navItems } from '../components/layout/navItems';
import DevTools from '../components/layout/DevTools';
import GlobalSearch from '../components/layout/GlobalSearch';
import { Avatar, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useOnline, useStore } from '../hooks/useStore';
import { unreadCount } from '../services/notificationService';
import { cn } from '../utils/cn';
import logo from '../assets/logo.svg';

const labels = {
  dashboard: 'Dashboard',
  people: 'People & Access',
  'institutions-zones': 'Institutions & Zones',
  'events-availability': 'Events & Availability',
  communication: 'Communication',
  reports: 'Reports & Analytics',
  settings: 'System Settings',
  'activity-logs': 'Activity Logs',
  support: 'Help & Support',
  zones: 'Zones',
  officers: 'Officers',
  institutions: 'Institutions',
  students: 'Students',
  users: 'Users',
  admins: 'Admin Management',
  availability: 'Availability Monitoring',
  events: 'Events',
  attendance: 'Attendance',
  'data-centre': 'Data Centre',
  notifications: 'Notifications',
  announcements: 'Announcements',
  roles: 'Roles',
  permissions: 'Permissions',
  profile: 'Profile',
  create: 'Create',
};

export default function AdminLayout() {
  const { aid, admin, signOut } = useAuth();
  const { can } = usePermissions();
  const nav = useNavigate();
  const loc = useLocation();
  const online = useOnline();
  useStore();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin-sidebar') === '1';
    } catch {
      return false;
    }
  });
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const ref = useRef(null);
  const unread = unreadCount(aid);

  const items = navItems.filter((n) => !n.perm || can(n.perm));

  useEffect(() => {
    try {
      localStorage.setItem('admin-sidebar', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setDrawer(false);
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.search]);

  const seg = loc.pathname.split('/').filter(Boolean);
  const logout = () => {
    signOut();
    nav('/login', { replace: true });
  };

  const crumbs = seg.map((s, i) => ({
    label: labels[s] ?? s,
    to: `/${seg.slice(0, i + 1).join('/')}`,
  }));

  const isParentActive = (item) => {
    if (loc.pathname === item.to) return true;
    if (item.to === '/people' && (loc.pathname === '/students' || loc.pathname === '/officers' || loc.pathname === '/admins' || loc.pathname === '/users' || loc.pathname.startsWith('/students/') || loc.pathname.startsWith('/officers/'))) return true;
    if (item.to === '/institutions-zones' && (loc.pathname === '/zones' || loc.pathname === '/institutions' || loc.pathname.startsWith('/zones/') || loc.pathname.startsWith('/institutions/'))) return true;
    if (item.to === '/events-availability' && (loc.pathname === '/availability' || loc.pathname === '/events' || loc.pathname === '/attendance' || loc.pathname.startsWith('/events/'))) return true;
    if (item.to === '/communication' && (loc.pathname === '/notifications' || loc.pathname === '/announcements')) return true;
    if (item.to === '/reports' && (loc.pathname === '/reports' || loc.pathname === '/data-centre')) return true;
    if (item.to === '/settings' && (loc.pathname === '/settings' || loc.pathname === '/roles' || loc.pathname === '/permissions')) return true;
    return false;
  };

  const isChildActive = (childTo) => {
    const fullPath = loc.pathname + loc.search;
    return fullPath === childTo;
  };

  const renderNavLinks = (compact) =>
    items.map((item) => {
      const { to, label, icon: Icon } = item;
      const active = isParentActive(item);

      return (
        <NavLink
          key={to}
          to={to}
          title={label}
          aria-label={label}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            compact && 'justify-center',
            active ? 'bg-brand-500/25 text-brand-200' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          )}
        >
          <span className="relative flex shrink-0 items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden />
            {to === '/communication' && unread > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
            )}
          </span>
          {!compact && <span className="truncate">{label}</span>}
        </NavLink>
      );
    });

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>

      {/* Main Admin Sidebar */}
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy p-3 md:flex',
          collapsed ? 'w-20' : 'w-64'
        )}
        aria-label="Primary"
      >
        <Link
          to="/dashboard"
          className={cn('mb-4 flex items-center gap-3 px-1 py-2', collapsed && 'justify-center')}
        >
          <img src={logo} alt="" className="h-10 w-10" />
          {!collapsed && (
            <span className="leading-tight">
              <span className="block text-lg font-extrabold text-white">Maatram</span>
              <span className="block text-xs text-slate-300">Admin Portal</span>
            </span>
          )}
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {renderNavLinks(collapsed)}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10',
            collapsed && 'justify-center'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              Collapse
            </>
          )}
        </button>

        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10',
            collapsed && 'justify-center'
          )}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && 'Logout'}
        </button>
      </aside>

      <div className={cn(collapsed ? 'md:pl-20' : 'md:pl-64')}>
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
          <button
            className="rounded-lg p-2 hover:bg-lavender-100 md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-navy sm:text-base">
              {crumbs.at(-1)?.label ?? 'Admin Portal'}
            </p>
            <nav aria-label="Breadcrumb" className="hidden truncate text-xs text-ink-mute sm:block">
              {crumbs.length > 1 ? (
                crumbs.map((c, i) => (
                  <span key={c.to}>
                    {i > 0 && ' / '}
                    {i < crumbs.length - 1 ? (
                      <Link className="hover:underline" to={c.to}>
                        {c.label}
                      </Link>
                    ) : (
                      c.label
                    )}
                  </span>
                ))
              ) : (
                admin.roleLabel
              )}
            </nav>
          </div>
          <GlobalSearch />
          <span
            className="ml-auto hidden items-center gap-1.5 rounded-pill border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 sm:flex lg:ml-0"
            title="Production Ready Single Admin Environment"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            System: Active
          </span>
          <Link
            to="/communication?tab=notifications"
            className="relative rounded-full p-2 hover:bg-lavender-100"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-lavender-100"
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label="Profile menu"
            >
              <Avatar student={admin} size="h-9 w-9 text-xs" />
              <ChevronDown className="hidden h-4 w-4 sm:block" />
            </button>
            {menu && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-lavender-200 bg-white p-2 shadow-pop"
              >
                <div className="border-b border-lavender-200 px-3 py-2">
                  <p className="font-bold text-navy">{admin.name}</p>
                  <p className="text-xs text-ink-mute">{admin.roleLabel}</p>
                </div>
                <Link
                  role="menuitem"
                  to="/profile"
                  className="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-lavender-100"
                >
                  My profile
                </Link>
                <button
                  role="menuitem"
                  onClick={logout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {!online && (
          <div
            role="status"
            className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"
          >
            <WifiOff className="h-4 w-4" />
            You are offline. Changes are not saved until you reconnect.
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Modal */}
      <Modal
        sheet
        open={drawer}
        onOpenChange={setDrawer}
        title="Admin Menu"
        description={`${admin.name} · ${admin.roleLabel}`}
      >
        <nav className="grid grid-cols-1 gap-2">
          {items.map(({ to, label, icon: Icon, children }) => (
            <div key={to} className="space-y-1">
              <Link
                to={to}
                className="flex min-h-[44px] items-center gap-3 rounded-xl border border-lavender-200 p-3 text-sm font-semibold text-navy"
              >
                <Icon className="h-5 w-5 shrink-0 text-brand-700" />
                <span className="truncate">{label}</span>
              </Link>
              {children && (
                <div className="grid grid-cols-2 gap-1.5 pl-3">
                  {children.map((ch) => (
                    <Link
                      key={ch.to}
                      to={ch.to}
                      className="rounded-lg bg-lavender-50 px-2 py-1.5 text-xs font-semibold text-brand-800"
                    >
                      {ch.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={logout}
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-800"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </nav>
      </Modal>

      <DevTools />
    </div>
  );
}
