'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { usePayrollRuns, usePayrollPayslips, usePayslip } from '@/hooks/usePayroll';
import { useCompanySettings } from '@/hooks/useSettings';
import type { Payslip, PayrollStatus } from '@/types';

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

// ── Payslip document component ────────────────────────────────────────────────

function PayslipDoc({ ps, companyName, logoUrl }: { ps: Payslip; companyName: string; logoUrl: string | null }) {
  const emp     = ps.employee!;
  const run     = ps.payrollRun!;
  const name    = `${emp.firstName} ${emp.lastName}`;
  const period  = `${MONTHS[run.month - 1]} ${run.year}`;

  const earnings = [
    { label: 'Basic',             val: ps.basic          },
    { label: 'HRA',               val: ps.hra            },
    { label: 'Medical Allowance', val: ps.medical        },
    { label: 'Conveyance',        val: ps.conveyance     },
    { label: 'Bonus',             val: ps.bonus          },
    { label: 'Leave Allowance',   val: ps.leaveAllowance },
    { label: 'Other Allowance',   val: ps.otherAllowance },
    { label: 'OT Pay',            val: ps.otPay          },
  ].filter((e) => Number(e.val) > 0);

  const deductions = [
    { label: 'EPF (Employee 12%)',  val: ps.empPF            },
    { label: 'ESI (Employee 0.75%)',val: ps.empESI           },
    { label: 'Professional Tax',    val: ps.pt               },
    { label: 'TDS',                 val: ps.tds              },
    { label: 'Penalty',             val: ps.penaltyDeduction },
    { label: 'Advance Recovery',    val: ps.advanceDeduction },
  ].filter((d) => Number(d.val) > 0);

  const employerCosts = [
    { label: 'Employer EPF (12%)',    val: ps.emplPF   },
    { label: 'Employer ESI (3.25%)',  val: ps.emplESI  },
    { label: 'EDLI (0.5%)',           val: ps.edli     },
    { label: 'EPF Admin (0.5%)',      val: ps.epfAdmin },
  ].filter((e) => Number(e.val) > 0);

  const maxRows = Math.max(earnings.length, deductions.length);

  return (
    <div className="payslip-doc bg-white border border-slate-200 rounded-xl p-8 max-w-3xl mx-auto text-sm print:border-0 print:rounded-none print:p-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company logo" className="h-12 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">PAYSLIP</h1>
            <p className="text-slate-500 text-sm">{period}</p>
          </div>
        </div>
        <div className="text-right text-slate-500 text-xs">
          <p className="font-semibold text-slate-700 text-sm">{companyName}</p>
          <p>Payroll processed</p>
          <p className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[run.status]}`}>
            {run.status}
          </p>
        </div>
      </div>

      {/* Employee details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-6 text-xs">
        {[
          ['Employee Code',  emp.employeeCode],
          ['Name',           name],
          ['Designation',    emp.designation ?? '—'],
          ['Site',           emp.site?.name ?? '—'],
          ['PAN',            emp.panNumber ?? '—'],
          ['UAN',            emp.uanNumber ?? '—'],
          ['EPF No.',        emp.epfNumber ?? '—'],
          ['ESI No.',        emp.esiNumber ?? '—'],
          ['Bank',           emp.bankName ?? '—'],
          ['Account No.',    emp.bankAccount ?? '—'],
          ['Working Days',   String(ps.workingDays)],
          ['Days Paid',      String(Number(ps.presentDays))],
          ['LOP Days',       String(Number(ps.lopDays))],
          ['OT Hours',       String(Number(ps.otHours))],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="text-slate-400 w-28 shrink-0">{label}</span>
            <span className="font-medium text-slate-700">{value}</span>
          </div>
        ))}
      </div>

      {/* Earnings / Deductions table */}
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-3 py-2 text-left font-semibold text-slate-600 w-1/2">Earnings</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount (₹)</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600 w-1/2">Deductions</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: maxRows }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 text-slate-700">{earnings[i]?.label ?? ''}</td>
              <td className="px-3 py-1.5 text-right text-slate-800">
                {earnings[i] ? fmt(earnings[i].val) : ''}
              </td>
              <td className="px-3 py-1.5 text-slate-700">{deductions[i]?.label ?? ''}</td>
              <td className="px-3 py-1.5 text-right text-slate-800">
                {deductions[i] ? fmt(deductions[i].val) : ''}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="px-3 py-2 text-slate-700">Gross Earnings</td>
            <td className="px-3 py-2 text-right text-slate-800">₹ {fmt(ps.gross)}</td>
            <td className="px-3 py-2 text-slate-700">Total Deductions</td>
            <td className="px-3 py-2 text-right text-slate-800">₹ {fmt(ps.totalDed)}</td>
          </tr>
        </tbody>
      </table>

      {/* Net pay */}
      <div className="flex items-center justify-between bg-indigo-600 text-white rounded-lg px-5 py-3 mb-4">
        <span className="font-semibold">Net Pay</span>
        <span className="text-xl font-bold">₹ {fmt(ps.net)}</span>
      </div>

      {/* Employer contributions (informational) */}
      {employerCosts.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Employer Contributions (not deducted from salary)
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            {employerCosts.map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-700">₹ {fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        This is a computer-generated payslip and does not require a signature.
      </p>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PayslipsPage() {
  const [activeRunId,   setActiveRunId]   = useState<string | null>(null);
  const [activeSlipId,  setActiveSlipId]  = useState<string | null>(null);

  const { data: runs     = [], isLoading: runsLoading  } = usePayrollRuns();
  const { data: payslips = [], isLoading: slipsLoading } = usePayrollPayslips(activeRunId ?? '');
  const { data: slip,          isLoading: slipLoading  } = usePayslip(activeSlipId ?? '');
  const { data: settings } = useCompanySettings();

  const companyName = settings?.companyName ?? 'Your Company';
  const apiBase     = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
  const logoUrl     = settings?.logoPath ? `${apiBase}/${settings.logoPath}` : null;

  const activeRun = runs.find((r) => r.id === activeRunId);

  return (
    <>
      <Header title="Payslips" subtitle="View and print individual employee payslips" />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar: run → employee selection ──────────────────── */}
          <div className="lg:col-span-1 space-y-4 print:hidden">

            {/* Run picker */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payroll Runs</p>
              </div>
              {runsLoading ? (
                <div className="py-6 text-center text-slate-400 text-sm">Loading…</div>
              ) : runs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-sm">No runs yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {runs.map((run) => (
                    <li
                      key={run.id}
                      onClick={() => { setActiveRunId(run.id); setActiveSlipId(null); }}
                      className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-sm ${activeRunId === run.id ? 'bg-indigo-50' : ''}`}
                    >
                      <span className="font-medium text-slate-700">
                        {MONTHS[run.month - 1]} {run.year}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[run.status]}`}>
                        {run.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Employee picker */}
            {activeRunId && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {MONTHS[(activeRun?.month ?? 1) - 1]} {activeRun?.year} — Employees
                  </p>
                </div>
                {slipsLoading ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Loading…</div>
                ) : payslips.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-sm">No payslips.</div>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {payslips.map((ps) => {
                      const emp = ps.employee;
                      return (
                        <li
                          key={ps.id}
                          onClick={() => setActiveSlipId(ps.id)}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 text-sm ${activeSlipId === ps.id ? 'bg-indigo-50' : ''}`}
                        >
                          <p className="font-medium text-slate-800">
                            {emp ? `${emp.firstName} ${emp.lastName}` : '—'}
                          </p>
                          <p className="text-xs text-slate-400">{emp?.employeeCode} · ₹{fmt(ps.net)}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Main: payslip document ──────────────────────────────── */}
          <div className="lg:col-span-3">
            {!activeSlipId ? (
              <div className="card py-20 text-center text-slate-400">
                <p className="text-4xl mb-2">📄</p>
                <p>Select a run and employee to view the payslip.</p>
              </div>
            ) : slipLoading ? (
              <div className="card py-20 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                Loading…
              </div>
            ) : slip ? (
              <>
                <div className="flex justify-end mb-4 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="btn btn-outline btn-sm"
                  >
                    🖨️ Print / Save PDF
                  </button>
                </div>
                <PayslipDoc ps={slip} companyName={companyName} logoUrl={logoUrl} />
              </>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
