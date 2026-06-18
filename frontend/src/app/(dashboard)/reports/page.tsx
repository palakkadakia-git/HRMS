'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PayrollRun } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(run: PayrollRun) {
  return `${MONTHS[run.month] ?? run.month} ${run.year}`;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-amber-100  text-amber-700',
  PROCESSED: 'bg-blue-100   text-blue-700',
  APPROVED:  'bg-purple-100 text-purple-700',
  PAID:      'bg-green-100  text-green-700',
};

// ── Download helper ───────────────────────────────────────────────────────────

async function downloadReport(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Report card definitions ───────────────────────────────────────────────────

interface ReportDef {
  id:       string;
  icon:     string;
  title:    string;
  desc:     string;
  endpoint: string;
  filename: (run: PayrollRun) => string;
}

const REPORTS: ReportDef[] = [
  {
    id:       'salary-register',
    icon:     '📋',
    title:    'Salary Register',
    desc:     'Full earnings & deductions breakdown for every employee — the master payroll document.',
    endpoint: 'salary-register',
    filename: r => `Salary-Register-${MONTHS[r.month]}-${r.year}.xlsx`,
  },
  {
    id:       'bank-statement',
    icon:     '🏦',
    title:    'Bank Transfer Statement',
    desc:     'Employee bank accounts and net pay amounts ready for NEFT / RTGS processing.',
    endpoint: 'bank-statement',
    filename: r => `Bank-Transfer-${MONTHS[r.month]}-${r.year}.xlsx`,
  },
  {
    id:       'pf-statement',
    icon:     '🏛️',
    title:    'PF Contribution Statement',
    desc:     'EPF & EPS contributions (employee + employer) including EDLI and admin charges.',
    endpoint: 'pf-statement',
    filename: r => `PF-Statement-${MONTHS[r.month]}-${r.year}.xlsx`,
  },
  {
    id:       'esi-statement',
    icon:     '🩺',
    title:    'ESI Contribution Statement',
    desc:     'ESI contributions (employee 0.75% + employer 3.25%) for all ESI-applicable employees.',
    endpoint: 'esi-statement',
    filename: r => `ESI-Statement-${MONTHS[r.month]}-${r.year}.xlsx`,
  },
];

// ── Run selector ──────────────────────────────────────────────────────────────

function RunSelector({
  runs,
  selected,
  onSelect,
}: {
  runs: PayrollRun[];
  selected: PayrollRun | null;
  onSelect: (r: PayrollRun) => void;
}) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm border border-dashed rounded-xl">
        No payroll runs yet. Run payroll first from the Payroll module.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {runs.map(r => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all ${
            selected?.id === r.id
              ? 'bg-primary text-white'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="font-medium">{monthLabel(r)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            selected?.id === r.id
              ? 'bg-white/20 text-white'
              : STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'
          }`}>
            {r.status}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ def, run }: { def: ReportDef; run: PayrollRun }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadReport(
        `/reports/runs/${run.id}/${def.endpoint}`,
        def.filename(run),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800">{def.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{def.desc}</p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="btn btn-primary btn-sm self-start"
      >
        {loading ? '⏳ Generating…' : '⬇ Download Excel'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: runs = [], isLoading } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data } = await api.get('/payroll/runs');
      return data;
    },
  });

  const [selected, setSelected] = useState<PayrollRun | null>(null);

  // Auto-select the most recent run once loaded
  if (!selected && runs.length > 0) {
    setSelected(runs[0]);
  }

  return (
    <>
      <Header
        title="Reports"
        subtitle="Download compliance & payroll reports as Excel"
      />

      <main className="flex-1 p-6">
        <div className="flex gap-6 items-start">

          {/* Left panel — payroll run list */}
          <div className="w-64 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Payroll Run
            </p>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <RunSelector
                runs={runs}
                selected={selected}
                onSelect={setSelected}
              />
            )}
          </div>

          {/* Right panel — report cards */}
          <div className="flex-1">
            {!selected ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                Select a payroll run on the left to download reports.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {monthLabel(selected)}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selected._count?.payslips ?? '?'} employees ·{' '}
                      <span className={`font-medium ${STATUS_BADGE[selected.status]?.split(' ')[1] ?? ''}`}>
                        {selected.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {REPORTS.map(def => (
                    <ReportCard key={def.id} def={def} run={selected} />
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
