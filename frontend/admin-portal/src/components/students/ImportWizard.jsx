import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldAlert,
  Users,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Notice, Badge } from '../ui';
import { api } from '../../services/api';

export default function ImportWizard({ onDone, target = 'students' }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'completed'
  const [entityType, setEntityType] = useState(target); // 'students' | 'officers'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [commonPassword, setCommonPassword] = useState('Maatram@2026');
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Template download
  const handleDownloadTemplate = async (format) => {
    try {
      const endpoint = `/admin/${entityType}/import/template?format=${format}`;
      const blob = await api.downloadBlob(endpoint);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maatram-${entityType}-import-template.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} template downloaded.`);
    } catch (err) {
      toast.error(err.message || 'Failed to download template.');
    }
  };

  // Upload and preview
  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload a valid CSV or Excel (.xlsx, .xls) file.');
      return;
    }

    try {
      setUploading(true);
      setFile(selectedFile);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const endpoint = `/admin/${entityType}/import/preview`;
      const res = await api.upload(endpoint, formData);

      if (res?.data) {
        const raw = res.data;
        const validList = raw.validRecords || (raw.rows ? raw.rows.filter((r) => r.status === 'VALID') : []);
        const invalidList = raw.invalidRecords || (raw.rows ? raw.rows.filter((r) => r.status !== 'VALID') : []);
        const total = raw.totalRecords || raw.totalRows || (raw.rows ? raw.rows.length : 0);

        const normalized = {
          ...raw,
          totalRecords: total,
          validRecords: validList.map((r, i) => ({
            ...r,
            rowNumber: r.rowNumber || r.row || i + 1,
            name: r.name || 'Unknown',
            email: r.email || '',
            registerNumber: r.registerNumber || r.employeeId || '',
            employeeId: r.employeeId || r.registerNumber || '',
            institutionName: r.institutionName || r.matchedInstitution?.name || r.collegeInput || r.institution || '—',
            zoneName: r.zoneName || r.derivedZone?.name || r.assignedZone?.name || r.zone || 'Auto-derived',
          })),
          invalidRecords: invalidList.map((r, i) => ({
            ...r,
            rowNumber: r.rowNumber || r.row || i + 1,
            name: r.name || 'Unknown',
            email: r.email || '',
            registerNumber: r.registerNumber || r.employeeId || '',
            employeeId: r.employeeId || r.registerNumber || '',
            institution: r.institution || r.collegeInput || '—',
            reason: r.reason || (Array.isArray(r.errors) ? r.errors.join('; ') : 'Invalid data'),
          })),
          duplicatesCount: raw.duplicatesCount || raw.duplicateCount || 0,
        };

        setPreviewData(normalized);
        setStep('preview');
        toast.success(`Parsed ${total} records.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to parse import file.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    const validRows = previewData?.validRecords || [];
    if (!validRows.length) {
      toast.error('No valid records available for import.');
      return;
    }

    if (!commonPassword || commonPassword.length < 8) {
      toast.error('Temporary password must be at least 8 characters.');
      return;
    }

    try {
      setConfirming(true);
      const endpoint = `/admin/${entityType}/import/confirm`;
      const res = await api.post(endpoint, {
        rows: previewData.rows || validRows,
        validRecords: validRows,
        temporaryPassword: commonPassword,
        commonPassword,
        sendWelcomeEmail: notifyByEmail,
        notifyByEmail,
        fileName: file?.name || `${entityType}_import`,
      });

      if (res?.data) {
        setImportResult(res.data);
        setStep('completed');
        toast.success(`Successfully provisioned accounts!`);
      }
    } catch (err) {
      toast.error(err.message || 'Import confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  // Download error report
  const handleDownloadErrorReport = () => {
    if (!previewData?.invalidRecords?.length) {
      toast.info('No error records to export.');
      return;
    }

    const headers = ['Row Number', 'Name', 'Identifier', 'Email', 'Institution', 'Error Reason'];
    const rows = previewData.invalidRecords.map((r) => [
      r.rowNumber || '',
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.registerNumber || r.employeeId || r.studentId || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.institution || '').replace(/"/g, '""')}"`,
      `"${(r.errors || [r.reason || 'Invalid data']).join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-errors-${file?.name || 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Error report downloaded.');
  };

  return (
    <div className="space-y-5">
      {/* Entity Selector Tabs */}
      {step === 'upload' && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setEntityType('students')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              entityType === 'students'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Provision Students
          </button>
          <button
            type="button"
            onClick={() => setEntityType('officers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              entityType === 'officers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Provision Zonal Officers
          </button>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
            <div>
              <p className="text-xs font-bold text-indigo-950">Official Import Templates</p>
              <p className="text-[11px] text-indigo-700">
                Use verified columns to avoid formatting errors during bulk account creation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('csv')}
                className="bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50"
              >
                <FileText className="h-4 w-4 mr-1 text-indigo-600" />
                CSV Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" />
                Excel (.xlsx)
              </Button>
            </div>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            <FileUp className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-slate-800">
              Drag & drop your bulk {entityType} spreadsheet
            </h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Supports CSV, Microsoft Excel (.xlsx, .xls) up to 10MB
            </p>

            <label
              htmlFor="bulk-file-input"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition"
            >
              {uploading ? 'Processing File...' : 'Browse Computer'}
            </label>
            <input
              id="bulk-file-input"
              type="file"
              accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Important Rules:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
              <li>Zonal assignment is <b>never</b> client-supplied; it is automatically determined from the student's college.</li>
              <li>Students and officers will receive temporary passwords and be mandated to change them on first sign-in.</li>
              <li>Existing registered emails and IDs will be flagged as duplicates to avoid collisions.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATION */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-semibold text-slate-500">Total Records</span>
              <p className="text-xl font-extrabold text-slate-900">{previewData.totalRecords}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs font-semibold text-emerald-800">Valid & Ready</span>
              <p className="text-xl font-extrabold text-emerald-700">{previewData.validRecords?.length || 0}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-xs font-semibold text-rose-800">Invalid Records</span>
              <p className="text-xl font-extrabold text-rose-700">{previewData.invalidRecords?.length || 0}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-xs font-semibold text-amber-800">Duplicates</span>
              <p className="text-xl font-extrabold text-amber-700">{previewData.duplicatesCount || 0}</p>
            </div>
          </div>

          {/* Validation Notice */}
          {previewData.invalidRecords?.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  {previewData.invalidRecords.length} records have issues and will be skipped.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrorReport}
                className="bg-white border-rose-300 text-rose-700 hover:bg-rose-100 text-xs shrink-0"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Error Report
              </Button>
            </div>
          )}

          {/* Preview Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Row</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">{entityType === 'students' ? 'Reg No / ID' : 'Employee ID'}</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Institution</th>
                    <th className="px-3 py-2.5">Zone</th>
                    <th className="px-3 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {/* Valid records */}
                  {(previewData.validRecords || []).slice(0, 30).map((r, i) => (
                    <tr key={`v-${i}`} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{r.rowNumber || i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{r.registerNumber || r.employeeId || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{r.email}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate">{r.institutionName || r.institution || '—'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {r.zoneName || r.zone || 'Auto-derived'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Valid
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Invalid records */}
                  {(previewData.invalidRecords || []).slice(0, 20).map((r, i) => (
                    <tr key={`inv-${i}`} className="bg-rose-50/40 hover:bg-rose-50/80">
                      <td className="px-3 py-2 text-rose-400 font-mono text-[11px]">{r.rowNumber || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-rose-950">{r.name || 'Unknown'}</td>
                      <td className="px-3 py-2 text-rose-800 font-mono text-[11px]">{r.registerNumber || r.employeeId || '—'}</td>
                      <td className="px-3 py-2 text-rose-800">{r.email || '—'}</td>
                      <td className="px-3 py-2 text-rose-800 max-w-[150px] truncate">{r.institution || '—'}</td>
                      <td className="px-3 py-2 text-rose-500 text-[11px]">Unmapped</td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700" title={r.errors?.join('; ') || r.reason}>
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          {r.reason || 'Invalid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.validRecords?.length > 30 && (
              <div className="bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 border-t border-slate-200">
                Showing first 30 of {previewData.validRecords.length} valid records.
              </div>
            )}
          </div>

          {/* Provisioning Configuration Box */}
          <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
            <h5 className="font-bold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Credentials & Dispatch Configuration
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="comm-pwd">Initial Temporary Password</label>
                <input
                  id="comm-pwd"
                  type="text"
                  value={commonPassword}
                  onChange={(e) => setCommonPassword(e.target.value)}
                  className="field text-xs font-mono border-slate-300"
                  placeholder="e.g. Maatram@2026"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enforces forced change on first login (<code className="text-indigo-600">mustChangePassword: true</code>).
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={notifyByEmail}
                    onChange={(e) => setNotifyByEmail(e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Send Welcome Email via Gmail SMTP
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 ml-6 mt-0.5">
                  Sends credentials and login portal link to each provisioned user.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => { setStep('upload'); setPreviewData(null); }}
              disabled={confirming}
            >
              Upload Different File
            </Button>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20"
              loading={confirming}
              disabled={!previewData.validRecords?.length}
              onClick={handleConfirmImport}
            >
              Confirm & Provision {previewData.validRecords?.length || 0} Accounts
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLETED */}
      {step === 'completed' && importResult && (
        <div className="space-y-4 py-4 text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900">
            Account Provisioning Completed
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            The batch process has completed successfully. All accounts have been created in the database and Supabase Auth with temporary credentials.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto my-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="block text-lg font-bold text-slate-800">{importResult.createdCount || importResult.summary?.createdCount || 0}</span>
              <span className="text-[11px] text-slate-500">Created</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="block text-lg font-bold text-amber-700">{importResult.skippedCount || importResult.summary?.skippedCount || 0}</span>
              <span className="text-[11px] text-slate-500">Duplicates</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="block text-lg font-bold text-rose-700">{importResult.failedCount || importResult.summary?.failedCount || 0}</span>
              <span className="text-[11px] text-slate-500">Failed</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => { setStep('upload'); setPreviewData(null); setImportResult(null); }}
            >
              Import More
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => onDone?.()}
            >
              Done & Return
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
