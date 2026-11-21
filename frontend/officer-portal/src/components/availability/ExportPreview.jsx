import { useState } from 'react';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { Button, Modal, Notice } from '../ui';
import { exportRows, exportAvailability } from '../../services/availabilityService';
import { downloadFile } from '../../utils/exportFiles';
import { useAuth } from '../../hooks/useAuth';
import { appConfig } from '../../config/appConfig';

export default function ExportPreview({ open, onOpenChange, ws, filters }) {
  const { oid, officer } = useAuth(); const [busy, setBusy] = useState('');
  const rows = open ? exportRows(oid, ws, filters) : [];
  const go = (fmt) => { try { setBusy(fmt); downloadFile(exportAvailability(oid, ws, filters, fmt)); toast.success(`${fmt.toUpperCase()} downloaded (${rows.length} rows).`); } catch (e) { toast.error(e.message); } finally { setBusy(''); } };
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title="Export availability" description={`${rows.length} rows · only ${officer.zoneLabel} data · filters applied`}
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button variant="secondary" disabled={!appConfig.permissions.canExport || !rows.length} loading={busy === 'xls'} onClick={() => go('xls')}><FileDown className="h-4 w-4" />Excel (.xls)</Button><Button disabled={!appConfig.permissions.canExport || !rows.length} loading={busy === 'csv'} onClick={() => go('csv')}><FileDown className="h-4 w-4" />CSV</Button></>}>
      <Notice tone="info" className="mb-3">Preview of the first 8 rows. The Excel export is an HTML-table .xls that opens in Excel; a true .xlsx writer will be added with the backend. Exporting is recorded in the activity log.</Notice>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-lavender-100"><tr>{cols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-2 text-left">{c}</th>)}</tr></thead><tbody className="divide-y divide-lavender-200">{rows.slice(0, 8).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className="whitespace-nowrap px-2 py-1.5">{r[c]}</td>)}</tr>)}</tbody></table></div>
    </Modal>
  );
}
