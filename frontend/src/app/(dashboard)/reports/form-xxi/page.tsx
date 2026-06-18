'use client';

import { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import { useSites } from '@/hooks/useSites';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormXXIRow {
  srNo:        number;
  empCode:     string;
  name:        string;
  designation: string;
  reason:      string;
  date:        string;
  wagePeriod:  string;
  wagesPayable: number | null;
  fineAmount:  number;
  dateRealised: string;
  witnessName: string;
}

interface FormXXIData {
  header: {
    companyName:    string;
    companyAddress: string;
    siteName:       string;
    siteAddress:    string;
  };
  month: number;
  year:  number;
  rows:  FormXXIRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function fmt(v: number | null) {
  if (v === null) return '—';
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Form XXI layout ───────────────────────────────────────────────────────────

function FormXXI({ data }: { data: FormXXIData }) {
  const { header, month, year, rows } = data;

  return (
    <div className="form-xxi-print bg-white text-black text-[11px] font-sans" style={{ minWidth: 1100 }}>

      {/* Title block */}
      <table className="w-full border-collapse border border-black" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td colSpan={13} className="border border-black text-center font-bold py-1 bg-yellow-300">
              FORM XXI
            </td>
          </tr>
          <tr>
            <td colSpan={13} className="border border-black text-center font-bold py-0.5 bg-yellow-300">
              REGISTER OF FINES
            </td>
          </tr>
          <tr>
            <td colSpan={13} className="border border-black text-center italic py-0.5 bg-yellow-300">
              [ Rule 78 (2)(d)]
            </td>
          </tr>

          {/* Company / Site header */}
          <tr>
            <td colSpan={6} className="border border-black px-2 py-1 bg-yellow-300 font-semibold text-[10px]">
              Name and Address of contractor :
            </td>
            <td colSpan={7} className="border border-black px-2 py-1 bg-yellow-300 font-semibold text-[10px]">
              Name and Address of Establishment in/establishment which contract is carried on
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black px-2 py-1 text-center font-medium">
              {header.companyName}
            </td>
            <td colSpan={7} className="border border-black px-2 py-1 text-center font-medium">
              {header.companyAddress || '—'}
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black px-2 py-1 bg-yellow-300 font-semibold text-[10px]">
              {'<Nature and location of work :>'}
            </td>
            <td colSpan={7} className="border border-black px-2 py-1 text-center font-medium">
              {header.siteName}{header.siteAddress ? `, ${header.siteAddress}` : ''}
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black px-2 py-1 text-center">
              Fabrication and Erection
            </td>
            <td colSpan={7} className="border border-black px-2 py-1 bg-green-600" />
          </tr>

          {/* Column headers */}
          <tr className="bg-yellow-300 font-bold text-center align-middle">
            <td className="border border-black px-1 py-2 w-10">Sr. No.</td>
            <td className="border border-black px-1 py-2 w-16">Emp Code</td>
            <td className="border border-black px-1 py-2 w-28">Name of workman</td>
            <td className="border border-black px-1 py-2 w-28">Designation/ Nature of employment</td>
            <td className="border border-black px-1 py-2 w-32">Act/Omission for which fine imposed</td>
            <td className="border border-black px-1 py-2 w-20">Date of offence</td>
            <td className="border border-black px-1 py-2 w-24">Whether workman showed cause against fine</td>
            <td className="border border-black px-1 py-2 w-32">Name of person in whose presence employee's explanation was heard</td>
            <td className="border border-black px-1 py-2 w-20">Wage periods</td>
            <td className="border border-black px-1 py-2 w-24">wages payable</td>
            <td className="border border-black px-1 py-2 w-20">Amount of fine imposed</td>
            <td className="border border-black px-1 py-2 w-24">Date on which fine realised</td>
            <td className="border border-black px-1 py-2 w-20">Remarks</td>
          </tr>

          {/* Column numbers */}
          <tr className="bg-yellow-300 text-center font-bold">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => (
              <td key={n} className="border border-black px-1 py-1">{n}</td>
            ))}
          </tr>

          {/* Data rows */}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={13} className="border border-black text-center py-6 text-gray-500">
                No penalties found for this site and month.
              </td>
            </tr>
          ) : rows.map(row => (
            <tr key={row.srNo} className="text-center align-top">
              <td className="border border-black px-1 py-1">{row.srNo}</td>
              <td className="border border-black px-1 py-1">{row.empCode}</td>
              <td className="border border-black px-1 py-1 text-left">{row.name}</td>
              <td className="border border-black px-1 py-1 text-left">{row.designation || '—'}</td>
              <td className="border border-black px-1 py-1 text-left">{row.reason}</td>
              <td className="border border-black px-1 py-1">{fmtDate(row.date)}</td>
              <td className="border border-black px-1 py-1">Yes</td>
              <td className="border border-black px-1 py-1 text-left">{row.witnessName}</td>
              <td className="border border-black px-1 py-1">{row.wagePeriod}</td>
              <td className="border border-black px-1 py-1 text-right">{fmt(row.wagesPayable)}</td>
              <td className="border border-black px-1 py-1 text-right">{fmt(row.fineAmount)}</td>
              <td className="border border-black px-1 py-1">{fmtDate(row.dateRealised)}</td>
              <td className="border border-black px-1 py-1" />
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[10px] text-gray-500 mt-2 print:hidden">
        For {MONTHS[month]} {year}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FormXXIPage() {
  const { data: sites = [] } = useSites();
  const now = new Date();

  const [siteId,  setSiteId]  = useState('');
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [enabled, setEnabled] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const { data, isLoading, isError, error } = useQuery<FormXXIData>({
    queryKey: ['form-xxi', siteId, month, year],
    queryFn:  async () => {
      const { data } = await api.get('/reports/form-xxi', { params: { siteId, month, year } });
      return data;
    },
    enabled,
    retry: false,
  });

  function handleGenerate() {
    if (!siteId) return;
    setEnabled(true);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .form-xxi-print { font-size: 9px; }
        }
      `}</style>

      <div className="no-print">
        <Header
          title="Form XXI — Register of Fines"
          subtitle="Statutory register of penalties per site per month"
          actions={
            data ? (
              <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                🖨 Print
              </button>
            ) : undefined
          }
        />
      </div>

      <main className="flex-1 p-6">
        {/* Filter bar */}
        <div className="no-print flex flex-wrap gap-3 mb-6 items-end">
          <div>
            <label className="label">Site</label>
            <select className="input w-52" value={siteId} onChange={e => { setSiteId(e.target.value); setEnabled(false); }}>
              <option value="">Select site…</option>
              {sites.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Month</label>
            <select className="input w-32" value={month} onChange={e => { setMonth(Number(e.target.value)); setEnabled(false); }}>
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Year</label>
            <select className="input w-24" value={year} onChange={e => { setYear(Number(e.target.value)); setEnabled(false); }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!siteId || isLoading}
          >
            {isLoading ? 'Loading…' : 'Generate'}
          </button>
        </div>

        {/* Report */}
        {!enabled && (
          <div className="text-center py-20 text-slate-400 text-sm border border-dashed rounded-xl">
            Select a site and month, then click Generate.
          </div>
        )}

        {isError && (
          <div className="text-center py-10 text-red-500 text-sm">
            {(error as any)?.response?.data?.message ?? 'Failed to load report. Ensure payroll has been run for this month.'}
          </div>
        )}

        {data && <FormXXI data={data} />}
      </main>
    </>
  );
}
