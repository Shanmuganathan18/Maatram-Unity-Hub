import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BellOff, CheckCheck } from 'lucide-react';
import { Badge, Button, EmptyState, FilterBar, Modal, PageHeader, SelectField, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { listNotifications, markAllRead, markRead } from '../services/notificationService';
import { notificationCategories } from '../config/appConfig';
import { fmtInstant, relativeTime } from '../utils/dates';
import { cn } from '../utils/cn';

export default function Notifications() {
  usePageTitle('Notifications'); const { aid } = useAuth(); useStore(); const nowMs = useNow(60000); const nav = useNavigate(); const [f, setF] = useState({ category: '', read: 'all', from: '', to: '' }); const [sel, setSel] = useState(null);
  const all = listNotifications(aid); const list = listNotifications(aid, f); const unread = all.filter((n) => !n.read).length;
  return (<>
    <PageHeader title="Notification centre" subtitle="In-app only in this prototype. Email, SMS and WhatsApp delivery will be added with the backend." actions={<Button variant="outline" disabled={!unread} onClick={async () => { await markAllRead(aid); toast.success('All notifications marked as read.'); }}><CheckCheck className="h-4 w-4" />Mark all read ({unread})</Button>} />
    <Tabs label="Read status" value={f.read} onChange={(read) => setF({ ...f, read })} tabs={[{ id: 'all', label: 'All', count: all.length }, { id: 'unread', label: 'Unread', count: unread }, { id: 'read', label: 'Read', count: all.length - unread }]} />
    <FilterBar onClear={() => setF({ category: '', read: 'all', from: '', to: '' })} active={!!(f.category || f.from || f.to)}>
      <SelectField id="nc" label="Category" value={f.category} onChange={(category) => setF({ ...f, category })} options={Object.entries(notificationCategories).map(([value, label]) => ({ value, label }))} />
      <div><label htmlFor="nf" className="label">From date</label><input id="nf" type="date" className="field" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div><div><label htmlFor="nt" className="label">To date</label><input id="nt" type="date" className="field" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
    </FilterBar>
    {list.length === 0 ? <EmptyState icon={BellOff} title="Nothing to show" text="No notifications match these filters." /> : <ul className="space-y-2">{list.map((n) => <li key={n.id} className="flex items-stretch gap-2"><button onClick={async () => { await markRead(aid, n.id); setSel(n); }} className={cn('card flex-1 p-4 text-left', !n.read && 'border-brand-300 bg-brand-50/50')}>
      <span className="flex flex-wrap items-center gap-2"><span className={cn('text-sm', n.read ? 'font-medium' : 'font-bold text-navy')}>{n.title}</span>{!n.read && <Badge className="border-brand-400 bg-brand-100 text-brand-900">Unread</Badge>}<Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">{notificationCategories[n.category]}</Badge></span><span className="mt-1 block text-sm text-ink-soft">{n.body}</span><span className="mt-1 block text-xs text-ink-mute">{relativeTime(n.createdAt, nowMs)}</span></button>
      {!n.read && <Button variant="outline" size="sm" className="self-center" onClick={() => markRead(aid, n.id)} aria-label={`Mark "${n.title}" as read`}>Mark read</Button>}</li>)}</ul>}
    <Modal open={!!sel} onOpenChange={(o) => !o && setSel(null)} title={sel?.title ?? ''} description={sel ? `${notificationCategories[sel.category]} · ${fmtInstant(sel.createdAt)}` : ''} footer={<><Button variant="outline" onClick={() => setSel(null)}>Close</Button>{sel?.link && <Button onClick={() => { nav(sel.link); setSel(null); }}>Open related page</Button>}</>}><p className="text-sm">{sel?.body}</p></Modal>
  </>);
}
