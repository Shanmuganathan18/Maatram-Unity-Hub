import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { FileDown, Printer, Download, ShieldCheck, BarChart3, DatabaseZap } from 'lucide-react';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, FilterBar, Modal, Notice, PageHeader, Pagination, PendingTag, SelectField, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import * as rep from '../services/reportService';
import { studentFilterOptions } from '../services/studentService';
import { datasetRows, exportDataset, exportable } from '../services/dataService';
import { getDataQuality } from '../services/dataQualityService';
import { downloadFile } from '../utils/exportFiles';
import { eventCategories, eventStatuses } from '../config/appConfig';

const reportTabs = [
  { id: 'zones', label: 'Zone Performance' },
  { id: 'students', label: 'Students' },
  { id: 'availability', label: 'Availability' },
  { id: 'events', label: 'Events' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'officers', label: 'Officer Activity' },
];

const D = { from: '', to: '', zoneId: '', institutionId: '', department: '', year: '', category: '', status: '' };
const C = ['#0f8a76', '#1f3763', '#f59e0b', '#f43f5e', '#38bdf8'];

export default function Reports() {
  usePageTitle('Reports & Analytics');
  const { aid } = useAuth();
  const { can } = usePermissions();
  const v = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Performance Overview state
  const [type, setType] = useState('zones');
  const [f, setF] = useState(D);
  const [page, setPage] = useState(1);

  // Export Centre state
  const [pv, setPv] = useState(null);

  const set = (p) => {
    setF((x) => ({ ...x, ...p }));
    setPage(1);
  };
  const o = studentFilterOptions();
  const rows = useMemo(() => rep.reportRows(aid, type, f), [aid, type, f, v]);
  const br = type === 'students' ? rep.studentBreakdowns(f) : null;
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const pg = Math.min(page, pages);

  const weekly =
    type === 'availability'
      ? Object.values(
          rows.reduce((m, r) => {
            (m[r.Week] ??= { week: r.Week.slice(5), s: 0, n: 0 });
            m[r.Week].s += r['Submission rate %'];
            m[r.Week].n++;
            return m;
          }, {})
        ).map((x) => ({ week: x.week, rate: Math.round(x.s / x.n) }))
      : [];

  const exp = (fmt) => {
    try {
      downloadFile(rep.exportReport(aid, type, f, fmt));
      toast.success(`${fmt.toUpperCase()} downloaded (${rows.length} rows).`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const bar = (data, keys, labels = keys) => (
    <BarChart data={data} margin={{ left: -15 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" fontSize={10} />
      <YAxis fontSize={12} />
      <Tooltip />
      <Legend />
      {keys.map((k, i) => (
        <Bar key={k} dataKey={k} name={labels[i]} fill={C[i % C.length]} />
      ))}
    </BarChart>
  );

  // Export Centre handlers
  const ds = exportable(aid);
  const dq = getDataQuality(aid);
  const pvRows = pv ? datasetRows(aid, pv) : [];
  const pvCols = pvRows[0] ? Object.keys(pvRows[0]) : [];

  const handleExportDataset = (id, fmt) => {
    try {
      downloadFile(exportDataset(aid, id, fmt));
      toast.success(`${fmt.toUpperCase()} downloaded.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const mainTabs = [
    { id: 'overview', label: 'Performance Overview', icon: BarChart3 },
    { id: 'export', label: 'Export Centre & Compliance', icon: DatabaseZap },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Analytics"
        subtitle="System-wide performance indicators, operational metrics, and verified dataset exports."
        actions={
          currentTab === 'overview' ? (
            <>
              {can('reports.export') && (
                <>
                  <Button variant="secondary" disabled={!rows.length} onClick={() => exp('xls')}>
                    <FileDown className="h-4 w-4" />
                    Excel (.xls)
                  </Button>
                  <Button disabled={!rows.length} onClick={() => exp('csv')}>
                    <FileDown className="h-4 w-4" />
                    CSV
                  </Button>
                </>
              )}
              <Button variant="outline" disabled={!rows.length} onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                PDF preview (print)
              </Button>
            </>
          ) : null
        }
      />

      <Tabs
        label="Reports Navigation"
        tabs={mainTabs}
        value={currentTab}
        onChange={setTab}
      />

      {currentTab === 'overview' && (
        <div className="space-y-4">
          <Tabs
            label="Report type"
            tabs={reportTabs}
            value={type}
            onChange={(t) => {
              setType(t);
              setPage(1);
            }}
          />

          <FilterBar onClear={() => { setF(D); setPage(1); }} active={JSON.stringify(f) !== JSON.stringify(D)}>
            <div>
              <label htmlFor="rf" className="label">From date</label>
              <input id="rf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} />
            </div>
            <div>
              <label htmlFor="rt" className="label">To date</label>
              <input id="rt" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
            <SelectField id="rz" label="Zone" value={f.zoneId} onChange={(x) => set({ zoneId: x, institutionId: '' })} options={o.zones} />
            <SelectField id="ri" label="Institution" value={f.institutionId} onChange={(x) => set({ institutionId: x })} options={o.institutions.filter((i) => !f.zoneId || i.zoneId === f.zoneId)} />
            <SelectField id="rd" label="Department" value={f.department} onChange={(x) => set({ department: x })} options={o.departments} />
            <SelectField id="ry" label="Academic year" value={f.year} onChange={(x) => set({ year: x })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
            <SelectField id="rc" label="Event category" value={f.category} onChange={(x) => set({ category: x })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
            <SelectField id="rs" label="Event status" value={f.status} onChange={(x) => set({ status: x })} options={Object.entries(eventStatuses).map(([value, label]) => ({ value, label }))} />
          </FilterBar>

          {type === 'officers' && (
            <Notice tone="info">
              These are measurable <b>operational indicators</b>, not a performance ranking: activity depends on zone size, student availability and events assigned. No scores or rankings are produced.
            </Notice>
          )}

          {type === 'students' && !can('students.export') && (
            <Notice tone="neutral">
              Email and phone columns are hidden because your role cannot export personal student data.
            </Notice>
          )}

          {rows.length === 0 ? (
            <EmptyState title="No data for these filters" text="Widen the date range or clear filters." />
          ) : (
            <>
              <Card className="print:hidden">
                <CardHeader title="Chart" />
                <div className="h-72" role="img" aria-label={`${type} report chart`}>
                  <ResponsiveContainer>
                    {type === 'zones'
                      ? bar(rows.map((r) => ({ name: r.Code, a: r['Submission rate %'], b: r['Participation % (accepted ÷ invited)'], c: r['Attendance % (present ÷ accepted)'] })), ['a', 'b', 'c'], ['Submission %', 'Participation %', 'Attendance %'])
                      : type === 'availability'
                      ? <LineChart data={weekly} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip formatter={(x) => `${x}%`} /><Line dataKey="rate" name="Avg submission rate" stroke={C[0]} strokeWidth={2} /></LineChart>
                      : type === 'events'
                      ? bar(rows.map((r) => ({ name: r.Event.slice(0, 14), a: r.Accepted, b: r.Declined, c: r.Pending })), ['a', 'b', 'c'], ['Accepted', 'Declined', 'Pending'])
                      : type === 'institutions'
                      ? bar(rows.map((r) => ({ name: r.Code, a: r['Latest-week submission %'], b: r['Participation %'], c: r['Attendance %'] })), ['a', 'b', 'c'], ['Submission %', 'Participation %', 'Attendance %'])
                      : type === 'officers'
                      ? bar(rows.map((r) => ({ name: r.Officer.split(' ')[0], a: r['Events managed'], b: r['Events completed'] })), ['a', 'b'], ['Events managed', 'Events completed'])
                      : bar(br.byZone.map((x) => ({ name: x.name, a: x.value })), ['a'], ['Students'])}
                  </ResponsiveContainer>
                </div>
                {br && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[['Department', br.byDepartment], ['Academic year', br.byYear], ['Account status', br.byStatus]].map(([t, d]) => (
                      <div key={t}>
                        <p className="mb-1 text-sm font-bold text-navy">By {t.toLowerCase()}</p>
                        <div className="h-48">
                          <ResponsiveContainer>{bar(d.map((x) => ({ name: x.name, a: x.value })), ['a'], ['Students'])}</ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-0 sm:p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{type} report</caption>
                    <thead className="bg-lavender-100 text-xs uppercase text-ink-soft">
                      <tr>
                        {cols.map((c) => (
                          <th key={c} scope="col" className="whitespace-nowrap px-3 py-3 text-left">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lavender-200 print:hidden">
                      {rows.slice((pg - 1) * 10, pg * 10).map((r, i) => (
                        <tr key={i} className="hover:bg-lavender-50">
                          {cols.map((c) => (
                            <td key={c} className="whitespace-nowrap px-3 py-2">
                              {r[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tbody className="hidden divide-y divide-lavender-200 print:table-row-group">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          {cols.map((c) => (
                            <td key={c} className="px-2 py-1 text-xs">
                              {r[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="print:hidden">
                  <Pagination page={pg} pages={pages} total={rows.length} pageSize={10} onPage={setPage} />
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {currentTab === 'export' && (
        <div className="space-y-4">
          <Card>
            <CardHeader icon={Download} title="Export Datasets" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ds.map((d) => (
                <div key={d.id} className="rounded-2xl border border-lavender-200 p-4">
                  <p className="font-bold text-navy">{d.label}</p>
                  <p className="mb-2 text-xs text-ink-soft">
                    {d.note ?? 'No personal contact data.'}
                  </p>
                  {d.allowed ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPv(d.id)}>
                        Preview
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleExportDataset(d.id, 'xls')}>
                        Excel
                      </Button>
                      <Button size="sm" onClick={() => handleExportDataset(d.id, 'csv')}>
                        CSV
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-amber-800">
                      Not permitted for your role ({d.perm})
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-mute">
              Exports are generated dynamically from MySQL and audited in system activity logs.
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={ShieldCheck}
              title="Data Quality Monitor"
              action={
                <Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">
                  Detect only – integrity rules
                </Badge>
              }
            />
            {dq.length === 0 ? (
              <EmptyState title="No data quality issues found" />
            ) : (
              <ul className="divide-y divide-lavender-200">
                {dq.map((q) => (
                  <li key={q.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge kind={q.severity} />
                      <Link to={q.link} className="font-semibold text-navy hover:underline">
                        {q.title}
                      </Link>
                      <span className="text-sm text-ink-soft">({q.count})</span>
                    </div>
                    <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                      {q.items.map((it, i) => (
                        <li key={i}>
                          <Link
                            className="rounded-lg bg-lavender-50 px-2 py-1 text-brand-700 hover:underline"
                            to={it.link}
                          >
                            {it.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Modal
            open={!!pv}
            onOpenChange={(o) => !o && setPv(null)}
            size="xl"
            title={`Preview: ${ds.find((x) => x.id === pv)?.label ?? ''}`}
            description="First 5 rows for validation prior to export."
          >
            {pvRows.length === 0 ? (
              <EmptyState title="No rows" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-lavender-100 uppercase">
                    <tr>
                      {pvCols.map((c) => (
                        <th key={c} className="px-2 py-1 text-left">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lavender-200">
                    {pvRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {pvCols.map((c) => (
                          <td key={c} className="whitespace-nowrap px-2 py-1">
                            {r[c]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
