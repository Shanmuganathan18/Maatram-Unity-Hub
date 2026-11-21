import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, RefreshCw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  SelectField,
  StatusBadge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { useAction } from '../hooks/useAction';
import {
  bulkSetUserStatus,
  canToggle,
  fetchUsersLive,
  listUsers,
  loginHistory,
  setUserStatus,
  toggleUserStatusLive,
} from '../services/userService';
import { studentFilterOptions } from '../services/studentService';
import { accountStatuses } from '../config/appConfig';
import { roleLabel } from '../config/permissions';
import { fmtInstant } from '../utils/dates';
import { toast } from 'sonner';

const D = { q: '', role: '', zone: '', status: '', sort: 'name', dir: 'asc', page: '1' };

export default function Users() {
  usePageTitle('User management');
  const { aid } = useAuth();
  const { can } = usePermissions();
  useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [sel, setSel] = useState(new Set());
  const [bulk, setBulk] = useState(null);
  const [det, setDet] = useState(null);
  const [conf, setConf] = useState(null);
  const [run, busy] = useAction();
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadLiveUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchUsersLive({
        q: f.q,
        role: f.role,
        status: f.status,
        page: Number(f.page),
        pageSize: 12,
      });
      if (res?.data && Array.isArray(res.data)) {
        setLiveData({
          rows: res.data.map((u) => ({
            key: `${u.role}:${u.id}`,
            id: u.id,
            ref: { type: u.role, id: u.id },
            userId: u.identifier || u.id.slice(0, 8),
            name: u.name || u.email,
            email: u.email,
            role: u.role,
            roleLabel: roleLabel(u.role),
            zoneId: u.zoneId,
            zoneLabel: u.zoneId ? u.zoneId : '—',
            status: u.status,
            lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : null,
            createdAt: new Date(u.createdAt).getTime(),
            link:
              u.role === 'student'
                ? `/students/${u.id}`
                : u.role === 'officer'
                ? `/officers/${u.id}`
                : null,
          })),
          total: res.meta?.total || res.data.length,
          page: res.meta?.page || Number(f.page),
          pages: res.meta?.totalPages || 1,
        });
      }
    } catch {
      // Keep null to fall back to store
      setLiveData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveUsers();
  }, [f.q, f.role, f.status, f.page]);

  const fallbackR = listUsers(aid, {
    q: f.q,
    role: f.role,
    zoneId: f.zone,
    status: f.status,
    sortKey: f.sort,
    sortDir: f.dir,
    page: Number(f.page),
  });

  const r = liveData || fallbackR;

  const refs = [...sel].map((k) => ({ type: k.split(':')[0], id: k.split(':')[1] }));
  const canBulk = can('users.toggle') || can('students.toggle') || can('officers.toggle');
  const onSort = (k) => set({ sort: k, dir: f.sort === k && f.dir === 'asc' ? 'desc' : 'asc' });

  const cols = [
    {
      key: 'userId',
      label: 'User ID',
      render: (u) => <span className="font-mono text-xs">{u.userId}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (u) => (
        <button
          className="font-semibold text-navy hover:underline"
          onClick={() => setDet(u)}
        >
          {u.name}
        </button>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      className: 'hidden xl:table-cell',
      render: (u) => u.email || '—',
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <Badge className="border-lavender-300 bg-lavender-50 text-navy capitalize">
          {u.roleLabel}
        </Badge>
      ),
    },
    {
      key: 'zone',
      label: 'Zone',
      render: (u) => u.zoneLabel,
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <StatusBadge kind={u.status} />,
    },
    {
      key: 'login',
      label: 'Last login',
      sortable: true,
      render: (u) => (u.lastLogin ? fmtInstant(u.lastLogin) : '—'),
    },
    {
      key: 'created',
      label: 'Created',
      sortable: true,
      render: (u) => fmtInstant(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }),
    },
  ];

  const handleStatusChange = async (userId, targetStatus) => {
    try {
      await toggleUserStatusLive(userId, targetStatus);
      toast.success(`Account status updated to ${targetStatus}`);
      setConf(null);
      setDet(null);
      await loadLiveUsers();
    } catch {
      await run(() => setUserStatus(aid, det.ref, targetStatus), 'Status updated in store');
      setConf(null);
      setDet(null);
    }
  };

  return (
    <>
      <PageHeader
        title="User Management (All Accounts)"
        subtitle="One view of every account across all portals: students, zone officers, and administrators. Accounts are deactivated, never deleted."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLiveUsers} loading={loading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {can('users.create') && (
              <Link to="/people?tab=admins" className="button button-primary inline-flex items-center gap-1.5">
                <UsersRound className="h-4 w-4" />
                Admin Management
              </Link>
            )}
          </div>
        }
      />

      <FilterBar onClear={clear} active={active}>
        <SearchInput id="uq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name, email or user ID" />
        <SelectField
          id="ur"
          label="Role"
          value={f.role}
          onChange={(v) => set({ role: v })}
          options={[
            { value: 'student', label: 'Student' },
            { value: 'officer', label: 'Zone Officer' },
            { value: 'admin', label: 'Administrator' },
          ]}
        />
        <SelectField
          id="uz"
          label="Zone"
          value={f.zone}
          onChange={(v) => set({ zone: v })}
          options={studentFilterOptions().zones}
        />
        <SelectField id="us" label="Account status" value={f.status} onChange={(v) => set({ status: v })} options={accountStatuses} />
      </FilterBar>

      {sel.size > 0 && canBulk && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-lavender-300 bg-white p-3">
          <span className="text-sm font-semibold text-navy">{sel.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => setBulk('Active')}>
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulk('Inactive')}>
            Deactivate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulk('Suspended')}>
            Suspend
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Users"
          rowKey={(u) => u.key}
          columns={cols}
          rows={r.rows}
          sort={{ key: f.sort, dir: f.dir }}
          onSort={onSort}
          selectable={canBulk}
          selected={sel}
          onSelect={setSel}
          empty={<EmptyState icon={UsersRound} title="No users match" />}
          renderCard={(u) => (
            <div>
              <div className="flex justify-between gap-2">
                <button className="font-bold text-navy" onClick={() => setDet(u)}>
                  {u.name}
                </button>
                <StatusBadge kind={u.status} />
              </div>
              <p className="text-xs text-ink-soft">
                {u.userId} · {u.roleLabel}
              </p>
              <p className="text-xs text-ink-soft">{u.zoneLabel}</p>
            </div>
          )}
        />
        <Pagination
          page={r.page}
          pages={r.pages}
          total={r.total}
          pageSize={12}
          onPage={(p) => set({ page: p })}
        />
      </Card>

      <Modal
        open={!!det}
        onOpenChange={(o) => !o && setDet(null)}
        size="lg"
        title={det?.name ?? ''}
        description={det ? `${det.roleLabel} · ${det.userId}` : ''}
        footer={<Button variant="outline" onClick={() => setDet(null)}>Close</Button>}
      >
        {det && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge kind={det.status} />
              {det.link && (
                <Link className="font-semibold text-brand-700 underline" to={det.link}>
                  Open related profile
                </Link>
              )}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Email', det.email],
                ['Zone', det.zoneLabel],
                ['Last login', det.lastLogin ? fmtInstant(det.lastLogin) : 'Never'],
                ['Created', fmtInstant(det.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt>
                  <dd className="font-medium text-navy">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              {det.status === 'Active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConf({ kind: 'status', value: 'Inactive' })}
                >
                  Deactivate Account
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConf({ kind: 'status', value: 'Active' })}
                >
                  Activate Account
                </Button>
              )}
            </div>
            <div>
              <p className="mb-1 font-bold text-navy">Login History</p>
              {loginHistory(det).length === 0 ? (
                <p className="text-xs text-ink-soft">No previous logins recorded.</p>
              ) : (
                <ul className="space-y-1">
                  {loginHistory(det).map((h, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-lavender-50 px-3 py-1.5 text-xs">
                      <span>{fmtInstant(h.at)}</span>
                      <span>{h.device} · {h.ip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!bulk}
        loading={busy}
        onCancel={() => setBulk(null)}
        tone={bulk === 'Active' ? 'primary' : 'danger'}
        title={`Set ${sel.size} account(s) to ${bulk}?`}
        description="Protected accounts (the last active Administrator, your own account) are skipped. Everything is recorded in the audit log."
        confirmLabel={`Apply to ${sel.size} account(s)`}
        onConfirm={async () => {
          const x = await run(
            () => bulkSetUserStatus(aid, refs, bulk),
            (res) => `${res.changed} updated, ${res.skipped} skipped.`
          );
          if (x.ok) {
            setBulk(null);
            setSel(new Set());
            loadLiveUsers();
          }
        }}
      />

      <ConfirmDialog
        open={!!conf}
        loading={busy}
        onCancel={() => setConf(null)}
        tone={conf?.value === 'Inactive' ? 'danger' : 'primary'}
        title={`Set account to ${conf?.value}?`}
        description={det?.name}
        confirmLabel="Confirm"
        onConfirm={() => handleStatusChange(det.id, conf.value)}
      />
    </>
  );
}
