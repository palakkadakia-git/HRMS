'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  usePayrollRuns, usePayrollPayslips, usePayrollSummary, usePayrollSiteCost,
  useRunPayroll, useFinalizePayroll, useApprovePayroll, useMarkPaidPayroll,
  useDeletePayrollRun, useUpdatePayslip,
} from '@/hooks/usePayroll';
import { usePermissions } from '@/hooks/usePermissions';
import type { PayrollRun, Payslip, PayrollStatus } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmt(n: number | string) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_BADGE: Record<PayrollStatus, string> = {
  DRAFT:     'bg-amber-100 text-amber-700',
  PROCESSED: 'bg-blue-100 text-blue-700',
  APPROVED:  'bg-indigo-100 text-indigo-700',
  PAID:      'bg-green-100 text-green-700',
};

// ── edit modal ─────────────────────────────────────────────────────────────────

interface EditModal {
  payslip: Payslip;
  tds: string;
  penalty: string;
  advance: string;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const now  = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);  // 1-12
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [detailTab,  setDetailTab]  = useState<'payslips' | 'site-cost'>('payslips');
  const [editModal, setEditModal] = useState<EditModal | null>(null);

  const { data: runs = [], isLoading: runsLoading } = usePayrollRuns();
  const activeRun = activeRunId ? runs.find((r) => r.id === activeRunId) : null;

  const { data: payslips = [], isLoading: slipsLoading } = usePayrollPayslips(activeRunId ?? '');
  const { data: summary } = usePayrollSummary(activeRunId ?? '');
  const { data: siteCost } = usePayrollSiteCost(activeRunId ?? '');

  const runPayroll   = useRunPayroll();
  const finalize     = useFinalizePayroll();
  const approve      = useApprovePayroll();
  const markPaid     = useMarkPaidPayroll();
  const deleteRun    = useDeletePayrollRun();
  const updateSlip   = useUpdatePayslip();

  const [genErr, setGenErr] = useState('');
  const { can } = usePermissions();

  async function handleGenerate() {
    setGenErr('');
    try {
      const run = await runPayroll.mutateAsync({ month: selMonth, year: selYear });
      setActiveRunId(run.id);
    } catch (e: any) {
      setGenErr(e?.response?.data?.message ?? 'Failed to generate payroll.');
    }
  }

  async function handleDelete(run: PayrollRun) {
    if (!confirm(`Delete DRAFT payroll for ${MONTHS[run.month - 1]} ${run.year}?`)) return;
    try {
      await deleteRun.mutateAsync(run.id);
      if (activeRunId === run.id) setActiveRunId(null);
    } catch (e: any) { alert(e?.response?.data?.message ?? 'Delete failed.'); }
  }

  async function handleFinalize() {
    if (!activeRunId) return;
    if (!confirm('Finalize payroll? No further edits will be possible after processing.')) return;
    try { await finalize.mutateAsync(activeRunId); }
    catch (e: any) { alert(e?.response?.data?.message ?? 'Error.'); }
  }

  async function handleApprove() {
    if (!activeRunId) return;
    try { await approve.mutateAsync(activeRunId); }
    catch (e: any) { alert(e?.response?.data?.message ?? 'Error.'); }
  }

  async function handleMarkPaid() {
    if (!activeRunId) return;
    try { await markPaid.mutateAsync(activeRunId); }
    catch (e: any) { alert(e?.response?.data?.message ?? 'Error.'); }
  }

  async function saveEdit() {
    if (!editModal) return;
    try {
      await updateSlip.mutateAsync({
        id: editModal.payslip.id,
        tds:              parseFloat(editModal.tds)    || 0,
        penaltyDeduction: parseFloat(editModal.penalty) || 0,
        advanceDeduction: parseFloat(editModal.advance) || 0,
      });
      setEditModal(null);
    } catch (e: any) { alert(e?.response?.data?.message ?? 'Save failed.'); }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <>
      <Header
        title="Payroll"
        subtitle="Monthly payroll processing & approval"
      />

      <main className="flex-1 p-6 space-y-6">

        {/* ── Generate panel ──────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Generate Payroll</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="input w-36">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
              <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className="input w-28">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {can('payroll', 'create') && (
              <button
                onClick={handleGenerate}
                disabled={runPayroll.isPending}
                className="btn btn-primary btn-sm"
              >
                {runPayroll.isPending ? 'Generating…' : '⚡ Generate Payroll'}
              </button>
            )}
          </div>
          {genErr && <p className="text-xs text-red-500 mt-2">{genErr}</p>}
          <p className="text-[11px] text-slate-400 mt-2">
            Generating for a month that already has a DRAFT will re-compute and replace it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Run history ──────────────────────────────────────────── */}
          <div className="card overflow-hidden lg:col-span-1">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700 text-sm">Payroll Runs</h2>
            </div>
            {runsLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : runs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No runs yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {runs.map((run) => (
                  <li
                    key={run.id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${activeRunId === run.id ? 'bg-indigo-50' : ''}`}
                    onClick={() => setActiveRunId(run.id)}
                  >
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {MONTHS[run.month - 1]} {run.year}
                      </p>
                      <p className="text-xs text-slate-400">{run._count?.payslips ?? 0} employees</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[run.status]}`}>
                        {run.status}
                      </span>
                      {can('payroll', 'delete') && run.status === 'DRAFT' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(run); }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Active run detail ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {!activeRun ? (
              <div className="card py-16 text-center text-slate-400">
                <p className="text-3xl mb-2">💰</p>
                <p>Select a payroll run to view details.</p>
              </div>
            ) : (
              <>
                {/* Status bar + action buttons */}
                <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {MONTHS[activeRun.month - 1]} {activeRun.year}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[activeRun.status]}`}>
                      {activeRun.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {can('payroll', 'update') && activeRun.status === 'DRAFT' && (
                      <button onClick={handleFinalize} disabled={finalize.isPending} className="btn btn-primary btn-sm">
                        {finalize.isPending ? 'Processing…' : 'Process →'}
                      </button>
                    )}
                    {can('payroll', 'update') && activeRun.status === 'PROCESSED' && (
                      <button onClick={handleApprove} disabled={approve.isPending} className="btn btn-primary btn-sm">
                        {approve.isPending ? 'Approving…' : 'Approve →'}
                      </button>
                    )}
                    {can('payroll', 'update') && activeRun.status === 'APPROVED' && (
                      <button onClick={handleMarkPaid} disabled={markPaid.isPending} className="btn btn-primary btn-sm">
                        {markPaid.isPending ? 'Marking…' : 'Mark Paid →'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Detail tabs */}
                <div className="flex gap-1 border-b border-slate-200">
                  {([['payslips', '📄 Payslips'], ['site-cost', '🏗 Site Cost']] as const).map(([t, label]) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDetailTab(t)}
                      className={`px-4 py-2 text-xs font-medium border-b-2 transition-all -mb-px ${
                        detailTab === t
                          ? 'border-primary text-primary'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Payslips tab ── */}
                {detailTab === 'payslips' && (
                  <>
                    {summary && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Gross',       value: summary.totalGross,      cls: 'text-slate-800' },
                          { label: 'Deductions',  value: summary.totalDeductions, cls: 'text-red-600'   },
                          { label: 'Net Pay',     value: summary.totalNet,        cls: 'text-green-700' },
                          { label: 'Employees',   value: summary.count,           cls: 'text-indigo-700', isCount: true },
                        ].map(({ label, value, cls, isCount }) => (
                          <div key={label} className="card p-3 text-center">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                            <p className={`font-bold text-lg ${cls}`}>
                              {isCount ? value : `₹${fmt(value)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Payslip table */}
                    <div className="card overflow-hidden">
                      {slipsLoading ? (
                        <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
                      ) : payslips.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-sm">No payslips in this run.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                                <th className="px-3 py-3 text-left font-semibold">Employee</th>
                                <th className="px-3 py-3 text-right font-semibold">Days</th>
                                <th className="px-3 py-3 text-right font-semibold">Gross</th>
                                <th className="px-3 py-3 text-right font-semibold">EPF</th>
                                <th className="px-3 py-3 text-right font-semibold">ESI</th>
                                <th className="px-3 py-3 text-right font-semibold">PT</th>
                                <th className="px-3 py-3 text-right font-semibold">Other Ded.</th>
                                <th className="px-3 py-3 text-right font-semibold text-green-700">Net</th>
                                {can('payroll', 'update') && activeRun.status === 'DRAFT' && (
                                  <th className="px-3 py-3 text-center font-semibold">Edit</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {payslips.map((ps) => {
                                const emp = ps.employee;
                                const name = emp ? `${emp.firstName} ${emp.lastName}` : '—';
                                const code = emp?.employeeCode ?? '';
                                const otherDed = Number(ps.tds) + Number(ps.penaltyDeduction) + Number(ps.advanceDeduction);
                                return (
                                  <tr key={ps.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5">
                                      <p className="font-medium text-slate-800">{name}</p>
                                      <p className="text-slate-400">{code}</p>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-slate-600">
                                      {Number(ps.presentDays)}/{ps.workingDays}
                                      {Number(ps.otHours) > 0 && (
                                        <span className="text-indigo-500 ml-1">+{Number(ps.otHours)}h OT</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">₹{fmt(ps.gross)}</td>
                                    <td className="px-3 py-2.5 text-right text-red-500">
                                      {Number(ps.empPF) > 0 ? `₹${fmt(ps.empPF)}` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-red-500">
                                      {Number(ps.empESI) > 0 ? `₹${fmt(ps.empESI)}` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-red-500">
                                      {Number(ps.pt) > 0 ? `₹${fmt(ps.pt)}` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-red-500">
                                      {otherDed > 0 ? `₹${fmt(otherDed)}` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-green-700">₹{fmt(ps.net)}</td>
                                    {can('payroll', 'update') && activeRun.status === 'DRAFT' && (
                                      <td className="px-3 py-2.5 text-center">
                                        <button
                                          onClick={() => setEditModal({
                                            payslip: ps,
                                            tds:     String(ps.tds),
                                            penalty: String(ps.penaltyDeduction),
                                            advance: String(ps.advanceDeduction),
                                          })}
                                          className="text-primary hover:underline"
                                        >
                                          Edit
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Employer cost summary */}
                    {summary && (
                      <div className="card p-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                          Employer Liability (CTC additions)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          {[
                            { label: 'Employer EPF (12%)',   value: summary.totalEmplPF   },
                            { label: 'Employer ESI (3.25%)', value: summary.totalEmplESI  },
                            { label: 'EDLI (0.5%)',           value: summary.totalEdli     },
                            { label: 'EPF Admin (0.5%)',      value: summary.totalEpfAdmin },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[11px] text-slate-400">{label}</p>
                              <p className="font-semibold text-slate-700">₹{fmt(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Site Cost tab ── */}
                {detailTab === 'site-cost' && (
                  <div className="space-y-4">
                    {!siteCost || siteCost.siteSummaries.length === 0 ? (
                      <div className="card py-12 text-center text-slate-400 text-sm">
                        <p className="text-3xl mb-2">🏗</p>
                        <p>No site allocation data. Run payroll first.</p>
                      </div>
                    ) : (
                      siteCost.siteSummaries.map((s) => (
                        <div key={s.siteId ?? 'unallocated'} className="card overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-800 text-sm">
                                {s.siteName ?? '(Unallocated)'}
                              </h3>
                              <p className="text-xs text-slate-400">{s.count} employee{s.count !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Total Site Cost</p>
                              <p className="font-bold text-slate-800">₹{fmt(s.totalCost)}</p>
                            </div>
                          </div>
                          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[11px] text-slate-400">Gross Wages</p>
                              <p className="font-semibold text-slate-700">₹{fmt(s.totalGross)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">Emp PF</p>
                              <p className="font-semibold text-red-600">₹{fmt(s.totalEmpPF)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">Emp ESI</p>
                              <p className="font-semibold text-red-600">₹{fmt(s.totalEmpESI)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">Prof. Tax</p>
                              <p className="font-semibold text-red-600">₹{fmt(s.totalPT)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">Empl. EPF (12%)</p>
                              <p className="font-semibold text-slate-600">₹{fmt(s.totalEmplPF)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">Empl. ESI (3.25%)</p>
                              <p className="font-semibold text-slate-600">₹{fmt(s.totalEmplESI)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">EDLI (0.5%)</p>
                              <p className="font-semibold text-slate-600">₹{fmt(s.totalEdli)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-400">EPF Admin (0.5%)</p>
                              <p className="font-semibold text-slate-600">₹{fmt(s.totalEpfAdmin)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit payslip modal ───────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-1">
              Adjust Deductions
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {editModal.payslip.employee?.firstName} {editModal.payslip.employee?.lastName} ·
              Gross ₹{fmt(editModal.payslip.gross)}
            </p>

            <div className="space-y-4">
              {[
                { label: 'TDS (Income Tax)',     key: 'tds',     val: editModal.tds,     set: (v: string) => setEditModal({ ...editModal, tds: v })     },
                { label: 'Penalty Deduction',    key: 'penalty', val: editModal.penalty, set: (v: string) => setEditModal({ ...editModal, penalty: v }) },
                { label: 'Advance Recovery',     key: 'advance', val: editModal.advance, set: (v: string) => setEditModal({ ...editModal, advance: v }) },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="input flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
              <div className="flex justify-between text-slate-500">
                <span>EPF + ESI + PT</span>
                <span>₹{fmt(Number(editModal.payslip.empPF) + Number(editModal.payslip.empESI) + Number(editModal.payslip.pt))}</span>
              </div>
              <div className="flex justify-between text-slate-500 mt-1">
                <span>TDS + Penalty + Advance</span>
                <span>₹{fmt((parseFloat(editModal.tds) || 0) + (parseFloat(editModal.penalty) || 0) + (parseFloat(editModal.advance) || 0))}</span>
              </div>
              <div className="flex justify-between font-bold text-green-700 mt-2 pt-2 border-t border-slate-200">
                <span>Est. Net Pay</span>
                <span>₹{fmt(
                  Number(editModal.payslip.gross) -
                  Number(editModal.payslip.empPF) -
                  Number(editModal.payslip.empESI) -
                  Number(editModal.payslip.pt) -
                  (parseFloat(editModal.tds) || 0) -
                  (parseFloat(editModal.penalty) || 0) -
                  (parseFloat(editModal.advance) || 0)
                )}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditModal(null)} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={saveEdit} disabled={updateSlip.isPending} className="btn btn-primary btn-sm">
                {updateSlip.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
