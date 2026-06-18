'use client';

import { useState } from 'react';
import { useSalaryRevisions, useCreateSalaryRevision, useSalaryPreview } from '@/hooks/useSalaryRevisions';
import type { SalaryRevision, CreateSalaryRevisionDto } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n?: number | null) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Breakdown row ────────────────────────────────────────────────────────────
function Row({ label, value, strong }: { label: string; value: number | undefined | null; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${strong ? 'font-semibold border-t mt-1 pt-2' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'text-slate-800' : 'text-slate-700'}>{fmt(value)}</span>
    </div>
  );
}

// ─── Live preview panel ───────────────────────────────────────────────────────
function SalaryPreview({ employeeId, gross }: { employeeId: string; gross: number }) {
  const { data, isLoading } = useSalaryPreview(employeeId, gross);

  if (gross <= 0) return null;
  if (isLoading) return <p className="text-xs text-slate-400 mt-2">Calculating…</p>;
  if (!data) return null;

  return (
    <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Auto-calculated Breakdown
      </p>
      <Row label="Basic"             value={data.basic} />
      <Row label="HRA"               value={data.hra} />
      <Row label="Medical"           value={data.medical} />
      <Row label="Conveyance"        value={data.conveyance} />
      <Row label="Bonus (Bonus Act)" value={data.bonus} />
      <Row label="Leave Allowance"   value={data.leaveAllowance} />
      <Row label="Other Allowance"   value={data.otherAllowance} />
      <Row label="Gross (CTC)"       value={data.grossSalary} strong />
    </div>
  );
}

// ─── Add revision modal ───────────────────────────────────────────────────────
function AddRevisionModal({
  employeeId,
  onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const create = useCreateSalaryRevision(employeeId);
  const [form, setForm] = useState<CreateSalaryRevisionDto>({
    effectiveFrom: new Date().toISOString().split('T')[0],
    grossSalary: 0,
    otMultiplier: 1.5,
    remarks: '',
  });
  const [grossInput, setGrossInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grossSalary || form.grossSalary <= 0) return;
    await create.mutateAsync(form);
    onClose();
  };

  const handleGrossChange = (v: string) => {
    setGrossInput(v);
    const n = parseFloat(v.replace(/,/g, ''));
    setForm(f => ({ ...f, grossSalary: isNaN(n) ? 0 : n }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Add / Revise Salary</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Effective from */}
          <div>
            <label className="form-label">Effective From <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={form.effectiveFrom}
              onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
              className="form-input"
            />
          </div>

          {/* Gross salary */}
          <div>
            <label className="form-label">Monthly Gross (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              min={1}
              placeholder="e.g. 50000"
              value={grossInput}
              onChange={e => handleGrossChange(e.target.value)}
              className="form-input"
            />
            <p className="text-xs text-slate-400 mt-0.5">
              All components are auto-calculated from gross salary.
            </p>
          </div>

          {/* Live preview */}
          <SalaryPreview employeeId={employeeId} gross={form.grossSalary} />

          {/* OT Multiplier */}
          <div>
            <label className="form-label">OT Rate Multiplier</label>
            <select
              value={form.otMultiplier}
              onChange={e => setForm(f => ({ ...f, otMultiplier: Number(e.target.value) }))}
              className="form-input"
            >
              <option value={1}>1× (no extra — single rate)</option>
              <option value={1.5}>1.5× (time and a half)</option>
              <option value={2}>2× (double time)</option>
            </select>
            <p className="text-xs text-slate-400 mt-0.5">
              OT Pay = (Basic ÷ 26 ÷ shift hours) × multiplier × OT hours
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="form-label">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Annual increment, Promotion…"
              value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              className="form-input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || form.grossSalary <= 0}
              className="btn btn-primary flex-1"
            >
              {create.isPending ? 'Saving…' : 'Save Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────
function RevisionCard({ rev }: { rev: SalaryRevision }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = !rev.effectiveTo;

  return (
    <div className={`border rounded-lg p-4 ${isActive ? 'border-primary/40 bg-primary/5' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{fmt(rev.grossSalary)}</span>
            {isActive && (
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                Current
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {fmtDate(rev.effectiveFrom)}
            {rev.effectiveTo ? ` → ${fmtDate(rev.effectiveTo)}` : ' → Present'}
          </p>
          {rev.remarks && <p className="text-xs text-slate-500 mt-0.5 italic">{rev.remarks}</p>}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? 'Hide' : 'View'} breakdown
        </button>
      </div>

      {/* Breakdown */}
      {expanded && (
        <div className="mt-3 border-t pt-3">
          <Row label="Basic"          value={rev.basic} />
          <Row label="HRA"            value={rev.hra} />
          <Row label="Medical"        value={rev.medical} />
          <Row label="Conveyance"     value={rev.conveyance} />
          {rev.bonus > 0          && <Row label="Bonus"          value={rev.bonus} />}
          {rev.leaveAllowance > 0 && <Row label="Leave Allow."  value={rev.leaveAllowance} />}
          <Row label="Other Allow."   value={rev.otherAllowance} />
          <Row label="Gross"          value={rev.grossSalary} strong />
          <div className="flex justify-between py-1 text-xs text-slate-400 border-t mt-1 pt-1">
            <span>OT Multiplier</span>
            <span>{rev.otMultiplier ?? 1.5}×</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function SalaryRevisionPanel({ employeeId }: { employeeId: string }) {
  const { data: revisions = [], isLoading } = useSalaryRevisions(employeeId);
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Salary Revisions</h3>
          <p className="text-xs text-slate-400">
            Gross salary history — all components auto-calculated
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          + Add / Revise
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && revisions.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">
          No salary revision on record.{' '}
          <button onClick={() => setShowModal(true)} className="text-primary hover:underline">
            Add one
          </button>
          .
        </div>
      )}

      <div className="space-y-3">
        {revisions.map(rev => (
          <RevisionCard key={rev.id} rev={rev} />
        ))}
      </div>

      {showModal && (
        <AddRevisionModal
          employeeId={employeeId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
