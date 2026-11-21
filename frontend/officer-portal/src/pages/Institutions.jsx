import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, DataTable, EmptyState, FilterBar, Notice, PageHeader, PendingTag, SearchInput, SelectField, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listInstitutions } from '../services/institutionService';
import { appConfig } from '../config/appConfig';

const D = { q: '', status: '', sort: 'name' };
export default function Institutions() {
  usePageTitle('Institutions');
  const { oid } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D);
  const rows = listInstitutions(oid, { q: f.q, status: f.status, sort: f.sort });
  const cols = [
    { key: 'name', label: 'Institution', render: (i) => <Link to={`/institutions/${i.id}`} className="font-semibold text-navy hover:underline">{i.name}</Link> },
    { key: 'code', label: 'Code' }, { key: 'location', label: 'Location' }, { key: 'totalStudents', label: 'Students' },
    { key: 'departments', label: 'Departments', render: (i) => i.departments.join(', ') },
    { key: 'submissionRate', label: 'Submission rate', render: (i) => `${i.submissionRate}%` }, { key: 'participationRate', label: 'Participation', render: (i) => `${i.accepted} accepted (${i.participationRate}%)` },
    { key: 'status', label: 'Status', render: (i) => <StatusBadge kind={i.status} /> },
  ];
  return (
    <>
      <PageHeader title="Institutions" subtitle="Institutions assigned to your zone." />
      <Notice tone="neutral" className="mb-4">Creating, editing or deactivating institutions, and reassigning zones, is <PendingTag /> (<code>canEditInstitutions = {String(appConfig.permissions.canEditInstitutions)}</code>). Cross-zone reassignment is never offered.</Notice>
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="iq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, code or location" />
        <SelectField id="ist" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={['Active', 'Onboarding', 'Inactive']} />
        <SelectField id="iso" label="Sort by" all={null} value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'name', label: 'Name' }, { value: 'students', label: 'Student count (high → low)' }]} />
      </FilterBar>
      <Card className="p-0 sm:p-0"><DataTable caption="Institutions" columns={cols} rows={rows} empty={<EmptyState icon={Building2} title="No institutions found" text="Try clearing filters." />}
        renderCard={(i) => <div><Link to={`/institutions/${i.id}`} className="font-bold text-navy">{i.name}</Link><p className="text-xs text-ink-soft">{i.code} · {i.location}</p><p className="mt-1 text-sm">{i.totalStudents} students · {i.submissionRate}% submitted</p><div className="mt-2"><StatusBadge kind={i.status} /></div></div>} /></Card>
    </>
  );
}
