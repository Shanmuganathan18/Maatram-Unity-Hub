import { useState } from 'react';
import { AlertTriangle, DatabaseZap, Download, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  PendingTag,
  StatusBadge,
  Tabs,
} from '../components/ui';
import ImportWizard from '../components/students/ImportWizard';
import EmailDeliveryCentre from '../components/admin/EmailDeliveryCentre';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { datasetRows, exportDataset, exportable, importHistory } from '../services/dataService';
import { getDataQuality } from '../services/dataQualityService';
import { downloadFile } from '../utils/exportFiles';
import { fmtInstant } from '../utils/dates';

export default function DataCentre() {
  usePageTitle('Import / export & email centre');
  const { aid } = useAuth();
  const { can } = usePermissions();
  useStore();
  const [activeTab, setActiveTab] = useState('data');
  const [imp, setImp] = useState(false);
  const [pv, setPv] = useState(null);

  const hist = importHistory(aid);
  const dq = getDataQuality(aid);
  const ds = exportable(aid);

  const go = (id, fmt) => {
    try {
      downloadFile(exportDataset(aid, id, fmt));
      toast.success(`${fmt.toUpperCase()} downloaded.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const rows = pv ? datasetRows(aid, pv) : [];
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import, Export & Email Delivery Centre"
        subtitle="Provision student and officer accounts in bulk, monitor automated credential activation emails, or export compliance datasets."
        actions={
          can('students.import') && (
            <Button onClick={() => setImp(true)}>Bulk Account Provisioning</Button>
          )
        }
      />

      {/* Primary Section Tabs */}
      <Tabs
        label="Data Centre Navigation"
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'data', label: 'Bulk Provisioning & Exports' },
          { id: 'emails', label: 'Activation Email Logs & Retries' },
        ]}
      />

      {activeTab === 'emails' ? (
        <EmailDeliveryCentre />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader icon={DatabaseZap} title="Import history" />
            <DataTable
              caption="Import history"
              rows={hist}
              columns={[
                {
                  key: 'f',
                  label: 'File',
                  render: (i) => <span className="font-semibold text-navy">{i.fileName}</span>,
                },
                {
                  key: 'u',
                  label: 'Uploaded',
                  render: (i) => fmtInstant(i.uploadedAt),
                },
                { key: 'b', label: 'By', render: (i) => i.by },
                { key: 'r', label: 'Records', render: (i) => i.rows },
                {
                  key: 'v',
                  label: 'Valid',
                  render: (i) => <span className="text-emerald-700">{i.valid}</span>,
                },
                {
                  key: 'i',
                  label: 'Invalid',
                  render: (i) => (
                    <span className={i.invalid ? 'font-bold text-rose-700' : ''}>
                      {i.invalid}
                    </span>
                  ),
                },
                {
                  key: 's',
                  label: 'Status',
                  render: (i) => (
                    <Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">
                      {i.status}
                    </Badge>
                  ),
                },
              ]}
              renderCard={(i) => (
                <div>
                  <p className="font-bold text-navy">{i.fileName}</p>
                  <p className="text-xs text-ink-soft">
                    {fmtInstant(i.uploadedAt)} · {i.by}
                  </p>
                  <p className="text-sm">
                    {i.rows} rows · {i.valid} valid · {i.invalid} invalid
                  </p>
                  <p className="text-xs text-ink-mute">{i.status}</p>
                </div>
              )}
              empty={<EmptyState title="No imports yet" />}
            />
          </Card>

          <Card>
            <CardHeader icon={Download} title="Export centre" />
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
                      <Button size="sm" variant="secondary" onClick={() => go(d.id, 'xls')}>
                        Excel
                      </Button>
                      <Button size="sm" onClick={() => go(d.id, 'csv')}>
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
              Excel export is an HTML-table .xls that opens in Excel. Report scheduling (recurring
              exports) is a future enhancement – not available in this prototype{' '}
              <PendingTag>Future</PendingTag>.
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={ShieldCheck}
              title="Data quality monitor"
              action={
                <Badge className="border-lavender-300 bg-lavender-50 text-ink-soft">
                  Detect only – nothing changes automatically
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
        </div>
      )}

      <Modal
        open={imp}
        onOpenChange={setImp}
        size="lg"
        title="Bulk Account Provisioning"
        description="Upload CSV or Excel (.xlsx) files to preview, validate, and provision student or officer accounts."
      >
        <ImportWizard onDone={() => setImp(false)} />
      </Modal>

      <Modal
        open={!!pv}
        onOpenChange={(o) => !o && setPv(null)}
        size="lg"
        title={`Export preview: ${pv ?? ''}`}
        description={`${rows.length} rows · first 8 shown`}
        footer={
          <Button variant="outline" onClick={() => setPv(null)}>
            Close
          </Button>
        }
      >
        <Notice tone="info" icon={AlertTriangle} className="mb-3">
          This preview contains only what your role may export.
        </Notice>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-lavender-100">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-2 py-2 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-lavender-200">
              {rows.slice(0, 8).map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c} className="whitespace-nowrap px-2 py-1.5">
                      {r[c]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
