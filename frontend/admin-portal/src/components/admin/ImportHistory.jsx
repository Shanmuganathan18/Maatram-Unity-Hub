/**
 * src/components/admin/ImportHistory.jsx
 *
 * Live Import History viewer for Administrators:
 * Queries GET /api/v1/admin/imports to display all bulk account provisioning sessions:
 * - File name, entity type (students / officers)
 * - Status (IMPORTED, FAILED, PROCESSING)
 * - Total, Valid, and Invalid record counts
 * - Detailed error reports and failure reasons in a modal
 */
import { useEffect, useState } from 'react';
import { FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, DataTable, EmptyState, Modal, StatusBadge } from '../ui';
import { api } from '../../services/api';
import { fmtInstant } from '../../utils/dates';

export default function ImportHistory() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/imports');
      if (res?.data) {
        setJobs(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load import history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const cols = [
    {
      key: 'fileName',
      label: 'File Name',
      render: (j) => (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-navy">{j.fileName}</span>
        </div>
      ),
    },
    {
      key: 'entityType',
      label: 'Target',
      render: (j) => (
        <Badge className="border-lavender-300 bg-lavender-50 capitalize text-navy">
          {j.entityType || 'students'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (j) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            j.status === 'IMPORTED'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : j.status === 'FAILED'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {j.status === 'IMPORTED' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
          {j.status === 'FAILED' && <AlertCircle className="h-3 w-3 text-rose-600" />}
          {j.status !== 'IMPORTED' && j.status !== 'FAILED' && <Clock className="h-3 w-3 text-amber-600" />}
          {j.status}
        </span>
      ),
    },
    {
      key: 'totalRows',
      label: 'Total Rows',
      render: (j) => <span className="font-mono text-xs">{j.totalRows}</span>,
    },
    {
      key: 'validRows',
      label: 'Valid',
      render: (j) => <span className="font-mono text-xs text-emerald-700 font-bold">{j.validRows}</span>,
    },
    {
      key: 'invalidRows',
      label: 'Invalid',
      render: (j) => (
        <span className={`font-mono text-xs ${j.invalidRows > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}`}>
          {j.invalidRows}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Uploaded At',
      render: (j) => <span className="text-xs text-ink-soft">{fmtInstant(j.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (j) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedJob(j)}>
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-navy">Bulk Provisioning Import History</h3>
          <p className="text-xs text-ink-soft">
            Audit history of all CSV and Excel file uploads with live processing counts and error logs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs} loading={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="p-0 sm:p-0">
        <DataTable
          caption="Import history logs"
          columns={cols}
          rows={jobs}
          empty={
            <EmptyState
              icon={FileSpreadsheet}
              title="No import jobs recorded yet"
              text="When you upload CSV or Excel files in bulk provisioning, the audit logs will appear here."
            />
          }
          renderCard={(j) => (
            <div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-navy">{j.fileName}</span>
                <Badge className="capitalize">{j.entityType}</Badge>
              </div>
              <p className="text-xs text-ink-soft mt-1">
                {j.validRows} valid / {j.totalRows} total · {fmtInstant(j.createdAt)}
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setSelectedJob(j)}>
                View Details
              </Button>
            </div>
          )}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!selectedJob}
        onOpenChange={(open) => !open && setSelectedJob(null)}
        title={`Import Job: ${selectedJob?.fileName ?? ''}`}
        description={`Session ID: ${selectedJob?.id ?? ''}`}
        size="lg"
        footer={<Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>}
      >
        {selectedJob && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-lavender-50 p-3 text-center">
                <p className="text-xs text-ink-mute">Entity</p>
                <p className="font-bold text-navy capitalize">{selectedJob.entityType}</p>
              </div>
              <div className="rounded-xl bg-lavender-50 p-3 text-center">
                <p className="text-xs text-ink-mute">Total Rows</p>
                <p className="font-bold text-navy">{selectedJob.totalRows}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-800">Provisioned</p>
                <p className="font-bold text-emerald-700">{selectedJob.validRows}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-center">
                <p className="text-xs text-rose-800">Rejected</p>
                <p className="font-bold text-rose-700">{selectedJob.invalidRows}</p>
              </div>
            </div>

            {selectedJob.errors && selectedJob.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="font-bold text-rose-800">Errors & Warnings ({selectedJob.errors.length})</p>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs">
                  <ul className="space-y-1.5">
                    {selectedJob.errors.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-rose-600 shrink-0">#{i + 1}</span>
                        <span>
                          {typeof err === 'string' ? err : `${err.email || err.registerNumber || 'Row'}: ${err.error || JSON.stringify(err)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                ✅ All records in this file passed schema validation without errors.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

