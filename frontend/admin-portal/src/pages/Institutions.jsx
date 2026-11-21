import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, DataTable, EmptyState, FilterBar, Modal, PageHeader, SearchInput, SelectField, StatusBadge } from '../components/ui';
import { Can } from '../components/layout/Gate';
import InstitutionForm from '../components/institutions/InstitutionForm';
import BulkImportModal from '../components/common/BulkImportModal';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { createInstitution, institutionTypes, listInstitutions } from '../services/institutionService';
import { studentFilterOptions } from '../services/studentService';

const D = { q: '', zone: '', status: '', type: '', sort: 'name' };

const institutionColumns = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Institution Name', required: true },
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'zone', label: 'Zone' },
  { key: 'contactEmail', label: 'Contact Email' },
  { key: 'contactPhone', label: 'Contact Phone' },
];

const sampleInstitutions = [
  {
    code: 'GCT',
    name: 'Government College of Technology',
    location: 'Coimbatore',
    type: 'Engineering',
    zone: 'Zone B',
    contactEmail: 'contact@gct.ac.in',
    contactPhone: '9876543210',
  },
  {
    code: 'PSG',
    name: 'PSG College of Technology',
    location: 'Coimbatore',
    type: 'Engineering',
    zone: 'Zone B',
    contactEmail: 'admissions@psgtech.edu',
    contactPhone: '9876543211',
  },
];

export default function Institutions() {
  usePageTitle('Institutions');
  const { aid } = useAuth();
  const { refresh } = useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const rows = listInstitutions(aid, { q: f.q, zoneId: f.zone, status: f.status, type: f.type, sort: f.sort });
  const cols = [
    { key: 'id', label: 'ID', render: (i) => <span className="font-mono text-xs">{i.id}</span> },
    { key: 'n', label: 'Institution', render: (i) => <Link to={`/institutions/${i.id}`} className="font-semibold text-navy hover:underline">{i.name}</Link> },
    { key: 'c', label: 'Code', render: (i) => i.code },
    { key: 'z', label: 'Zone', render: (i) => (i.zoneId ? i.zoneLabel : <span className="text-rose-700">Unassigned</span>) },
    { key: 'l', label: 'Location', render: (i) => i.location },
    { key: 'ct', label: 'Contact', className: 'hidden xl:table-cell', render: (i) => i.contactEmail || <span className="text-amber-700">Missing</span> },
    { key: 's', label: 'Students', render: (i) => i.students },
    { key: 'r', label: 'Submission', render: (i) => `${i.submissionRate}%` },
    { key: 'p', label: 'Participation', render: (i) => `${i.participationRate}%` },
    { key: 'st', label: 'Status', render: (i) => <StatusBadge kind={i.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Institutions"
        subtitle="All partner institutions across zones. Institutions are deactivated, never deleted."
        actions={
          <Can perm="institutions.create">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Import Institutions
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Create institution
              </Button>
            </div>
          </Can>
        }
      />
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="iq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, code or location" />
        <SelectField id="iz" label="Zone" value={f.zone} onChange={(v) => set({ zone: v })} options={[...studentFilterOptions().zones, { value: 'none', label: 'Unassigned' }]} />
        <SelectField id="is" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={['Active', 'Onboarding', 'Inactive']} />
        <SelectField id="it" label="Institution type" value={f.type} onChange={(v) => set({ type: v })} options={institutionTypes()} />
        <SelectField id="iso" label="Sort by" all={null} value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'name', label: 'Name' }, { value: 'students', label: 'Student count' }]} />
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Institutions"
          columns={cols}
          rows={rows}
          empty={<EmptyState icon={Building2} title="No institutions found" />}
          renderCard={(i) => (
            <div>
              <div className="flex justify-between gap-2">
                <Link to={`/institutions/${i.id}`} className="font-bold text-navy">{i.name}</Link>
                <StatusBadge kind={i.status} />
              </div>
              <p className="text-xs text-ink-soft">{i.code} · {i.zoneLabel} · {i.location}</p>
              <p className="mt-1 text-sm">{i.students} students · {i.submissionRate}% submitted</p>
            </div>
          )}
        />
      </Card>
      <Modal open={open} onOpenChange={setOpen} size="lg" title="Create institution" description="Institutions must belong to an active zone.">
        <InstitutionForm
          submitLabel="Create institution"
          onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            const i = await createInstitution(aid, v);
            toast.success(`Institution ${i.code} created.`);
            setOpen(false);
          }}
        />
      </Modal>
      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk Import Partner Institutions"
        entityName="Institutions"
        columns={institutionColumns}
        sampleRows={sampleInstitutions}
        endpoint="/institutions/batch"
        onSuccess={() => {
          if (refresh) refresh();
        }}
      />
    </>
  );
}
