import { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Notice, Badge } from '../ui';
import { api } from '../../services/api';

/**
 * Universal CSV Parser that handles commas, quotes, newlines, and headerless files.
 */
function parseCsvText(text, columns = []) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseRow = (row) => {
    const cells = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (insideQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const firstRowCells = parseRow(lines[0]);
  const colKeys = columns.map((c) => (c.key || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const colLabels = columns.map((c) => (c.label || '').toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Check if first line matches any expected headers
  const headerMatchCount = firstRowCells.filter((c) => {
    const clean = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    return colKeys.includes(clean) || colLabels.includes(clean);
  }).length;

  const hasEmail = firstRowCells.some((c) => c.includes('@'));
  const isHeaderRow = !hasEmail && headerMatchCount >= 1 && lines.length > 1;

  if (isHeaderRow) {
    const headers = firstRowCells.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const rawCells = parseRow(lines[i]);
      if (rawCells.every((c) => !c)) continue;
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rawCells[idx] || '';
      });
      rows.push(rowObj);
    }
    return rows;
  }

  // Headerless CSV: map lines directly to expected columns by position
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const rawCells = parseRow(lines[i]);
    if (rawCells.every((c) => !c)) continue;
    const rowObj = {};
    columns.forEach((col, idx) => {
      const cleanCol = (col.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanKey = (col.key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const val = rawCells[idx] || '';
      rowObj[cleanCol] = val;
      rowObj[cleanKey] = val;
      rowObj[col.key] = val;
    });
    rows.push(rowObj);
  }
  return rows;
}

export default function BulkImportModal({
  open,
  onOpenChange,
  title = 'Bulk Import',
  entityName = 'Records',
  columns = [], // e.g. [{ key: 'code', label: 'Code', required: true }]
  sampleRows = [],
  endpoint = '',
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setParsedRows([]);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    const headerRow = columns.map((c) => `"${c.label}"`).join(',');
    const sampleLines = sampleRows.map((row) =>
      columns.map((c) => `"${(row[c.key] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerRow, ...sampleLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${entityName.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded.');
  };

  // Handle uploaded file
  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);

    try {
      let text = await selectedFile.text();
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
      const rawRows = parseCsvText(text, columns);

      if (!rawRows.length) {
        toast.error('The selected file appears to be empty or has no data rows.');
        return;
      }

      // Map raw columns to defined schema keys
      const mapped = rawRows.map((raw) => {
        const item = {};
        columns.forEach((col) => {
          const cleanCol = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          item[col.key] = raw[cleanCol] || raw[cleanKey] || raw[col.key] || '';
        });
        return item;
      });

      setParsedRows(mapped);
      toast.success(`Parsed ${mapped.length} rows.`);
    } catch (err) {
      toast.error('Could not parse file. Please upload a standard CSV file.');
      setFile(null);
    }
  };

  // Submit parsed items to backend endpoint
  const handleConfirmImport = async () => {
    if (!parsedRows.length) return;

    setLoading(true);
    try {
      const res = await api.post(endpoint, { items: parsedRows });
      toast.success(res.message || `Successfully imported ${parsedRows.length} ${entityName}!`);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Import failed. Please check your data format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      size="xl"
      title={title}
      description={`Bulk upload multiple ${entityName.toLowerCase()} at once instead of creating them one by one.`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" type="button" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            Download CSV Template
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!parsedRows.length || loading}
              loading={loading}
              onClick={handleConfirmImport}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Import {parsedRows.length > 0 ? `${parsedRows.length} ${entityName}` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Upload dropzone if no file selected */}
        {!parsedRows.length ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileChange(dropped);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-navy">
              Drag & drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Supports CSV format. Download the template below if you need the exact column layout.
            </p>
            <div className="mt-4">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
                <Upload className="h-4 w-4 text-brand-600" />
                Select CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>{file?.name}</span>
                <Badge tone="success">{parsedRows.length} valid rows</Badge>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
              >
                <X className="h-3.5 w-3.5" />
                Upload different file
              </button>
            </div>

            {/* Preview table */}
            <div className="max-h-64 overflow-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">#</th>
                    {columns.map((c) => (
                      <th key={c.key} className="py-2 px-3 font-semibold">
                        {c.label} {c.required && <span className="text-rose-600">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      {columns.map((c) => (
                        <td key={c.key} className="py-1.5 px-3 text-slate-800">
                          {row[c.key] || <span className="text-slate-300 italic">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-xs text-ink-soft text-right">
                Showing preview of first 50 rows of {parsedRows.length} total records.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

