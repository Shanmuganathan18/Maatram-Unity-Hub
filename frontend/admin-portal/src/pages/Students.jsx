import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Users, UserPlus, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Card, ConfirmDialog, DataTable, EmptyState, FilterBar, Modal, PageHeader, Pagination, SearchInput, SelectField, StatusBadge, Field } from '../components/ui';
import { Can } from '../components/layout/Gate';
import ImportWizard from '../components/students/ImportWizard';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { useAction } from '../hooks/useAction';
import { bulkSetStatus, listStudents, remapInstitution, studentFilterOptions } from '../services/studentService';
import { accountStatuses } from '../config/appConfig';
import { statusMeta } from '../utils/statusMeta';
import { api } from '../services/api';

const D = { q: '', zone: '', institution: '', department: '', year: '', status: '', availability: '', sort: 'name', dir: 'asc', page: '1' };
export default function Students() {
  usePageTitle('Students');
  const { aid } = useAuth();
  const { can } = usePermissions();
  const { refresh } = useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [imp, setImp] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    institutionId: '',
    department: '',
    year: 1,
    registerNumber: '',
    phone: '',
  });

  const [sel, setSel] = useState(new Set());
  const [bulk, setBulk] = useState(null);
  const [target, setTarget] = useState('');
  const [run, busy] = useAction();
  const o = studentFilterOptions();
  const insts = o.institutions.filter((i) => !f.zone || i.zoneId === f.zone);
  const r = listStudents(aid, { q: f.q, zoneId: f.zone, institutionId: f.institution, department: f.department, year: f.year, status: f.status, availability: f.availability, sortKey: f.sort, sortDir: f.dir, page: Number(f.page) });
  const onSort = (k) => set({ sort: k, dir: f.sort === k && f.dir === 'asc' ? 'desc' : 'asc' });
  const ids = [...sel];

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.email.trim() || !studentForm.institutionId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/students', {
        name: studentForm.name.trim(),
        email: studentForm.email.trim().toLowerCase(),
        institutionId: studentForm.institutionId,
        department: studentForm.department.trim() || 'General',
        year: Number(studentForm.year) || 1,
        registerNumber: studentForm.registerNumber?.trim() || undefined,
        phone: studentForm.phone?.trim() || undefined,
      });

      toast.success(`Student ${studentForm.name} created! Activation email dispatched.`);
      setCreateOpen(false);
      setStudentForm({
        name: '',
        email: '',
        institutionId: '',
        department: '',
        year: 1,
        registerNumber: '',
        phone: '',
      });
      if (refresh) refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to create student account.');
    } finally {
      setSubmitting(false);
    }
  };

  const cols = [
    { key: 'id', label: 'Student ID', sortable: true, render: (s) => <span className="font-mono text-xs">{s.studentId}</span> }, { key: 'name', label: 'Name', sortable: true, render: (s) => <Link to={`/students/${s.id}`} className="font-semibold text-navy hover:underline">{s.name}</Link> },
    { key: 'institution', label: 'Institution', sortable: true }, { key: 'zone', label: 'Zone', sortable: true, render: (s) => s.zoneLabel }, { key: 'department', label: 'Dept' }, { key: 'year', label: 'Year', sortable: true },
    { key: 'email', label: 'Email', className: 'hidden 2xl:table-cell', render: (s) => s.email || <span className="text-amber-700">Missing</span> }, { key: 'st', label: 'Account', render: (s) => <StatusBadge kind={s.status} /> }, { key: 'av', label: 'Availability (this week)', render: (s) => <StatusBadge kind={s.availabilityStatus} /> },
  ];
  const doBulk = async () => { const r1 = await run(() => (bulk.kind === 'status' ? bulkSetStatus(aid, ids, bulk.value) : remapInstitution(aid, ids, target)), (n) => `${n} student(s) updated.`); if (r1.ok) { setBulk(null); setSel(new Set()); } };
  return (<>
    <PageHeader
      title="Students"
      subtitle="All enrolled students across all regional zones."
      actions={
        <div className="flex flex-wrap gap-2">
          <Can perm="students.import">
            <Button variant="secondary" onClick={() => setImp(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Bulk Import Students
            </Button>
          </Can>
          <Can perm="students.create">
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Create student
            </Button>
          </Can>
        </div>
      }
    />
    <FilterBar onClear={clear} active={active}>
      <SearchInput id="sq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, student ID or email" />
      <SelectField id="sz" label="Zone" value={f.zone} onChange={(v) => set({ zone: v, institution: '' })} options={[...o.zones, { value: 'none', label: 'Unassigned' }]} />
      <SelectField id="si" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={insts} />
      <SelectField id="sd" label="Department" value={f.department} onChange={(v) => set({ department: v })} options={o.departments} />
      <SelectField id="sy" label="Year" value={f.year} onChange={(v) => set({ year: v })} options={[1, 2, 3, 4, 5].map((y) => ({ value: y, label: `Year ${y}` }))} />
      <SelectField id="ss" label="Account status" value={f.status} onChange={(v) => set({ status: v })} options={accountStatuses} />
      <SelectField id="sa" label="Availability (this week)" value={f.availability} onChange={(v) => set({ availability: v })} options={['submitted', 'draft', 'not_submitted', 'system_assumed_unavailable'].map((k) => ({ value: k, label: statusMeta[k].label }))} />
    </FilterBar>
    {sel.size > 0 && (can('students.toggle') || can('students.edit')) && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-lavender-300 bg-white p-3"><span className="text-sm font-semibold text-navy">{sel.size} selected</span>
      <Can perm="students.toggle"><Button size="sm" variant="secondary" onClick={() => setBulk({ kind: 'status', value: 'Active' })}>Activate</Button><Button size="sm" variant="outline" onClick={() => setBulk({ kind: 'status', value: 'Inactive' })}>Deactivate</Button></Can>
      <Can perm="students.edit"><Button size="sm" variant="outline" onClick={() => { setTarget(''); setBulk({ kind: 'map' }); }}>Map to institution…</Button></Can><Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear selection</Button></div>}
    <Card className="p-0 sm:p-0"><DataTable caption="Students" columns={cols} rows={r.rows} sort={{ key: f.sort, dir: f.dir }} onSort={onSort} selectable={can('students.toggle') || can('students.edit')} selected={sel} onSelect={setSel} empty={<EmptyState icon={Users} title="No students match" text="Try clearing the filters." />}
      renderCard={(s) => <div><div className="flex justify-between gap-2"><Link to={`/students/${s.id}`} className="font-bold text-navy">{s.name}</Link><StatusBadge kind={s.status} /></div><p className="text-xs text-ink-soft">{s.studentId} · {s.department} · Y{s.year}</p><p className="text-xs text-ink-soft">{s.institution} · {s.zoneLabel}</p><div className="mt-2"><StatusBadge kind={s.availabilityStatus} /></div></div>} />
      <Pagination page={r.page} pages={r.pages} total={r.total} pageSize={12} onPage={(p) => set({ page: p })} /></Card>

    {/* Bulk Import Modal */}
    <Modal open={imp} onOpenChange={setImp} size="xl" title="Bulk student import" description="Upload CSV/Excel file, preview records, validate zones and provision accounts."><ImportWizard target="students" onDone={() => { setImp(false); if (refresh) refresh(); }} /></Modal>

    {/* Individual Create Student Modal */}
    <Modal
      open={createOpen}
      onOpenChange={setCreateOpen}
      size="lg"
      title="Create Student Account"
      description="Provision a single student. An activation email with temporary credentials will be dispatched automatically."
    >
      <form onSubmit={handleCreateStudent} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *" htmlFor="st-name">
            <input
              id="st-name"
              className="field"
              placeholder="e.g. Ananya Sharma"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email Address *" htmlFor="st-email">
            <input
              id="st-email"
              type="email"
              className="field"
              placeholder="e.g. ananya@example.com"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              required
            />
          </Field>
        </div>

        <Field label="Institution *" htmlFor="st-inst">
          <select
            id="st-inst"
            className="field"
            value={studentForm.institutionId}
            onChange={(e) => setStudentForm({ ...studentForm, institutionId: e.target.value })}
            required
          >
            <option value="">Select college / institution...</option>
            {o.institutions.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Department / Degree *" htmlFor="st-dept">
            <input
              id="st-dept"
              className="field"
              placeholder="e.g. Computer Science"
              value={studentForm.department}
              onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
              required
            />
          </Field>
          <Field label="Year of Study *" htmlFor="st-year">
            <select
              id="st-year"
              className="field"
              value={studentForm.year}
              onChange={(e) => setStudentForm({ ...studentForm, year: Number(e.target.value) })}
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
              <option value={5}>5th Year</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Register Number (Optional)" htmlFor="st-reg">
            <input
              id="st-reg"
              className="field"
              placeholder="e.g. 710021104001"
              value={studentForm.registerNumber}
              onChange={(e) => setStudentForm({ ...studentForm, registerNumber: e.target.value })}
            />
          </Field>
          <Field label="Mobile Phone (Optional)" htmlFor="st-phone">
            <input
              id="st-phone"
              type="tel"
              className="field"
              placeholder="10-digit number"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create & Dispatch Activation
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog open={!!bulk} loading={busy} onCancel={() => setBulk(null)} onConfirm={doBulk} tone={bulk?.value === 'Inactive' ? 'danger' : 'primary'} confirmLabel={`Apply to ${sel.size} student(s)`} title={bulk?.kind === 'map' ? 'Map students to an institution' : `${bulk?.value === 'Inactive' ? 'Deactivate' : 'Activate'} ${sel.size} student account(s)?`} description={`This will change ${sel.size} selected record(s). It is recorded in the audit log.`}>
      {bulk?.kind === 'map' && <div><label htmlFor="bm" className="label">Target institution</label><select id="bm" className="field" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Select…</option>{o.institutions.filter((i) => i.zoneId).map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select><p className="mt-2 text-xs text-ink-soft">Students’ zone will follow the institution’s zone. Institutions without a zone are not offered.</p></div>}
      </ConfirmDialog>
  </>);
}
