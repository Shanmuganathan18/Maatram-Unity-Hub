import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, WifiOff } from 'lucide-react';
import { navItems } from '../components/layout/navItems';
import DevTools from '../components/layout/DevTools';
import { Avatar, Modal } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useOnline, useStore } from '../hooks/useStore';
import { unreadCount } from '../services/notificationService';
import { cn } from '../utils/cn';
import logo from '../assets/logo.svg';

const titles = { dashboard: 'Dashboard', students: 'Students', institutions: 'Institutions', availability: 'Availability', calendar: 'Planning Calendar', events: 'Events', reports: 'Reports & Analytics', notifications: 'Notifications', activity: 'Activity Log', profile: 'Profile' };

export default function OfficerLayout() {
  const { oid, officer, signOut } = useAuth();
  const nav = useNavigate(); const loc = useLocation();
  const online = useOnline(); useStore();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('officer-sidebar') === '1'; } catch { return false; } });
  const [menu, setMenu] = useState(false); const [drawer, setDrawer] = useState(false); const [q, setQ] = useState('');
  const ref = useRef(null);
  const unread = unreadCount(oid);
  useEffect(() => { try { localStorage.setItem('officer-sidebar', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { setDrawer(false); setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const seg = loc.pathname.split('/').filter(Boolean);
  const logout = () => { signOut(); nav('/login', { replace: true }); };
  const search = (e) => { e.preventDefault(); nav(`/students?q=${encodeURIComponent(q.trim())}`); setQ(''); };

  const links = (compact, onClick) => navItems.map(({ to, label, icon: I }) => (
    <NavLink key={to} to={to} onClick={onClick} title={label} aria-label={label} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', compact && 'justify-center', isActive ? 'bg-brand-400/20 text-brand-200' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
      <span className="relative"><I className="h-5 w-5" aria-hidden />{to === '/notifications' && unread > 0 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />}</span>
      {!compact && <span>{label}</span>}{!compact && to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 text-xs text-white">{unread}</span>}
    </NavLink>));

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <aside className={cn('no-print fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy p-3 md:flex', collapsed ? 'w-20' : 'w-64')} aria-label="Primary">
        <Link to="/dashboard" className={cn('mb-5 flex items-center gap-3 px-1 py-2', collapsed && 'justify-center')}><img src={logo} alt="" className="h-10 w-10" />{!collapsed && <span className="leading-tight"><span className="block text-lg font-extrabold text-white">Maatram</span><span className="block text-xs text-slate-300">Officer Portal</span></span>}</Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">{links(collapsed)}</nav>
        <button onClick={() => setCollapsed((c) => !c)} className={cn('mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10', collapsed && 'justify-center')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5" />Collapse</>}</button>
        <button onClick={logout} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10', collapsed && 'justify-center')} aria-label="Log out"><LogOut className="h-5 w-5" />{!collapsed && 'Logout'}</button>
      </aside>

      <div className={cn(collapsed ? 'md:pl-20' : 'md:pl-64')}>
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
          <button className="rounded-lg p-2 hover:bg-lavender-100 md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="truncate text-sm font-extrabold text-navy sm:text-base">{titles[seg[0]] ?? 'Officer Portal'}</p>
            <p className="hidden truncate text-xs text-ink-mute sm:block">{seg.length > 1 ? `${titles[seg[0]] ?? seg[0]} / ${seg.slice(1).join(' / ')}` : `${officer.zoneLabel}`}</p></div>
          <form onSubmit={search} role="search" className="ml-auto hidden max-w-xs flex-1 lg:block"><label htmlFor="gs" className="sr-only">Search students</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-mute" /><input id="gs" className="field min-h-[40px] pl-9" placeholder="Search students by name or ID" value={q} onChange={(e) => setQ(e.target.value)} /></div></form>
          <span className="ml-auto rounded-pill bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 lg:ml-0" title="Assigned zone (read-only)">{officer.zoneLabel}</span>
          <Link to="/notifications" className="relative rounded-full p-2 hover:bg-lavender-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}</Link>
          <div className="relative" ref={ref}>
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-lavender-100" aria-haspopup="menu" aria-expanded={menu} aria-label="Profile menu"><Avatar student={officer} size="h-9 w-9 text-xs" /><ChevronDown className="hidden h-4 w-4 sm:block" /></button>
            {menu && <div role="menu" className="absolute right-0 mt-2 w-60 rounded-2xl border border-lavender-200 bg-white p-2 shadow-pop">
              <div className="border-b border-lavender-200 px-3 py-2"><p className="font-bold text-navy">{officer.name}</p><p className="text-xs text-ink-mute">{officer.designation} · {officer.zoneLabel}</p></div>
              <Link role="menuitem" to="/profile" className="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-lavender-100">My profile</Link>
              <button role="menuitem" onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">Logout</button></div>}
          </div>
        </header>
        {!online && <div role="status" className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"><WifiOff className="h-4 w-4" />You are offline. Changes are not saved until you reconnect (offline sync is a later enhancement).</div>}
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6"><Outlet /></main>
      </div>

      <Modal sheet open={drawer} onOpenChange={setDrawer} title="Menu" description={`${officer.name} · ${officer.zoneLabel}`}>
        <nav className="grid grid-cols-2 gap-2">{navItems.map(({ to, label, icon: I }) => <Link key={to} to={to} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-lavender-200 p-3 text-sm font-semibold text-navy"><I className="h-5 w-5 text-brand-700" />{label}</Link>)}
          <button onClick={logout} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-800"><LogOut className="h-5 w-5" />Logout</button></nav>
      </Modal>
      <DevTools />
    </div>
  );
}
