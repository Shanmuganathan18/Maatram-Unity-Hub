import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, DataTable, EmptyState, FilterBar, Modal, Notice, PageHeader, Pagination, SearchInput, SelectField } from '../components/ui';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { exportLogs, listLogs, logFilterOptions, fetchLogsLive } from '../services/auditService';
import { studentFilterOptions } from '../services/studentService';
import { downloadFile } from '../utils/exportFiles';
import { fmtInstant } from '../utils/dates';
import { roleLabel, adminRoleIds } from '../config/permissions';
import { zoneShort } from '../services/metrics';

const D = { q: '', user: '', role: '', zone: '', category: '', from: '', to: '', page: '1' };
const rel = (r) => (!r ? '—' : ({ event: `/events/${r.id}`, zone: `/zones/${r.id}`, officer: `/officers/${r.id}`, institution: `/institutions/${r.id}`, student: `/students/${r.id}` }[r.type] ? <Link className="text-brand-700 underline" to={{ event: `/events/${r.id}`, zone: `/zones/${r.id}`, officer: `/officers/${r.id}`, institution: `/institutions/${r.id}`, student: `/students/${r.id}` }[r.type]}>{r.label}</Link> : r.label));

export default function ActivityLogs() {
  usePageTitle('Activity logs');
  const { aid } = useAuth();
  useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [det, setDet] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activeEffect = true;
    const loadLive = async () => {
      setLoading(true);
      const res = await fetchLogsLive({
        q: f.q,
        role: f.role,
        zoneId: f.zone,
        category: f.category,
        page: Number(f.page) || 1,
        pageSize: 12,
      });
      if (activeEffect && res) {
        setLiveData(res);
      }
      if (activeEffect) setLoading(false);
    };
    loadLive();
    return () => {
      activeEffect = false;
    };
  }, [f.q, f.role, f.zone, f.category, f.page]);

  const fallback = listLogs(aid, { q: f.q, actorId: f.user, role: f.role, zoneId: f.zone, category: f.category, from: f.from, to: f.to, page: Number(f.page) });
  const r = liveData || fallback;
  const o = logFilterOptions();
  const exp = (fmt) => { try { downloadFile(exportLogs(aid, { q: f.q, actorId: f.user, role: f.role, zoneId: f.zone, category: f.category, from: f.from, to: f.to }, fmt)); toast.success(`${fmt.toUpperCase()} downloaded.`); } catch (e) { toast.error(e.message); } };
  return (<>
    <PageHeader title="Activity & audit logs" subtitle="Append-only history. No edit or delete exists; secrets such as passwords and tokens are never logged." actions={<Can perm="audit.export"><Button variant="secondary" onClick={() => exp('xls')}><FileDown className="h-4 w-4" />Excel</Button><Button onClick={() => exp('csv')}><FileDown className="h-4 w-4" />CSV</Button></Can>} />
    <FilterBar onClear={clear} active={active}>
      <SearchInput id="lq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Action, description, person" />
      <SelectField id="lu" label="User" value={f.user} onChange={(v) => set({ user: v })} options={o.users} /><SelectField id="lr" label="Role" value={f.role} onChange={(v) => set({ role: v })} options={[...adminRoleIds, 'zone_officer'].map((x) => ({ value: x, label: roleLabel(x) }))} />
      <SelectField id="lz" label="Zone" value={f.zone} onChange={(v) => set({ zone: v })} options={studentFilterOptions().zones} /><SelectField id="lc" label="Category" value={f.category} onChange={(v) => set({ category: v })} options={o.categories} />
      <div><label htmlFor="lf" className="label">From</label><input id="lf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div><div><label htmlFor="lt" className="label">To</label><input id="lt" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
    </FilterBar>
    <Card className="p-0 sm:p-0"><DataTable caption="Audit log" rows={r.rows} empty={<EmptyState icon={ScrollText} title="No log entries match" />}
      columns={[{ key: 'id', label: 'Log ID', render: (a) => <button className="font-mono text-xs text-navy hover:underline" onClick={() => setDet(a)}>{a.id}</button> }, { key: 'a', label: 'Action', render: (a) => <Badge className="border-lavender-300 bg-lavender-50 text-navy">{a.action}</Badge> }, { key: 'u', label: 'User', render: (a) => a.actorName }, { key: 'r', label: 'Role', render: (a) => roleLabel(a.actorRole) }, { key: 'z', label: 'Zone', render: (a) => (a.zoneId ? zoneShort(a.zoneId) : '—') }, { key: 'rl', label: 'Related', render: (a) => rel(a.related) }, { key: 'd', label: 'Description', render: (a) => a.description }, { key: 'w', label: 'Date & time', render: (a) => fmtInstant(a.at) }]}
      renderCard={(a) => <div><button className="font-mono text-xs font-bold text-navy" onClick={() => setDet(a)}>{a.id}</button><p className="text-sm font-semibold">{a.description}</p><p className="text-xs text-ink-soft">{a.actorName} · {fmtInstant(a.at)}</p></div>} />
      <Pagination page={r.page} pages={r.pages} total={r.total} pageSize={12} onPage={(p) => set({ page: p })} /></Card>
    <Modal open={!!det} onOpenChange={(o) => !o && setDet(null)} title={det?.id ?? ''} description="Read-only audit entry" footer={<Button variant="outline" onClick={() => setDet(null)}>Close</Button>}>
      {det && <dl className="grid gap-3 text-sm">{[['Action', det.action], ['Category', det.category], ['User', `${det.actorName} (${roleLabel(det.actorRole)})`], ['Zone', det.zoneId ? zoneShort(det.zoneId) : '—'], ['Related record', det.related ? `${det.related.type}: ${det.related.label}` : '—'], ['Date & time (IST)', fmtInstant(det.at)], ['Description', det.description]].map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{v}</dd></div>)}<Notice tone="neutral">Entries cannot be modified or deleted from the portal.</Notice></dl>}</Modal>
  </>);
}
