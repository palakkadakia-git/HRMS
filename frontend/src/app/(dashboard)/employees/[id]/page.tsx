'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import Header from '@/components/layout/Header';
import DependentsPanel from '@/components/employees/DependentsPanel';
import SalaryRevisionPanel from '@/components/employees/SalaryRevisionPanel';
import FaceCaptureModal from '@/components/employees/FaceCaptureModal';
import { useEmployee } from '@/hooks/useEmployees';
import { BLOOD_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS, type EmpStatus } from '@/types';

const STATUS_STYLE: Record<EmpStatus, string> = {
  ACTIVE: 'badge-green', PROBATION: 'badge-yellow', NOTICE_PERIOD: 'badge-red', INACTIVE: 'badge-gray',
};

const fmt     = (v?: string | null) => v || '—';
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">{children}</div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: emp, isLoading, error, refetch } = useEmployee(id);
  const [showBiometric, setShowBiometric] = useState(false);

  if (isLoading) {
    return (
      <>
        <Header title="Employee Details" />
        <main className="flex-1 p-6 flex items-center justify-center text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mr-3" />
          Loading…
        </main>
      </>
    );
  }

  if (error || !emp) {
    return (
      <>
        <Header title="Employee Not Found" />
        <main className="flex-1 p-6">
          <div className="text-center py-20">
            <p className="text-slate-500">Employee not found or has been deleted.</p>
            <Link href="/employees" className="btn btn-primary mt-4">← Back to List</Link>
          </div>
        </main>
      </>
    );
  }

  const bloodLabel  = BLOOD_OPTIONS.find(o => o.value === emp.bloodGroup)?.label ?? '—';
  const typeLabel   = TYPE_OPTIONS.find(o => o.value === emp.type)?.label ?? emp.type;
  const statusLabel = STATUS_OPTIONS.find(o => o.value === emp.status)?.label ?? emp.status;

  return (
    <>
      <Header
        title={`${emp.firstName} ${emp.lastName}`}
        subtitle={emp.employeeCode}
        actions={
          <div className="flex gap-2">
            <Link href="/employees" className="btn btn-outline btn-sm">← Back</Link>
            <Link href={`/employees/${emp.id}/edit`} className="btn btn-primary btn-sm">✏️ Edit</Link>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-5">

        {/* Profile header */}
        <div className="card p-6 flex items-start gap-6">
          {emp.photoPath ? (
            <img src={emp.photoPath} alt={emp.firstName} className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-bold uppercase">
              {emp.firstName[0]}{emp.lastName[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-slate-800">{emp.firstName} {emp.lastName}</h2>
              <span className={clsx('badge', STATUS_STYLE[emp.status])}>{statusLabel}</span>
              {emp.isBlacklisted && <span className="badge badge-red">⚠ Blacklisted</span>}
            </div>
            <p className="text-slate-500 text-sm">{fmt(emp.designation)} · {typeLabel}</p>
            {emp.siteAssignments && emp.siteAssignments.length > 0 && (
              <p className="text-slate-400 text-xs mt-0.5">
                🏢 {emp.siteAssignments.map(a => a.site?.name ?? a.siteId).join(', ')}
              </p>
            )}
            <p className="text-slate-400 text-xs mt-1">
              Joined {fmtDate(emp.dateOfJoining)}
              {emp.dateOfExit && ` · Exited ${fmtDate(emp.dateOfExit)}`}
            </p>
          </div>
        </div>

        {/* Personal */}
        <Section title="Personal Information">
          <InfoRow label="Sex"           value={emp.sex} />
          <InfoRow label="Date of Birth" value={fmtDate(emp.dateOfBirth)} />
          <InfoRow label="Blood Group"   value={bloodLabel} />
          <InfoRow label="Father's Name" value={fmt(emp.fathersName)} />
        </Section>

        {/* Address */}
        <Section title="Address">
          <InfoRow label="Address Line 1" value={fmt(emp.addressLine1)} />
          <InfoRow label="Address Line 2" value={fmt(emp.addressLine2)} />
          <InfoRow label="Area"     value={fmt(emp.area)} />
          <InfoRow label="City"     value={fmt(emp.city)} />
          <InfoRow label="State"    value={fmt(emp.stateName)} />
          <InfoRow label="Country"  value={fmt(emp.country)} />
          <InfoRow label="Pin Code" value={fmt(emp.pincode)} />
        </Section>

        {/* Employment */}
        <Section title="Employment">
          <InfoRow label="Employee Type" value={typeLabel} />
          <InfoRow label="Designation"   value={fmt(emp.designation)} />
          <InfoRow label="Work Sites"    value={emp.siteAssignments && emp.siteAssignments.length > 0
            ? emp.siteAssignments.map(a => `${a.site?.name ?? a.siteId}${a.isPrimary ? ' ★' : ''}`).join(', ')
            : '—'} />
          <InfoRow label="Date of Joining" value={fmtDate(emp.dateOfJoining)} />
          {emp.dateOfExit && <InfoRow label="Date of Exit" value={fmtDate(emp.dateOfExit)} />}
        </Section>

        {/* Statutory */}
        <Section title="Statutory Details">
          <InfoRow label="Aadhaar No." value={fmt(emp.aadhaarNumber)} />
          <InfoRow label="PAN"         value={fmt(emp.panNumber)} />
          <InfoRow label="EPF No."     value={fmt(emp.epfNumber)} />
          <InfoRow label="UAN"         value={fmt(emp.uanNumber)} />
          <InfoRow label="ESI No."     value={fmt(emp.esiNumber)} />
          <InfoRow label="Tax Regime"  value={emp.taxRegime} />
          <InfoRow label="PT State"    value={emp.ptState} />
        </Section>

        {/* Salary Revisions */}
        <div className="card p-6">
          <SalaryRevisionPanel employeeId={emp.id} />
        </div>

        {/* Bank */}
        <Section title="Bank Details">
          <InfoRow label="Account No." value={fmt(emp.bankAccount)} />
          <InfoRow label="IFSC Code"   value={fmt(emp.ifsc)} />
          <InfoRow label="Bank Name"   value={fmt(emp.bankName)} />
        </Section>

        {/* Documents */}
        {(emp.photoPath || emp.aadhaarDocPath || emp.panDocPath || emp.bankPassbookPath) && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">
              Documents
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['Photo',              emp.photoPath],
                ['Aadhaar Scan',       emp.aadhaarDocPath],
                ['PAN Scan',           emp.panDocPath],
                ['Bank Passbook Scan', emp.bankPassbookPath],
              ].filter(([, p]) => p).map(([label, path]) => (
                <a
                  key={label}
                  href={path as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-3 border border-slate-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center"
                >
                  <span className="text-3xl mb-1">{(path as string).endsWith('.pdf') ? '📄' : '🖼'}</span>
                  <span className="text-xs text-slate-600 font-medium">{label}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Click to view</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Face Biometric */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Face Biometric</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Used for kiosk attendance — face is captured once and stored as a mathematical descriptor
              </p>
            </div>
            <button
              onClick={() => setShowBiometric(true)}
              className="btn btn-primary btn-sm"
            >
              {emp.faceDescriptor ? '🔄 Re-enrol' : '📷 Enrol Biometric'}
            </button>
          </div>
          <div className={clsx(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            emp.faceDescriptor
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200',
          )}>
            {emp.faceDescriptor
              ? '✓ Biometric enrolled — employee can use the kiosk'
              : '⚠ Not enrolled — employee cannot use the kiosk until biometric is captured'}
          </div>
        </div>

        {/* Dependents */}
        <div className="card p-6">
          <DependentsPanel employeeId={emp.id} />
        </div>

      </main>

      {/* Face Capture Modal */}
      {showBiometric && (
        <FaceCaptureModal
          employeeId={emp.id}
          employeeName={`${emp.firstName} ${emp.lastName}`}
          onClose={() => setShowBiometric(false)}
          onSaved={() => { refetch(); }}
        />
      )}
    </>
  );
}
