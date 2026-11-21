import { useState } from 'react';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Modal, Notice, PendingTag } from '../ui';
import { appConfig } from '../../config/appConfig';
import { validateImport } from '../../services/importService';
import { useAuth } from '../../hooks/useAuth';

/** Optional bulk import UI: VALIDATION PREVIEW ONLY. Committing records stays disabled until the client confirms permission. */
export default function ImportDialog({ open, onOpenChange }) {
  const { oid } = useAuth();
  const [result, setResult] = useState(null); const [name, setName] = useState('');
  const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; setName(f.name); setResult(validateImport(oid, await f.text())); };
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title="Bulk student import (preview)" description="Checks a CSV before any import. Required columns: studentId, name, email, institutionCode, department, year."
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button disabled title="Pending client confirmation">Import valid rows</Button></>}>
      <div className="space-y-3">
        <Notice tone="warn" title={<>Importing is not enabled <PendingTag /></>}>Whether officers may bulk-create students is unconfirmed (permission <code>canImportStudents = {String(appConfig.permissions.canImportStudents)}</code>). This tool only validates your file; nothing is saved.</Notice>
        <div><label htmlFor="csv" className="label">Choose CSV file</label><input id="csv" type="file" accept=".csv,text/csv" className="field" onChange={onFile} /></div>
        {result && <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-semibold">{name}: {result.rows} row(s) · <span className="text-emerald-700">{result.valid} valid</span> · <span className="text-rose-700">{result.errors.length} problem(s)</span></p>
          {result.fatal && <Notice tone="danger">{result.fatal}</Notice>}
          {result.errors.length === 0 && !result.fatal && <p className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-4 w-4" />No problems found.</p>}
          <ul className="max-h-56 space-y-1 overflow-y-auto">{result.errors.map((e, i) => <li key={i} className="flex gap-2 rounded-lg bg-rose-50 p-2 text-rose-900"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />Row {e.row}: {e.message}</li>)}</ul></div>}
        <p className="flex items-center gap-2 text-xs text-ink-mute"><Upload className="h-3 w-3" />Only institutions in your zone are accepted as institutionCode.</p>
      </div>
    </Modal>
  );
}
