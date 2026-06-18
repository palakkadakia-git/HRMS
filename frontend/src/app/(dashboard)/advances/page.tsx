'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useAdvances, useCreateAdvance, useBulkWeeklyAdvance, useDeleteAdvance } from '@/hooks/useAdvances';
import { useEmployees } from '@/hooks/useEmployees';
import { useSites } from '@/hooks/useSites';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdvanceType, AdvanceStatus, Employee, EmployeeAdvance } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(val: number) {
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`;
}

function lastSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // go back to Sunday
  return d.toISOString().slice(0, 10);
}

const TYPE_BADGE: Record<AdvanceType, string> = {
  ADHOC:  'bg-purple-100 text-purple-700',
  WEEKLY: 'bg-blue-100   text-blue-700',
};

const STATUS_BADGE: Record<AdvanceStatus, string> = {
  ACTIVE:      'bg-amber-100  text-amber-700',
  RECOVERED:   'bg-green-100  text-green-700',
  WRITTEN_OFF: 'bg-slate-100  text-slate-500',
};

// ── Adhoc Advance Modal ───────────────────────────────────────────────────────

function AdhocModal({
  employees,
  onClose,
}: {
  employees: Employee[];
  onClose: () => void;
}) {
  const create = useCreateAdvance();
  const [form, setForm] = useState({
    employeeId:        '',
    amount:            '',
    disbursedOn:       new Date().toISOString().slice(0, 10),
    installmentAmount: '',
    reason:            '',
    approvedBy:        '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      employeeId:        form.employeeId,
      type:              'ADHOC',
      amount:            parseFloat(form.amount),
      disbursedOn:       form.disbursedOn,
      installmentAmount: parseFloat(form.installmentAmount),
      reason:            form.reason || undefined,
      approvedBy:        form.approvedBy || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Issue Adhoc Advance</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min={1} value={form.amount}
                onChange={e => set('amount', e.target.value)} required />
            </div>
            <div>
              <label className="label">Installment / Month (₹)</label>
              <input className="input" type="number" min={1} value={form.installmentAmount}
                onChange={e => set('installmentAmount', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Disbursed On</label>
            <input className="input" type="date" value={form.disbursedOn}
              onChange={e => set('disbursedOn', e.target.value)} required />
          </div>
          <div>
            <label className="label">Approved By</label>
            <input className="input" type="text" placeholder="Name of approver"
              value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} />
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={2} placeholder="Emergency / occasion…"
              value={form.reason} onChange={e => set('reason', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Issue Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Weekly Advance Modal ──────────────────────────────────────────────────────

function WeeklyModal({
  employees,
  onClose,
}: {
  employees: Employee[];
  onClose: () => void;
}) {
  const { data: sites = [] } = useSites();
  const bulk = useBulkWeeklyAdvance();

  const [disbursedOn, setDisbursedOn]   = useState(lastSunday());
  const [amount, setAmount]              = useState('1000');
  const [approvedBy, setApprovedBy]     = useState('');
  const [reason, setReason]             = useState('Weekly advance');
  const [siteId, setSiteId]             = useState('');
  const [scope, setScope]               = useState<'all' | 'new' | 'select'>('all');
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  // Filter employees by site
  const siteEmployees = useMemo(() => {
    if (!siteId) return employees;
    return employees.filter(emp =>
      emp.siteAssignments?.some(sa => sa.siteId === siteId && sa.isPrimary),
    );
  }, [employees, siteId]);

  // New joiners = joined in the current calendar month
  const newJoiners = useMemo(() => {
    const now = new Date();
    return siteEmployees.filter(emp => {
      const joined = new Date(emp.dateOfJoining);
      return joined.getFullYear() === now.getFullYear() &&
             joined.getMonth()    === now.getMonth();
    });
  }, [siteEmployees]);

  const targetEmployees = scope === 'all'    ? siteEmployees
                        : scope === 'new'    ? newJoiners
                        : siteEmployees.filter(e => selected.has(e.id));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === siteEmployees.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(siteEmployees.map(e => e.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetEmployees.length) return;
    await bulk.mutateAsync({
      employeeIds: targetEmployees.map(e => e.id),
      disbursedOn,
      amount: parseFloat(amount),
      reason: reason || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-slate-800">Issue Weekly Advances</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Date + amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sunday Date</label>
                <input className="input" type="date" value={disbursedOn}
                  onChange={e => setDisbursedOn(e.target.value)} required />
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
            </div>

            {/* Site filter */}
            <div>
              <label className="label">Site</label>
              <select className="input" value={siteId} onChange={e => { setSiteId(e.target.value); setSelected(new Set()); }}>
                <option value="">All sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Scope */}
            <div>
              <label className="label">Scope</label>
              <div className="flex gap-2">
                {(['all', 'new', 'select'] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => { setScope(s); setSelected(new Set()); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      scope === s
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                    }`}
                  >
                    {s === 'all' ? 'All active' : s === 'new' ? 'New joiners' : 'Select'}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee checklist (select mode) */}
            {scope === 'select' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <input type="checkbox" checked={selected.size === siteEmployees.length && siteEmployees.length > 0}
                    onChange={toggleAll} />
                  <span className="text-xs text-slate-500">
                    {selected.size} / {siteEmployees.length} selected
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {siteEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} />
                      <span className="text-sm text-slate-700">
                        {emp.employeeCode} — {emp.firstName} {emp.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Preview count */}
            <p className="text-xs text-slate-500">
              Will issue ₹{amount || '0'} to <span className="font-semibold text-slate-700">{targetEmployees.length}</span> employee(s)
            </p>

            <div>
              <label className="label">Approved By</label>
              <input className="input" type="text" placeholder="Name of approver"
                value={approvedBy} onChange={e => setApprovedBy(e.target.value)} />
            </div>

            <div>
              <label className="label">Reason</label>
              <input className="input" type="text" value={reason}
                onChange={e => setReason(e.target.value)} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1"
              disabled={bulk.isPending || targetEmployees.length === 0}>
              {bulk.isPending ? 'Issuing…' : `Issue to ${targetEmployees.length} Employee(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdvancesPage() {
  const { can } = usePermissions();

  const [typeFilter,   setTypeFilter]   = useState<AdvanceType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AdvanceStatus | ''>('ACTIVE');
  const [siteFilter,   setSiteFilter]   = useState('');
  const [showAdhoc,    setShowAdhoc]    = useState(false);
  const [showWeekly,   setShowWeekly]   = useState(false);

  const { data: advances = [], isLoading } = useAdvances({
    type:   typeFilter   || undefined,
    status: statusFilter || undefined,
    siteId: siteFilter   || undefined,
  });

  const { data: allPage } = useEmployees({ limit: 100 });
  const employees = (allPage?.data ?? []).filter(e => e.status !== 'INACTIVE');

  const { data: sites = [] } = useSites();
  const deleteAdvance = useDeleteAdvance();

  return (
    <>
      <Header
        title="Advances"
        subtitle="Manage adhoc and weekly employee advances"
        actions={
          can('advances', 'create') ? (
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => setShowWeekly(true)}>
                + Weekly Advance
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdhoc(true)}>
                + Adhoc Advance
              </button>
            </div>
          ) : undefined
        }
      />

      <main className="flex-1 p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select className="input w-36 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value as AdvanceType | '')}>
            <option value="">All types</option>
            <option value="ADHOC">Adhoc</option>
            <option value="WEEKLY">Weekly</option>
          </select>

          <select className="input w-36 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as AdvanceStatus | '')}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RECOVERED">Recovered</option>
            <option value="WRITTEN_OFF">Written Off</option>
          </select>

          <select className="input w-44 text-sm" value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {(typeFilter || statusFilter || siteFilter) && (
            <button className="text-xs text-primary underline" onClick={() => { setTypeFilter(''); setStatusFilter(''); setSiteFilter(''); }}>
              Clear filters
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Disbursed On</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                {can('advances', 'delete') && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">No advances found.</td></tr>
              ) : advances.map((adv: EmployeeAdvance) => {
                const emp  = adv.employee;
                const site = emp?.siteAssignments?.[0]?.site?.name ?? '—';
                return (
                  <tr key={adv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {emp?.firstName} {emp?.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{site}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[adv.type]}`}>
                        {adv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(adv.disbursedOn)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{fmt(adv.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={Number(adv.balanceAmount) === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}>
                        {fmt(adv.balanceAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{adv.approvedBy ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[adv.status]}`}>
                        {adv.status}
                      </span>
                    </td>
                    {can('advances', 'delete') && (
                      <td className="px-4 py-3 text-right">
                        {adv.status === 'ACTIVE' && (adv.recoveries?.length ?? 0) === 0 && (
                          <button
                            onClick={() => { if (confirm('Delete this advance?')) deleteAdvance.mutate(adv.id); }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {showAdhoc  && <AdhocModal  employees={employees} onClose={() => setShowAdhoc(false)}  />}
      {showWeekly && <WeeklyModal employees={employees} onClose={() => setShowWeekly(false)} />}
    </>
  );
}
