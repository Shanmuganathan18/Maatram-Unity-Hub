import { useState } from 'react';
import { Eye, Megaphone, Send, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Field, Modal, Notice, PageHeader, PendingTag, StatusBadge } from '../components/ui';
import { CheckGroup } from '../components/announcements/CheckGroup';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { audienceAllowed, audiences, listAnnouncements, publishDraft, saveAnnouncement, validate } from '../services/announcementService';
import { studentFilterOptions } from '../services/studentService';
import { fmtInstant } from '../utils/dates';
import { roleLabel } from '../config/permissions';

const empty = { title: '', body: '', audience: 'selected_zones', zoneIds: [], roles: [], publishAt: '', expiresAt: '' };
const ts = (v) => (v ? Date.parse(`${v}:00+05:30`) : null);
export default function Announcements() {
  usePageTitle('Announcements'); const { aid } = useAuth(); useStore(); const [f, setF] = useState(empty); const [prev, setPrev] = useState(false); const [conf, setConf] = useState(false); const [run, busy] = useAction();
  const list = listAnnouncements(aid); const zones = studentFilterOptions().zones; const payload = () => ({ ...f, publishAt: ts(f.publishAt), expiresAt: ts(f.expiresAt) }); const problems = validate(aid, payload());
  const submit = async (publish) => { const r = await run(() => saveAnnouncement(aid, payload(), publish), publish ? 'Announcement published in mock mode – nothing is delivered.' : 'Draft saved.'); if (r.ok) { setF(empty); setConf(false); } };
  const aud = (a) => audiences.find((x) => x.id === a.audience)?.label + (a.zoneIds?.length ? `: ${a.zoneIds.map((z) => zones.find((x) => x.value === z)?.label).join(', ')}` : '') + (a.roles?.length ? `: ${a.roles.map(roleLabel).join(', ')}` : '');
  return (<div className="space-y-4">
    <PageHeader title="Announcements" subtitle="Mock publishing only – announcements are recorded but nothing is delivered until the backend exists." />
    <Can perm="announcements.manage"><Card><CardHeader icon={Megaphone} title="Create announcement" />
      <div className="grid gap-4 md:grid-cols-2"><Field label="Title *" htmlFor="at"><input id="at" className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Target audience *" htmlFor="aa"><select id="aa" className="field" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{audiences.map((a) => <option key={a.id} value={a.id} disabled={!audienceAllowed(aid, a.id)}>{a.label}{audienceAllowed(aid, a.id) ? '' : ' (not authorized)'}</option>)}</select></Field>
        <div className="md:col-span-2"><Field label="Description *" htmlFor="ab"><textarea id="ab" rows={3} className="field" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field></div>
        {f.audience === 'selected_zones' && <div className="md:col-span-2"><CheckGroup legend="Target zones *" options={zones} value={f.zoneIds} onChange={(zoneIds) => setF({ ...f, zoneIds })} /></div>}
        {f.audience === 'selected_roles' && <div className="md:col-span-2"><CheckGroup legend="Target user roles *" options={[{ value: 'student', label: 'Students' }, { value: 'zone_officer', label: 'Zone Officers' }]} value={f.roles} onChange={(roles) => setF({ ...f, roles })} /></div>}
        <Field label="Publish date (optional)" htmlFor="ap"><input id="ap" type="datetime-local" className="field" value={f.publishAt} onChange={(e) => setF({ ...f, publishAt: e.target.value })} /></Field><Field label="Expiry date (optional)" htmlFor="ax"><input id="ax" type="datetime-local" className="field" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field></div>
      {problems.length > 0 && (f.title || f.body) && <ul className="mt-3 list-disc pl-5 text-sm text-rose-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      <div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setPrev(true)} disabled={!f.title}><Eye className="h-4 w-4" />Preview</Button><Button variant="outline" loading={busy} onClick={() => submit(false)}><Save className="h-4 w-4" />Save draft</Button><Button onClick={() => (problems.length ? toast.error(problems[0]) : setConf(true))}><Send className="h-4 w-4" />Publish</Button></div>
      <p className="mt-2 text-xs text-ink-mute">Announcing to all users / students / officers needs the announcements.send_all permission <PendingTag /> – such audiences are disabled for roles without it.</p></Card></Can>
    <Card className="p-0 sm:p-0"><div className="p-4 pb-0"><CardHeader title="Announcement history" /></div>
      <DataTable caption="Announcements" rows={list} empty={<EmptyState icon={Megaphone} title="No announcements yet" />} columns={[{ key: 't', label: 'Title', render: (a) => <span className="font-semibold text-navy">{a.title}</span> }, { key: 'a', label: 'Audience', render: (a) => <span className="text-xs">{aud(a)}</span> }, { key: 's', label: 'Status', render: (a) => <StatusBadge kind={a.status} /> }, { key: 'p', label: 'Publish', render: (a) => (a.publishAt ? fmtInstant(a.publishAt) : '—') }, { key: 'e', label: 'Expires', render: (a) => (a.expiresAt ? fmtInstant(a.expiresAt) : '—') }, { key: 'b', label: 'By', render: (a) => a.createdBy },
        { key: 'x', label: '', render: (a) => (a.status === 'draft' ? <Can perm="announcements.manage"><Button size="sm" variant="secondary" onClick={async () => { await run(() => publishDraft(aid, a.id), 'Draft published (mock).'); }}>Publish draft</Button></Can> : null) }]}
        renderCard={(a) => <div><div className="flex justify-between gap-2"><b className="text-navy">{a.title}</b><StatusBadge kind={a.status} /></div><p className="text-xs text-ink-soft">{aud(a)}</p><p className="text-xs text-ink-mute">{a.createdBy}</p></div>} /></Card>
    <Modal open={prev} onOpenChange={setPrev} title="Preview" description={`Audience: ${audiences.find((a) => a.id === f.audience)?.label}`} footer={<Button variant="outline" onClick={() => setPrev(false)}>Close</Button>}><div className="rounded-2xl border border-lavender-300 p-4"><Badge className="mb-2 border-brand-300 bg-brand-50 text-brand-800">Announcement</Badge><h3 className="text-lg font-bold">{f.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{f.body}</p></div></Modal>
    <ConfirmDialog open={conf} loading={busy} onCancel={() => setConf(false)} onConfirm={() => submit(true)} title="Publish announcement?" description={f.title} confirmLabel="Publish (mock)"><Notice tone="warn">Mock publishing: the announcement is saved and audited, but no message is delivered to anyone.</Notice></ConfirmDialog>
  </div>);
}
