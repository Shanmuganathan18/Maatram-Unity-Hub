import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MoreHorizontal, WifiOff } from 'lucide-react';
import { navItems, bottomNav } from '../components/layout/navItems';
import DevTools from '../components/layout/DevTools';
import { Avatar, Modal } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useOnline, useStore } from '../hooks/useStore';
import { unreadCount } from '../services/notificationService';
import { cn } from '../utils/cn';
import logo from '../assets/logo.svg';

const linkCls = ({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors md:justify-center lg:justify-start', isActive ? 'bg-brand-400/20 text-brand-200' : 'text-slate-300 hover:bg-white/10 hover:text-white');

export default function StudentLayout() {
  const { sid, student, signOut } = useAuth();
  const nav = useNavigate();
  const online = useOnline();
  const [more, setMore] = useState(false);
  useStore();
  const unread = unreadCount(sid);
  const logout = () => { signOut(); nav('/login', { replace: true }); };
  const extra = navItems.filter((n) => !bottomNav.includes(n.to));

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>

      {/* Sidebar: icons on tablet, full on desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-20 flex-col bg-navy p-3 md:flex lg:w-64" aria-label="Primary">
        <Link to="/dashboard" className="mb-6 flex items-center gap-3 px-1 py-2 md:justify-center lg:justify-start"><img src={logo} alt="" className="h-10 w-10" /><span className="hidden text-lg font-extrabold text-white lg:block">Maatram</span></Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} className={linkCls} title={label} aria-label={label}>
              <span className="relative"><I className="h-5 w-5" aria-hidden />{to === '/notifications' && unread > 0 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />}</span>
              <span className="hidden lg:block">{label}</span>
              {to === '/notifications' && unread > 0 && <span className="ml-auto hidden rounded-full bg-rose-500 px-2 text-xs text-white lg:block">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 md:justify-center lg:justify-start" aria-label="Log out"><LogOut className="h-5 w-5" /><span className="hidden lg:block">Log out</span></button>
      </aside>

      <div className="md:pl-20 lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white md:bg-white md:text-navy md:shadow-sm">
          <Link to="/dashboard" className="flex items-center gap-2 md:hidden"><img src={logo} alt="" className="h-8 w-8" /><span className="font-extrabold">Maatram</span></Link>
          <p className="hidden text-sm text-ink-soft md:block">{student.institution}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-pill bg-brand-400/20 px-3 py-1 text-xs font-bold text-brand-200 md:bg-brand-50 md:text-brand-800">{student.zone}</span>
            <Link to="/notifications" className="relative rounded-full p-2 hover:bg-white/10 md:hover:bg-lavender-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}</Link>
            <Link to="/profile" aria-label="My profile"><Avatar student={student} size="h-9 w-9 text-xs" /></Link>
          </div>
        </header>

        {!online && <div role="status" className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"><WifiOff className="h-4 w-4" />You are offline. Saving and submitting need a connection (offline drafts are a later enhancement).</div>}

        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-lavender-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary mobile">
        {navItems.filter((n) => bottomNav.includes(n.to)).map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-ink-mute')}>
            <I className="h-5 w-5" aria-hidden />{to === '/notifications' ? 'Activity' : label}
            {to === '/notifications' && unread > 0 && <span className="absolute right-4 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden />}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-mute" aria-label="More menu"><MoreHorizontal className="h-5 w-5" />More</button>
      </nav>
      <Modal sheet open={more} onOpenChange={setMore} title="More" description="Other pages in the Student Portal">
        <div className="grid grid-cols-2 gap-2">
          {extra.map(({ to, label, icon: I }) => <Link key={to} to={to} onClick={() => setMore(false)} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-lavender-200 p-3 text-sm font-semibold text-navy"><I className="h-5 w-5 text-brand-700" />{label}</Link>)}
          <button onClick={logout} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-800"><LogOut className="h-5 w-5" />Log out</button>
        </div>
      </Modal>
      <DevTools />
    </div>
  );
}
