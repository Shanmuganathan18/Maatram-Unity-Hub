import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Users } from 'lucide-react';
import { Badge, Button, Card, FilterBar, Notice, PageHeader, PendingTag, SearchInput, SelectField, StatusBadge, DataTable, Pagination } from '../components/ui';
import ImportDialog from '../components/students/ImportDialog';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listStudents, studentFilterOptions } from '../services/studentService';
import { statusMeta } from '../utils/statusMeta';
import { appConfig } from '../config/appConfig';

const D = { q: '', institution: '', department: '', year: '', availability: '', sort: 'name', dir: 'asc', page: '1' };
export default function Students() {
  usePageTitle('Students');
  const { oid } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [imp, setImp] = useState(false);
  const opts = studentFilterOptions(oid);
  const r = listStudents(oid, { q: f.q, institutionId: f.institution, department: f.department, year: f.year, availability: f.availability, sortKey: f.sort, sortDir: f.dir, page: Number(f.page), pageSize: 10 });
  const onSort = (k) => set({ sort: k, dir: f.sort === k && f.dir === 'asc' ? 'desc' : 'asc' });
  const cols = [
    { key: 'id', label: 'Student ID', sortable: true, render: (s) => <span className="font-mono text-xs">{s.studentId}</span> },
    { key: 'name', label: 'Name', sortable: true, render: (s) => <Link className="font-semibold text-navy hover:underline" to={`/students/${s.id}`}>{s.name}</Link> },
    { key: 'institution', label: 'Institution', sortable: true },
    { key: 'department', label: 'Dept' }, { key: 'year', label: 'Year', sortable: true },
    { key: 'email', label: 'Email', className: 'hidden xl:table-cell' }, { key: 'phone', label: 'Phone', className: 'hidden xl:table-cell' },
    { key: 'availabilityStatus', label: 'Availability (this week)', render: (s) => <StatusBadge kind={s.availabilityStatus} /> },
    { key: 'participation', label: 'Participation', render: (s) => <StatusBadge kind={s.participation.label} /> },
  ];
  return (
    <>
      <PageHeader title="Students" subtitle={`Students of your zone only. Read-only for now.`} actions={<Button variant="outline" onClick={() => setImp(true)}><Upload className="h-4 w-4" />Import CSV (validate only)</Button>} />
      <Notice tone="neutral" className="mb-4">Creating, editing or deactivating students is <PendingTag /> – officers have view-only access in this prototype (<code>canEditStudents = {String(appConfig.permissions.canEditStudents)}</code>).</Notice>
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="sq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name or student ID" />
        <SelectField id="si" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={opts.institutions.map((i) => ({ value: i.id, label: i.name }))} />
        <SelectField id="sd" label="Department" value={f.department} onChange={(v) => set({ department: v })} options={opts.departments} />
        <SelectField id="sy" label="Year" value={f.year} onChange={(v) => set({ year: v })} options={opts.years.map((y) => ({ value: y, label: `Year ${y}` }))} />
        <SelectField id="sa" label="Availability (current week)" value={f.availability} onChange={(v) => set({ availability: v })} options={['submitted', 'draft', 'not_submitted', 'system_assumed_unavailable'].map((k) => ({ value: k, label: statusMeta[k].label }))} />
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable caption="Students" columns={cols} rows={r.rows} sort={{ key: f.sort, dir: f.dir }} onSort={onSort}
          empty={<div className="p-6"><p className="text-center font-semibold text-navy"><Users className="mx-auto mb-2 h-8 w-8 text-ink-mute" />No students match your filters.</p></div>}
          renderCard={(s) => (<div><div className="flex items-start justify-between gap-2"><Link to={`/students/${s.id}`} className="font-bold text-navy">{s.name}</Link><Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">Year {s.year}</Badge></div><p className="text-xs text-ink-soft">{s.studentId} · {s.department}</p><p className="text-xs text-ink-soft">{s.institution}</p><div className="mt-2 flex flex-wrap gap-2"><StatusBadge kind={s.availabilityStatus} /><StatusBadge kind={s.participation.label} /></div></div>)} />
        <Pagination page={r.page} pages={r.pages} total={r.total} pageSize={10} onPage={(p) => set({ page: p })} />
      </Card>
      <ImportDialog open={imp} onOpenChange={setImp} />
    </>
  );
}
