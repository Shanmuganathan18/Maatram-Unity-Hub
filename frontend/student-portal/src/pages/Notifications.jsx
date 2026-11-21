import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BellOff, CheckCheck } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader } from '../components/ui';
import { notifIcon } from '../components/notifications/notifMeta';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { listNotifications, markAllRead, markRead } from '../services/notificationService';
import { notificationCategories } from '../config/appConfig';
import { fmtInstant, relativeTime } from '../utils/dates';
import { cn } from '../utils/cn';

export default function Notifications() {
  usePageTitle('Notifications');
  const { sid } = useAuth();
  useStore();
  const nowMs = useNow(60000);
  const nav = useNavigate();
  const [cat, setCat] = useState('all');
  const [read, setRead] = useState('all');
  const all = listNotifications(sid);
  const list = all.filter((n) => (cat === 'all' || n.category === cat) && (read === 'all' || (read === 'unread' ? !n.read : n.read)));
  const unread = all.filter((n) => !n.read).length;
  const label = (id) => notificationCategories.find((c) => c.id === id)?.label;

  const open = async (n) => {
    await markRead(sid, n.id);
    if (n.link?.type === 'event') nav(`/events/${n.link.eventId}`);
    else if (n.link?.type === 'week') nav(`/availability?week=${n.link.weekStart}`);
  };
  return (
    <>
      <PageHeader title="Notifications" subtitle="In-app updates only. Email, SMS and WhatsApp delivery will come with the backend." actions={<Button variant="outline" size="sm" disabled={!unread} onClick={async () => { await markAllRead(sid); toast.success('All notifications marked as read.'); }}><CheckCheck className="h-4 w-4" />Mark all read ({unread})</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="ncat">Category</label>
        <select id="ncat" className="field max-w-[280px]" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{notificationCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <div role="tablist" aria-label="Read status" className="flex gap-2">{['all', 'unread', 'read'].map((r) => <button key={r} role="tab" aria-selected={read === r} onClick={() => setRead(r)} className={cn('min-h-[44px] rounded-pill border px-4 text-sm font-semibold capitalize', read === r ? 'border-navy bg-navy text-white' : 'border-lavender-300 bg-white text-navy')}>{r}</button>)}</div>
      </div>
      {list.length === 0 ? <EmptyState icon={BellOff} title="Nothing to show" text="No notifications match these filters." /> : (
        <ul className="space-y-2">{list.map((n) => { const I = notifIcon(n.category); return (
          <li key={n.id} className="flex items-stretch gap-2">
            <button onClick={() => open(n)} className={cn('card flex flex-1 gap-3 p-4 text-left', !n.read && 'border-brand-300 bg-brand-50/50')}>
              <I className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={cn('text-sm', n.read ? 'font-medium' : 'font-bold text-navy')}>{n.title}</span>{!n.read && <Badge className="border-brand-400 bg-brand-100 text-brand-900">Unread</Badge>}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{n.body}</span><span className="mt-1 block text-xs text-ink-mute" title={fmtInstant(n.createdAt)}>{label(n.category)} · {relativeTime(n.createdAt, nowMs)}</span></span>
            </button>
            {!n.read && <Button variant="outline" size="sm" className="self-center" onClick={() => markRead(sid, n.id)} aria-label={`Mark "${n.title}" as read`}>Mark read</Button>}
          </li>); })}</ul>)}
    </>
  );
}
