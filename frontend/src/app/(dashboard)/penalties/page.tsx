'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { usePenalties, useStaffEmployees, useCreatePenalty, useCancelPenalty } from '@/hooks/usePenalties';
import { useEmployees } from '@/hooks/useEmployees';
import { useSites } from '@/hooks/useSites';
import { usePermissions } from '@/hooks/usePermissions';
import type { Penalty, PenaltyStatus } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(val: number) {
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`;
}

const STATUS_BADGE: Record<PenaltyStatus, string> = {
  PENDING:              'bg-amber-100  text-amber-700',
  PARTIALLY_RECOVERED:  'bg-orange-100 text-orange-700',
  RECOVERED:            'bg-green-100  text-green-700',
  CANCELLED:            'bg-slate-100  text-slate-400',
};

// ── Issue Penalty Modal ───────────────────────────────────────────────────────

function IssuePenaltyModal({ onClose }: { onClose: () => void }) {
  const { data: empPage }    = useEmployees({ limit: 100 });
  const { data: staff = [] } = useStaffEmployees();
  const { data: sites = [] } = useSites();
  const create = useCreatePenalty();

  const employees = (empPage?.data ?? []).filter(e => e.status !== 'INACTIVE');

  const [form, setForm] = useState({
    employeeId: '',
    witnessId:  '',
    siteId:     '',
    amount:     '',
    reason:     '',
    date:       new Date().toISOString().slice(0, 10),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      employeeId: form.employeeId,
      witnessId:  form.witnessId,
      siteId:     form.siteId,
      amount:     parseFloat(form.amount),
      reason:     form.reason,
      date:       form.date,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Issue Penalty</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Employee</label>
            <select className="input" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} required>
              <option value="">Select employee…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} — {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Site</label>
            <select className="input" value={form.siteId} onChange={e => set('siteId', e.target.value)} required>
              <option value="">Select site…</option>
              {sites.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Explained in front of (Witness)</label>
            <select className="input" value={form.witnessId} onChange={e => set('witnessId', e.target.value)} required>
              <option value="">Select staff member…</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.employeeCode} — {s.firstName} {s.lastName}
                  {s.designation ? ` (${s.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min={1} value={form.amount}
                onChange={e => set('amount', e.target.value)} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date}
                onChange={e => set('date', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={3} placeholder="Describe the fault…"
              value={form.reason} onChange={e => set('reason', e.target.value)} required />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Issue Penalty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel Penalty Modal ──────────────────────────────────────────────────────

function CancelModal({ penalty, onClose }: { penalty: Penalty; onClose: () => void }) {
  const cancel = useCancelPenalty();
  const [cancelledBy,  setCancelledBy]  = useState('');
  const [cancelReason, setCancelReason] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await cancel.mutateAsync({ id: penalty.id, dto: { cancelledBy, cancelReason } });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Cancel Penalty</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Penalty of <span className="font-semibold">{fmt(penalty.amount)}</span> for{' '}
            <span className="font-semibold">{penalty.employee?.firstName} {penalty.employee?.lastName}</span>
          </p>
          <div>
            <label className="label">Cancelled By</label>
            <input className="input" type="text" placeholder="Your name"
              value={cancelledBy} onChange={e => setCancelledBy(e.target.value)} required />
          </div>
          <div>
            <label className="label">Reason for Cancellation</label>
            <textarea className="input" rows={2} placeholder="Why is this penalty being cancelled?"
              value={cancelReason} onChange={e => setCancelReason(e.target.value)} required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Back</button>
            <button type="submit" className="btn bg-red-500 text-white hover:bg-red-600 flex-1" disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PenaltiesPage() {
  const { can } = usePermissions();
  const now = new Date();

  const [monthFilter,  setMonthFilter]  = useState(now.getMonth() + 1);
  const [yearFilter,   setYearFilter]   = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<PenaltyStatus | ''>('');
  const [showIssue,    setShowIssue]    = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Penalty | null>(null);

  const { data: penalties = [], isLoading } = usePenalties({
    month:  monthFilter  || undefined,
    year:   yearFilter   || undefined,
    status: statusFilter || undefined,
  });

  const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <Header
        title="Penalties"
        subtitle="Issue and track employee penalties"
        actions={
          can('penalties', 'create') ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowIssue(true)}>
              + Issue Penalty
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select className="input w-32 text-sm" value={monthFilter}
            onChange={e => setMonthFilter(Number(e.target.value))}>
            <option value="">All months</option>
            {MONTHS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>

          <select className="input w-28 text-sm" value={yearFilter}
            onChange={e => setYearFilter(Number(e.target.value))}>
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select className="input w-44 text-sm" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PenaltyStatus | '')}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_RECOVERED">Partially Recovered</option>
            <option value="RECOVERED">Recovered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {(statusFilter) && (
            <button className="text-xs text-primary underline"
              onClick={() => setStatusFilter('')}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Witness</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                {can('penalties', 'delete') && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : penalties.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No penalties found.</td></tr>
              ) : penalties.map((p: Penalty) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${p.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {p.employee?.firstName} {p.employee?.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{p.employee?.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.site?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(p.date)}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">
                    <p className="truncate" title={p.reason}>{p.reason}</p>
                    {p.status === 'CANCELLED' && p.cancelReason && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">
                        Cancelled: {p.cancelReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {p.witness?.firstName} {p.witness?.lastName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{fmt(p.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={Number(p.balanceAmount) === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}>
                      {fmt(p.balanceAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  {can('penalties', 'delete') && (
                    <td className="px-4 py-3 text-right">
                      {(p.status === 'PENDING' || p.status === 'PARTIALLY_RECOVERED') && (
                        <button
                          onClick={() => setCancelTarget(p)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showIssue   && <IssuePenaltyModal onClose={() => setShowIssue(false)} />}
      {cancelTarget && <CancelModal penalty={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </>
  );
}
