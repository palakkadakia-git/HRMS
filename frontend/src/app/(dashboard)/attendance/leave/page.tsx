'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  useAllLeaveBalances, useAllocateLeaves, useAccruePL,
  useLeaveRecords, useCreateLeaveRecord, useDeleteLeaveRecord,
} from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { usePermissions } from '@/hooks/usePermissions';
import type { LeaveType, EmployeeLeaveBalance } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const LEAVE_TYPES: { value: LeaveType; label: string; badge: string }[] = [
  { value: 'PL',  label: 'Privilege Leave',   badge: 'bg-purple-100 text-purple-700' },
  { value: 'CL',  label: 'Casual Leave',      badge: 'bg-blue-100 text-blue-700'     },
  { value: 'SL',  label: 'Sick Leave',        badge: 'bg-orange-100 text-orange-700' },
  { value: 'LWP', label: 'Leave Without Pay', badge: 'bg-red-100 text-red-700'       },
];

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Balance card ──────────────────────────────────────────────────────────────

function BalanceBar({ label, available, allocated, badge }: {
  label: string; available: number; allocated: number; badge: string;
}) {
  const used = allocated - available;
  const pct  = allocated > 0 ? Math.min(100, (available / allocated) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${badge}`}>{label}</span>
        <span className="text-slate-500">{available} / {allocated}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">{used} used</p>
    </div>
  );
}

// ── Leave record modal ────────────────────────────────────────────────────────

interface AddLeaveModalProps {
  employeeId: string;
  onClose: () => void;
}

function AddLeaveModal({ employeeId, onClose }: AddLeaveModalProps) {
  const createLeave = useCreateLeaveRecord();
  const [form, setForm] = useState({
    date: '', leaveType: 'CL' as LeaveType, days: '1', remarks: '',
  });
  const [err, setErr] = useState('');

  async function handleSubmit() {
    setErr('');
    if (!form.date) { setErr('Date is required.'); return; }
    const days = parseFloat(form.days);
    if (!days || days < 0.5 || days > 1) { setErr('Days must be 0.5 or 1.'); return; }
    try {
      await createLeave.mutateAsync({
        employeeId,
        date:      form.date,
        leaveType: form.leaveType,
        days,
        remarks:   form.remarks || undefined,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Something went wrong.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-slate-800 text-base mb-5">Add Leave Record</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Leave Type</label>
            <select value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
              className="input w-full">
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Days</label>
            <select value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              className="input w-full">
              <option value="1">1 — Full Day</option>
              <option value="0.5">0.5 — Half Day</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Remarks (optional)</label>
            <input type="text" placeholder="Reason…" value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="input w-full" />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={createLeave.isPending} className="btn btn-primary btn-sm">
            {createLeave.isPending ? 'Saving…' : 'Add Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ViewTab = 'balances' | 'records';

export default function LeavePage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab,   setTab]   = useState<ViewTab>('balances');

  // selected employee for leave records view
  const [selectedEmp, setSelectedEmp] = useState('');
  const [showAddLeave, setShowAddLeave] = useState(false);

  const { data: empRows = [],  isLoading: balLoading   } = useAllLeaveBalances(year);
  const { data: records = [],  isLoading: recLoading   } = useLeaveRecords({
    employeeId: selectedEmp, month, year,
  });

  const { data: empList } = useEmployees({ status: 'ACTIVE', limit: 500 });
  const employees = empList?.data ?? [];

  const allocate  = useAllocateLeaves();
  const accruePL  = useAccruePL();
  const deleteRec = useDeleteLeaveRecord();
  const { can }   = usePermissions();

  const [actionMsg, setActionMsg] = useState('');

  async function handleAllocate() {
    setActionMsg('');
    const res = await allocate.mutateAsync(year);
    setActionMsg(`✓ Allocated CL/SL for ${res.allocated} STAFF employees for ${year}.`);
  }

  async function handleAccrue() {
    setActionMsg('');
    const res = await accruePL.mutateAsync({ month, year });
    setActionMsg(`✓ Accrued 1.25 PL for ${res.accrued} employees (${MONTHS[month - 1]} ${year}).`);
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm('Delete this leave record?')) return;
    await deleteRec.mutateAsync(id);
  }

  return (
    <>
      <Header
        title="Leave Management"
        subtitle="Leave balances, records, and allocations"
      />

      <main className="flex-1 p-6 space-y-5">

        {/* Admin actions */}
        <div className="card p-4 flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-28">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input w-36">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-2">
              {can('leave', 'create') && (
                <button onClick={handleAllocate} disabled={allocate.isPending} className="btn btn-outline btn-sm">
                  {allocate.isPending ? 'Allocating…' : `📋 Allocate CL/SL for ${year}`}
                </button>
              )}
              {can('leave', 'create') && (
                <button onClick={handleAccrue} disabled={accruePL.isPending} className="btn btn-outline btn-sm">
                  {accruePL.isPending ? 'Accruing…' : `➕ Accrue PL — ${MONTHS[month - 1]}`}
                </button>
              )}
            </div>
            {actionMsg && <p className="text-xs text-green-600 font-medium">{actionMsg}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {([['balances', '📊 Leave Balances'], ['records', '📋 Leave Records']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Balances Tab ───────────────────────────────────────────────────── */}
        {tab === 'balances' && (
          <div className="card overflow-hidden">
            {balLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                Loading balances…
              </div>
            ) : empRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-4xl mb-2">🌿</p>
                <p>No leave balances found for {year}.</p>
                <p className="text-xs mt-1">Run "Allocate CL/SL" to initialise balances.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">Employee</th>
                    <th className="px-4 py-3 text-center font-semibold">PL Accrued</th>
                    <th className="px-4 py-3 text-center font-semibold">PL Available</th>
                    <th className="px-4 py-3 text-center font-semibold">CL Available</th>
                    <th className="px-4 py-3 text-center font-semibold">SL Available</th>
                    <th className="px-4 py-3 text-center font-semibold">LWP Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empRows.map(({ employee, balance }) => (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{employee.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{balance.plAccrued}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${balance.plAvailable > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                          {balance.plAvailable}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${balance.clAvailable > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {balance.clAvailable}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${balance.slAvailable > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                          {balance.slAvailable}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${balance.lwpDays > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {balance.lwpDays > 0 ? balance.lwpDays : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Records Tab ────────────────────────────────────────────────────── */}
        {tab === 'records' && (
          <div className="space-y-4">
            {/* Employee selector + add button */}
            <div className="card p-4 flex flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</label>
                <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} className="input">
                  <option value="">— Select Employee —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              {selectedEmp && can('leave', 'create') && (
                <button onClick={() => setShowAddLeave(true)} className="btn btn-primary btn-sm">
                  + Add Leave
                </button>
              )}
            </div>

            {/* Records table */}
            {selectedEmp && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-700 text-sm">
                    Leave Records — {MONTHS[month - 1]} {year}
                  </h2>
                </div>
                {recLoading ? (
                  <div className="py-12 text-center text-slate-400">Loading…</div>
                ) : records.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p>No leave records for this period.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-center font-semibold">Days</th>
                        <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                        {can('leave', 'delete') && (
                          <th className="px-4 py-3 text-center font-semibold">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => {
                        const typeInfo = LEAVE_TYPES.find((t) => t.value === r.leaveType)!;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-700">{fmtDate(r.date.split('T')[0])}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.badge}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">{r.days}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{r.remarks || '—'}</td>
                            {can('leave', 'delete') && (
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {showAddLeave && selectedEmp && (
        <AddLeaveModal employeeId={selectedEmp} onClose={() => setShowAddLeave(false)} />
      )}
    </>
  );
}
