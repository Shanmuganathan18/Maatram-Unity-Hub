/**
 * src/pages/InstitutionsHub.jsx
 *
 * Consolidated Institutions & Zones Hub for Administrators:
 * Combines regional zones, partner institutions, and academic departments into one unified menu:
 * 1. Zones: Regional clusters, assigned officers, student & institution counts, submission health.
 * 2. Institutions: Partner colleges, contact info, zone mapping, participation & submission rates.
 * 3. Departments: Degree departments across institutions, student counts, and academic disciplines with live MySQL persistence.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Map, Building2, GraduationCap, Plus, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader,
  Tabs,
  Card,
  DataTable,
  EmptyState,
  SearchInput,
  SelectField,
  Button,
  Modal,
  Field,
} from '../components/ui';
import Zones from './Zones';
import Institutions from './Institutions';
import BulkImportModal from '../components/common/BulkImportModal';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAuth } from '../context/AuthContext';
import { useQueryState } from '../hooks/useQueryState';
import { getState } from '../services/store';
import { api } from '../services/api';

const deptImportColumns = [
  { key: 'institutionCode', label: 'Institution Code', required: true },
  { key: 'name', label: 'Department Name', required: true },
  { key: 'level', label: 'Level (UG/PG/Diploma)' },
];

const sampleDepts = [
  { institutionCode: 'SVIT', name: 'Information Technology', level: 'UG' },
  { institutionCode: 'CIT', name: 'Artificial Intelligence and Data Science', level: 'UG' },
  { institutionCode: 'AIM', name: 'Master of Business Administration (MBA)', level: 'PG' },
];

function DepartmentsTab() {
  const { aid } = useAuth();
  useStore();
  const [f, set] = useQueryState({ q: '', institution: '' });
  const [liveDepts, setLiveDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New department form state
  const [deptForm, setDeptForm] = useState({
    institutionId: '',
    name: '',
    level: 'UG',
  });

  const st = getState();
  const insts = st.institutions || [];

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/departments');
      if (res?.data && Array.isArray(res.data)) {
        setLiveDepts(res.data);
      } else {
        setLiveDepts([]);
      }
    } catch (err) {
      // Fallback: aggregate from local store
      const students = st.students || [];
      const deptMap = new Map();
      insts.forEach((inst) => {
        (inst.departments || []).forEach((deptName) => {
          const key = `${deptName}___${inst.id}`;
          const count = students.filter(
            (s) => s.institutionId === inst.id && s.department === deptName
          ).length;
          deptMap.set(key, {
            id: key,
            name: deptName,
            institutionId: inst.id,
            institution: { id: inst.id, name: inst.name, code: inst.code },
            level: deptName.toLowerCase().includes('m.') || deptName.toLowerCase().includes('master') ? 'PG' : 'UG',
            _count: { studentProfiles: count },
          });
        });
      });
      setLiveDepts(Array.from(deptMap.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.institutionId) {
      toast.error('Please select an institution.');
      return;
    }
    if (!deptForm.name.trim()) {
      toast.error('Department name is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/departments', {
        institutionId: deptForm.institutionId,
        name: deptForm.name.trim(),
        level: deptForm.level,
      });

      toast.success(`Department "${deptForm.name}" created successfully.`);
      setCreateOpen(false);
      setDeptForm({ institutionId: '', name: '', level: 'UG' });
      await fetchDepartments();
    } catch (err) {
      toast.error(err.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = liveDepts.filter((d) => {
    const instName = d.institution?.name || '';
    const instCode = d.institution?.code || '';
    const matchesQ =
      !f.q ||
      d.name.toLowerCase().includes(f.q.toLowerCase()) ||
      instName.toLowerCase().includes(f.q.toLowerCase()) ||
      instCode.toLowerCase().includes(f.q.toLowerCase());
    const matchesInst = !f.institution || d.institutionId === f.institution;
    return matchesQ && matchesInst;
  });

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const cols = [
    {
      key: 'name',
      label: 'Department / Degree',
      render: (d) => <span className="font-semibold text-navy">{d.name}</span>,
    },
    {
      key: 'inst',
      label: 'College / Institution',
      render: (d) => (
        <span>
          {d.institution?.name || '—'}{' '}
          {d.institution?.code && (
            <span className="text-xs text-ink-mute">({d.institution.code})</span>
          )}
        </span>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (d) => (
        <span className="inline-flex rounded-full bg-lavender-100 px-2.5 py-0.5 text-xs font-semibold text-navy">
          {d.level || 'UG'}
        </span>
      ),
    },
    {
      key: 'students',
      label: 'Enrolled Students',
      render: (d) => (
        <span className="font-bold text-navy font-mono">
          {d._count?.studentProfiles ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            id="dept-search"
            placeholder="Search department or college..."
            value={f.q}
            onChange={(v) => set({ q: v })}
          />
          <SelectField
            id="dept-inst"
            label="College"
            value={f.institution}
            onChange={(v) => set({ institution: v })}
            options={insts.map((i) => ({ value: i.id, label: `${i.name} (${i.code})` }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDepartments} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Import Departments
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Department
          </Button>
        </div>
      </div>

      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Academic Departments"
          columns={cols}
          rows={filtered}
          empty={
            <EmptyState
              icon={GraduationCap}
              title="No departments found"
              text="Try clearing the filters or create a new department."
            />
          }
          renderCard={(d) => (
            <div>
              <p className="font-bold text-navy">{d.name}</p>
              <p className="text-xs text-ink-soft">
                {d.institution?.name} ({d.institution?.code}) · {d.level || 'UG'}
              </p>
              <p className="mt-1 text-sm">{d._count?.studentProfiles ?? 0} students enrolled</p>
            </div>
          )}
        />
      </Card>

      {/* Create Department Modal */}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Academic Department"
        description="Add a degree or study department and associate it with a partner institution."
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <Field label="Partner Institution *" htmlFor="inst-select">
            <select
              id="inst-select"
              className="field"
              value={deptForm.institutionId}
              onChange={(e) => setDeptForm({ ...deptForm, institutionId: e.target.value })}
              required
            >
              <option value="">Select an institution...</option>
              {insts.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Department / Degree Name *" htmlFor="dept-name">
            <input
              id="dept-name"
              className="field"
              placeholder="e.g. Computer Science and Engineering, Mechanical, MBA"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </Field>

          <Field label="Academic Level" htmlFor="dept-level">
            <select
              id="dept-level"
              className="field"
              value={deptForm.level}
              onChange={(e) => setDeptForm({ ...deptForm, level: e.target.value })}
            >
              <option value="UG">Undergraduate (UG / B.E. / B.Tech / B.Sc / B.Com)</option>
              <option value="PG">Postgraduate (PG / M.E. / M.Tech / MBA / MCA)</option>
              <option value="Diploma">Polytechnic Diploma</option>
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk Import Academic Departments"
        entityName="Departments"
        columns={deptImportColumns}
        sampleRows={sampleDepts}
        endpoint="/departments/batch"
        onSuccess={() => {
          fetchDepartments();
        }}
      />
    </div>
  );
}

export default function InstitutionsHub() {
  usePageTitle('Institutions & Zones');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'zones';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'zones', label: 'Regional Zones', icon: Map },
    { id: 'institutions', label: 'Partner Institutions', icon: Building2 },
    { id: 'departments', label: 'Academic Departments', icon: GraduationCap },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institutions & Zones"
        subtitle="Manage geographic clusters, partner institutions, academic departments, and officer operational boundaries."
      />

      <Tabs
        label="Institutions and Zones Navigation"
        tabs={tabs}
        value={currentTab}
        onChange={setTab}
      />

      {currentTab === 'zones' && <Zones />}
      {currentTab === 'institutions' && <Institutions />}
      {currentTab === 'departments' && <DepartmentsTab />}
    </div>
  );
}
