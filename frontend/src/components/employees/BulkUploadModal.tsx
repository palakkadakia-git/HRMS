'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useBulkUpload } from '@/hooks/useEmployees';

interface Props { open: boolean; onClose: () => void; }

interface BulkResult {
  total: number; success: number; failed: number;
  errors: { row: number; data: any; error: string }[];
}

export default function BulkUploadModal({ open, onClose }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [file, setFile]     = useState<File | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const bulk = useBulkUpload();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    const res = await bulk.mutateAsync(file);
    setResult(res);
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Upload Employees"
      size="lg"
      footer={
        result ? (
          <button className="btn btn-primary" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={handleClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || bulk.isPending}>
              {bulk.isPending ? 'Uploading…' : 'Upload & Create'}
            </button>
          </>
        )
      }
    >
      {!result ? (
        <div className="space-y-5">
          {/* Step 1 — Template */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xl">1️⃣</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Download the Excel template</p>
              <p className="text-xs text-blue-600 mt-0.5 mb-2">Fill in employee details using the template format.</p>
              <a
                href="/api/employees/template"
                download="employee-bulk-upload-template.xlsx"
                className="btn btn-outline btn-sm"
              >
                📥 Download Template (.xlsx)
              </a>
            </div>
          </div>

          {/* Step 2 — Upload */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xl">2️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">Upload the filled Excel file</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">Only .xlsx and .xls files are accepted.</p>
              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm text-slate-600 font-medium">
                  {file ? file.name : 'Click to select Excel file'}
                </p>
                {file && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* Rules */}
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600">Rules:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Employee codes are auto-generated — do not include them</li>
              <li>Aadhaar, PAN, EPF, UAN, ESI must be unique across all employees</li>
              <li>Duplicate rows will be skipped and reported in the error list</li>
              <li>Documents must be uploaded individually after bulk import</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Result view */
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-700">{result.total}</div>
              <div className="text-xs text-slate-500 mt-1">Total Rows</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{result.success}</div>
              <div className="text-xs text-emerald-600 mt-1">Created</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-500">{result.failed}</div>
              <div className="text-xs text-red-500 mt-1">Failed</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-600 mb-2">⚠ Errors ({result.errors.length})</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                    <strong>Row {err.row}:</strong> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
