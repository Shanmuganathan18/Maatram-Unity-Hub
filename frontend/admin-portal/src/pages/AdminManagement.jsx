import { useState } from 'react';
import { ShieldCheck, UserPlus, UserCheck, UserX, Mail, Phone, Calendar, Clock } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  SelectField,
  StatusBadge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { getState } from '../services/store';
import { canToggle, createAdminAccount, setUserStatus } from '../services/userService';
import { fmtInstant } from '../utils/dates';

export default function AdminManagement() {
  usePageTitle('Admin Management');
  const { aid, admin } = useAuth();
  const { can } = usePermissions();
  useStore();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null); // { admin, targetStatus }
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [run, busy] = useAction();

  // Load admins from local store
  const st = getState();
  const allAdmins = (st.admins || []).map((a) => ({
    ...a,
    key: a.id,
    ref: { type: 'admin', id: a.id },
  }));

  const filteredAdmins = allAdmins.filter((a) => {
    const matchesQ =
      !q ||
      `${a.name} ${a.email} ${a.adminId}`.toLowerCase().includes(q.trim().toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await run(
      () => createAdminAccount(aid, formData),
      'Administrator created and invitation email queued.',
    );
    if (res.ok) {
      setFormData({ name: '', email: '', phone: '' });
      setCreateModal(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusDialog) return;
    const res = await run(
      () => setUserStatus(aid, statusDialog.admin.ref, statusDialog.targetStatus),
      `Administrator account set to ${statusDialog.targetStatus}.`,
    );
    if (res.ok) {
      setStatusDialog(null);
    }
  };

  const columns = [
    {
      key: 'adminId',
      label: 'Admin ID',
      render: (a) => <span className="font-mono text-xs font-bold text-navy">{a.adminId}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      render: (a) => (
        <div>
          <span className="font-semibold text-navy">{a.name}</span>
          {a.id === aid && (
            <Badge className="ml-2 border-brand-300 bg-brand-50 text-brand-700 text-[10px]">
              You
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (a) => (
        <span className="text-xs text-ink-soft flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {a.email}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (a) =>
        a.phone ? (
          <span className="text-xs text-ink-soft flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {a.phone}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => <StatusBadge kind={a.status} />,
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (a) => (a.lastLogin ? fmtInstant(a.lastLogin) : 'Never'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (a) => {
        const canAct = canToggle(aid, a);
        if (!canAct) {
          return (
            <span className="text-xs text-ink-mute">
              {a.id === aid ? 'Current User' : 'Protected'}
            </span>
          );
        }
        return a.status === 'Active' ? (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setStatusDialog({ admin: a, targetStatus: 'Inactive' })}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setStatusDialog({ admin: a, targetStatus: 'Active' })}
          >
            Activate
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Management"
        subtitle="Manage platform administrators. All Admin accounts share the unified ADMIN role with identical system-wide permissions across every zone."
        actions={
          can('users.create') && (
            <Button onClick={() => setCreateModal(true)}>
              <UserPlus className="h-4 w-4" />
              Create Admin
            </Button>
          )
        }
      />

      <FilterBar onClear={() => { setQ(''); setStatusFilter(''); }} active={Boolean(q || statusFilter)}>
        <SearchInput
          id="admin-q"
          value={q}
          onChange={setQ}
          placeholder="Search by name, email, or Admin ID"
        />
        <SelectField
          id="admin-status"
          label="Account Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </FilterBar>

      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Administrators"
          rowKey={(a) => a.id}
          columns={columns}
          rows={filteredAdmins}
          empty={
            <EmptyState
              icon={ShieldCheck}
              title="No administrator accounts found"
              description="Create an administrator account using the button above."
            />
          }
        />
      </Card>

      {/* Modal: Create Admin */}
      <Modal
        open={createModal}
        onOpenChange={setCreateModal}
        title="Create Administrator Account"
        description="The new administrator will receive system-wide access across all zones and records, identical to all existing Admin accounts."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={handleCreate}
              disabled={!formData.name.trim() || !formData.email.trim()}
            >
              Create Administrator
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Full Name *" htmlFor="adm-name">
            <input
              id="adm-name"
              type="text"
              required
              className="field"
              placeholder="e.g. Ramesh V"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Field>

          <Field label="Email Address *" htmlFor="adm-email">
            <input
              id="adm-email"
              type="email"
              required
              className="field"
              placeholder="e.g. ramesh@maatram.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field>

          <Field label="Phone Number" htmlFor="adm-phone">
            <input
              id="adm-phone"
              type="tel"
              className="field"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Field>

          <Notice tone="info">
            In accordance with platform RBAC requirements, there are no permission tiers. All
            administrators receive complete administrative authority across all zones.
          </Notice>
        </form>
      </Modal>

      {/* Confirm Status Toggle */}
      <ConfirmDialog
        open={Boolean(statusDialog)}
        loading={busy}
        onCancel={() => setStatusDialog(null)}
        tone={statusDialog?.targetStatus === 'Inactive' ? 'danger' : 'primary'}
        title={`${statusDialog?.targetStatus === 'Inactive' ? 'Deactivate' : 'Activate'} ${statusDialog?.admin?.name}?`}
        description={
          statusDialog?.targetStatus === 'Inactive'
            ? 'Deactivated administrators cannot log in or access administrative endpoints. At least one active Administrator must remain.'
            : 'Activated administrators have immediate system-wide access to all zones and data.'
        }
        confirmLabel={`Set to ${statusDialog?.targetStatus}`}
        onConfirm={handleToggleStatus}
      />
    </>
  );
}

