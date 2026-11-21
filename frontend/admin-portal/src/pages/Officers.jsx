import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCog, UserPlus, FileSpreadsheet } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterBar, LinkButton, Modal, PageHeader, SearchInput, SelectField, StatusBadge } from '../components/ui';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listOfficers } from '../services/officerService';
import { studentFilterOptions } from '../services/studentService';
import { accountStatuses } from '../config/appConfig';
import { fmtInstant } from '../utils/dates';
import ImportWizard from '../components/students/ImportWizard';

const D = { q: '', zone: '', status: '', designation: '', sort: 'name' };

export default function Officers() {
  usePageTitle('Officers');
  const { aid } = useAuth();
  useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [bulkOpen, setBulkOpen] = useState(false);

  const rows = listOfficers(aid, {
    q: f.q,
    zoneId: f.zone,
    status: f.status,
    designation: f.designation,
    sort: f.sort,
  });

  const cols = [
    {
      key: 'id',
      label: 'Officer ID',
      render: (o) => <span className="font-mono text-xs">{o.officerId}</span>,
    },
    {
      key: 'n',
      label: 'Name',
      render: (o) => (
        <Link to={`/officers/${o.id}`} className="font-semibold text-navy hover:underline">
          {o.name}
        </Link>
      ),
    },
    {
      key: 'e',
      label: 'Email',
      className: 'hidden xl:table-cell',
      render: (o) => o.email,
    },
    {
      key: 'p',
      label: 'Phone',
      className: 'hidden xl:table-cell',
      render: (o) => o.phone,
    },
    {
      key: 'd',
      label: 'Designation',
      render: (o) => o.designation,
    },
    {
      key: 'z',
      label: 'Zone',
      render: (o) =>
        o.zoneId ? o.zoneLabel : <span className="text-rose-700 font-semibold">Unassigned</span>,
    },
    {
      key: 's',
      label: 'Status',
      render: (o) => <StatusBadge kind={o.status} />,
    },
    {
      key: 'l',
      label: 'Last login',
      render: (o) => (o.lastLogin ? fmtInstant(o.lastLogin) : '—'),
    },
    {
      key: 'c',
      label: 'Created',
      render: (o) => (o.createdAt ? fmtInstant(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="Officers"
        subtitle="Regional zone officers and coordinators across the platform."
        actions={
          <Can perm="officers.create">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Import Officers
              </Button>
              <LinkButton to="/officers/create">
                <UserPlus className="h-4 w-4" />
                Create officer
              </LinkButton>
            </div>
          </Can>
        }
      />

      <FilterBar onClear={clear} active={active}>
        <SearchInput id="oq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, email or ID" />
        <SelectField
          id="oz"
          label="Zone"
          value={f.zone}
          onChange={(v) => set({ zone: v })}
          options={[...studentFilterOptions().zones, { value: 'none', label: 'Unassigned' }]}
        />
        <SelectField id="os" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={accountStatuses} />
        <SelectField
          id="od"
          label="Designation"
          value={f.designation}
          onChange={(v) => set({ designation: v })}
          options={['Zone In-charge', 'Zone Officer']}
        />
        <SelectField
          id="oso"
          label="Sort by"
          all={null}
          value={f.sort}
          onChange={(v) => set({ sort: v })}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'created', label: 'Newest first' },
          ]}
        />
      </FilterBar>

      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Officers"
          columns={cols}
          rows={rows}
          empty={<EmptyState icon={UserCog} title="No officers found" />}
          renderCard={(o) => (
            <div>
              <div className="flex justify-between gap-2">
                <Link to={`/officers/${o.id}`} className="font-bold text-navy">
                  {o.name}
                </Link>
                <StatusBadge kind={o.status} />
              </div>
              <p className="text-xs text-ink-soft">{o.officerId} · {o.designation}</p>
              <p className="text-xs text-ink-soft">{o.zoneLabel}</p>
            </div>
          )}
        />
      </Card>

      <Modal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        size="lg"
        title="Bulk Officer Provisioning"
        description="Upload CSV or Excel (.xlsx) file to validate and provision multiple Zone Officers with automated credentials."
      >
        <ImportWizard target="officers" onDone={() => setBulkOpen(false)} />
      </Modal>
    </>
  );
}
