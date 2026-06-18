'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import { useAttendanceLogs } from '@/hooks/useAttendanceLogs';
import {
  useMonthlyAttendance, useUpdateMonthlyAttendance, useRunAutoFill,
  useExportAttendanceExcel, useImportAttendanceExcel,
} from '@/hooks/useAttendance';
import { useSites } from '@/hooks/useSites';
import { usePermissions } from '@/hooks/usePermissions';
import type { DayStatus, MonthlyAttendance } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<DayStatus, string> = {
  PRESENT:  'bg-green-100 text-green-700',
  ABSENT:   'bg-red-100 text-red-700',
  HALF_DAY: 'bg-yellow-100 text-yellow-700',
  HOLIDAY:  'bg-blue-100 text-blue-700',
  WEEKEND:  'bg-slate-100 text-slate-500',
  LEAVE:    'bg-purple-100 text-purple-700',
};

function todayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return istNow.toISOString().split('T')[0];
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDuration(punchIn?: string | null, punchOut?: string | null) {
  if (!punchIn || !punchOut) return '—';
  const ms = new Date(punchOut).getTime() - new Date(punchIn).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return `${hrs}h ${min}m`;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Monthly edit modal ────────────────────────────────────────────────────────

interface EditModalProps {
  record: MonthlyAttendance;
  onClose: () => void;
}

function EditModal({ record, onClose }: EditModalProps) {
  const update = useUpdateMonthlyAttendance();
  const [present, setPresent] = useState(String(record.presentDays));
  const [lop,     setLop]     = useState(String(record.lopDays));
  const [ot,      setOt]      = useState(String(record.otHours));

  async function handleSave() {
    await update.mutateAsync({
      id: record.id,
      presentDays: parseFloat(present),
      lopDays:     parseFloat(lop),
      otHours:     parseFloat(ot),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-slate-800 text-base mb-1">Edit Attendance</h3>
        <p className="text-sm text-slate-500 mb-5">
          {record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : ''}
          {' · '}{MONTHS[record.month - 1]} {record.year}
        </p>

        {[
          { label: 'Present Days', value: present, set: setPresent, step: '0.5', max: '26' },
          { label: 'LOP Days',     value: lop,     set: setLop,     step: '0.5', max: '26' },
          { label: 'OT Hours',     value: ot,      set: setOt,      step: '0.5', max: '999' },
        ].map(({ label, value, set, step, max }) => (
          <div key={label} className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
            <input
              type="number" step={step} min="0" max={max}
              value={value}
              onChange={(e) => set(e.target.value)}
              className="input w-full"
            />
          </div>
        ))}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={update.isPending} className="btn btn-primary btn-sm">
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'daily' | 'monthly';

export default function AttendancePage() {
  const { data: sites = [] } = useSites();
  const { can } = usePermissions();

  const [tab, setTab]     = useState<Tab>('daily');
  const [date,   setDate]   = useState('');
  const [siteId, setSiteId] = useState('');

  // Monthly tab state
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [editRecord, setEditRecord] = useState<MonthlyAttendance | null>(null);
  const [autoFillMsg, setAutoFillMsg] = useState('');
  const [importResult, setImportResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const [isExporting, setIsExporting]   = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDate(todayIST()); }, []);

  // Daily
  const { data: logs = [], isLoading: logsLoading } = useAttendanceLogs({ date, siteId: siteId || undefined });

  // Monthly
  const { data: monthly = [], isLoading: monthlyLoading } = useMonthlyAttendance(month, year);
  const autoFill    = useRunAutoFill();
  const exportExcel = useExportAttendanceExcel();
  const importExcel = useImportAttendanceExcel();

  async function handleAutoFill() {
    setAutoFillMsg('');
    const res = await autoFill.mutateAsync({ month, year });
    setAutoFillMsg(`✓ Processed ${res.processed} employees for ${MONTHS[month - 1]} ${year}.`);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportExcel(month, year);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    const result = await importExcel.mutateAsync({ month, year, file });
    setImportResult(result);
    // Reset so the same file can be re-uploaded if needed
    e.target.value = '';
  }

  const present   = logs.filter((l) => l.status === 'PRESENT').length;
  const absent    = logs.filter((l) => l.status === 'ABSENT').length;
  const halfDay   = logs.filter((l) => l.status === 'HALF_DAY').length;

  return (
    <>
      <Header
        title="Attendance"
        subtitle="Daily log and monthly review"
        actions={
          <a href="/kiosk/setup" className="btn btn-outline btn-sm">⚙ Kiosk Setup</a>
        }
      />

      <main className="flex-1 p-6 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {([['daily', '📋 Daily Log'], ['monthly', '📊 Monthly Review']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Daily Log Tab ─────────────────────────────────────────────────── */}
        {tab === 'daily' && (
          <>
            <div className="card p-4 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</label>
                <input
                  type="date" value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input">
                  <option value="">All Sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Logs', value: logs.length, color: 'text-slate-700' },
                { label: 'Present',    value: present,     color: 'text-green-600' },
                { label: 'Half Day',   value: halfDay,     color: 'text-yellow-600' },
                { label: 'Absent',     value: absent,      color: 'text-red-600'   },
              ].map((s) => (
                <div key={s.label} className="card p-4 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700 text-sm">
                  Log —{' '}
                  {date
                    ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : ''}
                </h2>
                {logsLoading && (
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                )}
              </div>

              {logs.length === 0 && !logsLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-4xl mb-2">📋</p>
                  <p>No attendance records for this date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Punch In</th>
                        <th className="px-4 py-3 text-left font-semibold">Punch Out</th>
                        <th className="px-4 py-3 text-left font-semibold">Duration</th>
                        <th className="px-4 py-3 text-left font-semibold">Source</th>
                        <th className="px-4 py-3 text-left font-semibold">On-Site</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">
                              {log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : '—'}
                            </div>
                            <div className="text-xs text-slate-400">{log.employee?.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[log.status]}`}>
                              {log.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">{fmtTime(log.punchIn)}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono">{fmtTime(log.punchOut)}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDuration(log.punchIn, log.punchOut)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              log.source === 'KIOSK'  ? 'bg-indigo-100 text-indigo-700' :
                              log.source === 'MANUAL' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {log.source}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {log.onSite
                              ? <span className="text-green-600 text-xs font-medium">✓ On-site</span>
                              : <span className="text-amber-600 text-xs font-medium">⚡ Remote</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Monthly Review Tab ────────────────────────────────────────────── */}
        {tab === 'monthly' && (
          <>
            {/* Controls */}
            <div className="card p-4 flex flex-wrap gap-4 items-end justify-between">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input">
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input">
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2 flex-wrap justify-end">
                  {can('attendance', 'create') && (
                    <button
                      onClick={handleAutoFill}
                      disabled={autoFill.isPending}
                      className="btn btn-primary btn-sm"
                    >
                      {autoFill.isPending ? '⏳ Running…' : '⚡ Run Auto-fill'}
                    </button>
                  )}
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="btn btn-outline btn-sm"
                    title="Download attendance as Excel"
                  >
                    {isExporting ? '⏳ Exporting…' : '⬇ Export Excel'}
                  </button>
                  {can('attendance', 'update') && (
                    <button
                      type="button"
                      onClick={() => importFileRef.current?.click()}
                      disabled={importExcel.isPending}
                      className="btn btn-outline btn-sm"
                      title="Upload edited Excel to update attendance"
                    >
                      {importExcel.isPending ? '⏳ Importing…' : '⬆ Import Excel'}
                    </button>
                  )}
                  {/* Hidden file input */}
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </div>
                {autoFillMsg && (
                  <p className="text-xs text-green-600 font-medium">{autoFillMsg}</p>
                )}
                {autoFill.isError && (
                  <p className="text-xs text-red-500">Auto-fill failed. Check logs.</p>
                )}
                {importResult && (
                  <div className="text-xs text-right">
                    <p className="text-green-600 font-medium">
                      ✓ Import complete — {importResult.updated} updated, {importResult.skipped} skipped
                    </p>
                    {importResult.errors.length > 0 && (
                      <details className="text-amber-600 mt-1 cursor-pointer">
                        <summary className="font-medium">{importResult.errors.length} warning(s)</summary>
                        <ul className="mt-1 list-disc list-inside text-left max-w-xs">
                          {importResult.errors.slice(0, 10).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li>…and {importResult.errors.length - 10} more</li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700 text-sm">
                  {MONTHS[month - 1]} {year} — {monthly.length} employees
                </h2>
                {monthlyLoading && (
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                )}
              </div>

              {monthly.length === 0 && !monthlyLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="mb-1">No attendance records for this period.</p>
                  <p className="text-xs">Run Auto-fill to generate monthly data from kiosk logs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Shift</th>
                        <th className="px-4 py-3 text-center font-semibold">Working Days</th>
                        <th className="px-4 py-3 text-center font-semibold">Present</th>
                        <th className="px-4 py-3 text-center font-semibold">LOP</th>
                        <th className="px-4 py-3 text-center font-semibold">OT Hrs</th>
                        {can('attendance', 'update') && (
                          <th className="px-4 py-3 text-center font-semibold">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthly.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">
                              {rec.employee
                                ? `${rec.employee.firstName} ${rec.employee.lastName}`
                                : '—'}
                            </div>
                            <div className="text-xs text-slate-400">{rec.employee?.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {rec.employee?.shift
                              ? `${rec.employee.shift.name} (${rec.employee.shift.shiftHours}h)`
                              : <span className="text-amber-500">No shift</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{rec.workingDays}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              rec.presentDays >= 24 ? 'text-green-600' :
                              rec.presentDays >= 20 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {rec.presentDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              Number(rec.lopDays) > 0 ? 'text-red-600' : 'text-slate-400'
                            }`}>
                              {rec.lopDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {Number(rec.otHours) > 0
                              ? <span className="text-indigo-600 font-medium">{Number(rec.otHours).toFixed(1)}</span>
                              : '—'}
                          </td>
                          {can('attendance', 'update') && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setEditRecord(rec)}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {editRecord && (
        <EditModal record={editRecord} onClose={() => setEditRecord(null)} />
      )}
    </>
  );
}
