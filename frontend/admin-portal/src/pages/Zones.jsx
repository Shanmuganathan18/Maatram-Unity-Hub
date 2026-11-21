import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, Plus, FileSpreadsheet } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterBar, LinkButton, PageHeader, SearchInput, SelectField, StatusBadge } from '../components/ui';
import { Can } from '../components/layout/Gate';
import BulkImportModal from '../components/common/BulkImportModal';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listZones } from '../services/zoneService';

const D = { q: '', status: '', sort: 'name' };

const zoneColumns = [
  { key: 'code', label: 'Zone Code', required: true },
  { key: 'name', label: 'Zone Name', required: true },
  { key: 'region', label: 'Region' },
  { key: 'description', label: 'Description' },
];

const sampleZones = [
  {
    code: 'ZN-E',
    name: 'Zone E - Central Delta',
    region: 'Thanjavur & Delta',
    description: 'Central Tamil Nadu delta educational district',
  },
  {
    code: 'ZN-F',
    name: 'Zone F - South Coast',
    region: 'Tirunelveli & Tuticorin',
    description: 'Southern coastal educational district',
  },
];

export default function Zones() {
  usePageTitle('Zones');
  const { aid } = useAuth();
  const { refresh } = useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [importOpen, setImportOpen] = useState(false);

  const rows = listZones(aid, f);
  const cols = [
    { key: 'code', label: 'ID / Code', render: (z) => <span className="font-mono text-xs">{z.code}<span className="block text-ink-mute">{z.id}</span></span> },
    { key: 'name', label: 'Zone', render: (z) => <Link to={`/zones/${z.id}`} className="font-semibold text-navy hover:underline">{z.name}</Link> },
    { key: 'region', label: 'Region' },
    { key: 'off', label: 'Assigned officer(s)', render: (z) => (z.officerNames.length ? z.officerNames.join(', ') : <span className="text-rose-700">None</span>) },
    { key: 'institutions', label: 'Institutions' },
    { key: 'students', label: 'Students' },
    { key: 'submissionRate', label: 'Submission', render: (z) => `${z.submissionRate}%` },
    { key: 'events', label: 'Events' },
    { key: 'status', label: 'Status', render: (z) => <StatusBadge kind={z.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Zones"
        subtitle="All regional zones in the platform. Zones are deactivated or archived – never deleted."
        actions={
          <Can perm="zones.create">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Import Zones
              </Button>
              <LinkButton to="/zones/create">
                <Plus className="h-4 w-4" />
                Create zone
              </LinkButton>
            </div>
          </Can>
        }
      />
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="zq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, code or region" />
        <SelectField id="zst" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={['Active', 'Inactive', 'Archived']} />
        <SelectField id="zso" label="Sort by" all={null} value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: 'name', label: 'Name' }, { value: 'students', label: 'Student count' }, { value: 'institutions', label: 'Institution count' }]} />
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Zones"
          columns={cols}
          rows={rows}
          empty={<EmptyState icon={Map} title="No zones found" text="Try clearing the filters." />}
          renderCard={(z) => (
            <div>
              <div className="flex justify-between gap-2">
                <Link to={`/zones/${z.id}`} className="font-bold text-navy">{z.name} • {z.region}</Link>
                <StatusBadge kind={z.status} />
              </div>
              <p className="text-xs text-ink-soft">{z.code} · {z.officerNames.join(', ') || 'No officer'}</p>
              <p className="mt-1 text-sm">{z.institutions} institutions · {z.students} students · {z.submissionRate}% submitted</p>
            </div>
          )}
        />
      </Card>
      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk Import Regional Zones"
        entityName="Zones"
        columns={zoneColumns}
        sampleRows={sampleZones}
        endpoint="/zones/batch"
        onSuccess={() => {
          if (refresh) refresh();
        }}
      />
    </>
  );
}
