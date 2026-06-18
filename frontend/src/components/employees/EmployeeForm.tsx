'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import FileUpload from '@/components/ui/FileUpload';
import { useUploadDocument } from '@/hooks/useEmployees';
import { useSites } from '@/hooks/useSites';
import { useDesignationMaster } from '@/hooks/useDesignationMaster';
import { useShifts } from '@/hooks/useAttendance';
import { useEmployeeSites, useAddEmployeeSite, useRemoveEmployeeSite, useSetPrimaryEmployeeSite } from '@/hooks/useEmployeeSites';
import {
  SEX_OPTIONS, BLOOD_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS,
  PT_STATES, TAX_REGIMES, type Employee, type CreateEmployeeDto,
} from '@/types';

// Build tab list — Sites tab only shows for existing employees
function buildTabs(isEdit: boolean) {
  const base = [
    { id: 'personal',   label: '👤 Personal'   },
    { id: 'address',    label: '🏠 Address'     },
    { id: 'employment', label: '💼 Employment'  },
    { id: 'statutory',  label: '📋 Statutory'   },
    { id: 'bank',       label: '🏦 Bank'        },
    { id: 'documents',  label: '📎 Documents'   },
  ];
  if (isEdit) base.push({ id: 'sites', label: '🏗 Sites' });
  return base;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  initial?: Employee;
  onSubmit: (data: CreateEmployeeDto) => Promise<void>;
  /** Called after data save + all document uploads succeed */
  onSuccess?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

type Files = { photo: File | null; aadhaarDoc: File | null; panDoc: File | null; bankPassbook: File | null };

const EMPTY: CreateEmployeeDto = {
  firstName: '', lastName: '', sex: 'MALE', dateOfBirth: '', bloodGroup: undefined, fathersName: '',
  addressLine1: '', addressLine2: '', area: '', city: '', stateName: '', country: 'India', pincode: '',
  designation: '', type: 'ON_ROLLS', status: 'PROBATION', dateOfJoining: '', dateOfExit: '',
  isBlacklisted: false,
  aadhaarNumber: '', panNumber: '', epfNumber: '', uanNumber: '', esiNumber: '', taxRegime: 'NEW', ptState: 'MH', pfExempt: false,
  bankAccount: '', ifsc: '', bankName: '',
  photoPath: undefined, aadhaarDocPath: undefined, panDocPath: undefined, bankPassbookPath: undefined,
};

export default function EmployeeForm({ initial, onSubmit, onSuccess, isSubmitting, submitLabel = 'Save Employee' }: Props) {
  const isEdit = !!initial?.id;
  const TABS   = buildTabs(isEdit);

  const [tab,  setTab]  = useState('personal');
  const [form, setForm] = useState<CreateEmployeeDto>(() => initial ? { ...EMPTY, ...initial } : { ...EMPTY });
  const [files, setFiles] = useState<Files>({ photo: null, aadhaarDoc: null, panDoc: null, bankPassbook: null });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const uploadDoc     = useUploadDocument(initial?.id ?? '');
  const { data: designations = [] } = useDesignationMaster();
  const { data: shifts       = [] } = useShifts();

  function set(field: keyof CreateEmployeeDto, value: any) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }

  function inp(field: keyof CreateEmployeeDto, type = 'text') {
    return (
      <input
        type={type}
        className={clsx('input', errors[field] && 'input-error')}
        value={(form[field] as any) ?? ''}
        onChange={e => set(field, e.target.value)}
      />
    );
  }

  function sel(field: keyof CreateEmployeeDto, opts: { value: string; label: string }[]) {
    return (
      <select className="input" value={(form[field] as any) ?? ''} onChange={e => set(field, e.target.value)}>
        <option value="">— Select —</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName?.trim()) e.firstName = 'Required';
    if (!form.lastName?.trim())  e.lastName  = 'Required';
    if (!form.sex)               e.sex       = 'Required';
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber))
      e.panNumber = 'Invalid PAN (e.g. ABCDE1234F)';
    if (form.aadhaarNumber && form.aadhaarNumber.length !== 12)
      e.aadhaarNumber = 'Must be 12 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      // Convert empty optional strings → undefined so @IsOptional validators pass.
      const payload: CreateEmployeeDto = {
        ...form,
        dateOfBirth:   form.dateOfBirth   || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
        dateOfExit:    form.dateOfExit    || undefined,
        shiftId:       form.shiftId       || undefined,
        bloodGroup:    form.bloodGroup    || undefined,
        // type, status, taxRegime, ptState are required with defaults — keep form values as-is
      };
      await onSubmit(payload);
      // Upload any newly-selected documents (only possible when editing an existing employee)
      if (initial?.id) {
        for (const [docType, file] of Object.entries(files)) {
          if (file) await uploadDoc.mutateAsync({ docType, file });
        }
      }
      onSuccess?.();
    } catch {
      // Errors are surfaced as toasts by the individual mutations
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-0 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Personal ─────────────────────────────────────── */}
      {tab === 'personal' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="First Name *">
            {inp('firstName')}
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
          </Field>
          <Field label="Last Name *">
            {inp('lastName')}
            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
          </Field>
          <Field label="Sex *">
            {sel('sex', SEX_OPTIONS)}
            {errors.sex && <p className="text-xs text-red-500">{errors.sex}</p>}
          </Field>
          <Field label="Date of Birth">{inp('dateOfBirth', 'date')}</Field>
          <Field label="Blood Group">{sel('bloodGroup', BLOOD_OPTIONS)}</Field>
          <Field label="Father's Name">{inp('fathersName')}</Field>
        </div>
      )}

      {/* ── Address ──────────────────────────────────────── */}
      {tab === 'address' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Address Line 1">{inp('addressLine1')}</Field>
          <Field label="Address Line 2">{inp('addressLine2')}</Field>
          <Field label="Area / Locality">{inp('area')}</Field>
          <Field label="City">{inp('city')}</Field>
          <Field label="State">{inp('stateName')}</Field>
          <Field label="Country">{inp('country')}</Field>
          <Field label="Pin Code">{inp('pincode')}</Field>
        </div>
      )}

      {/* ── Employment ───────────────────────────────────── */}
      {tab === 'employment' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Designation with autocomplete from DesignationMaster */}
          <Field label="Designation">
            <input
              type="text"
              list="designation-list"
              className="input"
              value={form.designation ?? ''}
              onChange={e => set('designation', e.target.value)}
              placeholder="Type or choose…"
            />
            <datalist id="designation-list">
              {designations.map(d => (
                <option key={d.id} value={d.designation}>{d.designation} ({d.skillLevel.replace('_', '-')})</option>
              ))}
            </datalist>
          </Field>

          <Field label="Employee Type">{sel('type', TYPE_OPTIONS)}</Field>
          <Field label="Status">{sel('status', STATUS_OPTIONS)}</Field>
          <Field label="Date of Joining">{inp('dateOfJoining', 'date')}</Field>
          <Field label="Date of Exit">{inp('dateOfExit', 'date')}</Field>

          {/* Shift */}
          <Field label="Shift">
            <select
              className="input"
              value={form.shiftId ?? ''}
              onChange={e => set('shiftId', e.target.value || undefined)}
            >
              <option value="">— No shift assigned —</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shiftHours}h)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Blacklisted">
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isBlacklisted}
                  onChange={e => set('isBlacklisted', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700">Mark as Blacklisted</span>
              </label>
            </div>
          </Field>
        </div>
      )}

      {/* ── Statutory ────────────────────────────────────── */}
      {tab === 'statutory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Aadhaar Number">
            {inp('aadhaarNumber')}
            {errors.aadhaarNumber && <p className="text-xs text-red-500">{errors.aadhaarNumber}</p>}
          </Field>
          <Field label="PAN Number">
            <input
              type="text"
              className={clsx('input uppercase', errors.panNumber && 'input-error')}
              value={form.panNumber ?? ''}
              maxLength={10}
              onChange={e => set('panNumber', e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
            />
            {errors.panNumber && <p className="text-xs text-red-500">{errors.panNumber}</p>}
          </Field>
          <Field label="EPF Number">{inp('epfNumber')}</Field>
          <Field label="UAN Number">{inp('uanNumber')}</Field>
          <Field label="ESI Number">{inp('esiNumber')}</Field>
          <Field label="Tax Regime">{sel('taxRegime', TAX_REGIMES)}</Field>
          <Field label="PT State">{sel('ptState', PT_STATES)}</Field>
          <Field label="PF Exemption">
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={!!form.pfExempt}
                onChange={e => set('pfExempt', e.target.checked)}
              />
              <span className="text-sm text-slate-600">Exempt from EPF deduction</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">Check if employee has opted out or salary exceeds EPF ceiling</p>
          </Field>
        </div>
      )}

      {/* ── Bank ─────────────────────────────────────────── */}
      {tab === 'bank' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Bank Account Number">{inp('bankAccount')}</Field>
          <Field label="IFSC Code">
            <input
              type="text"
              className="input uppercase"
              value={form.ifsc ?? ''}
              onChange={e => set('ifsc', e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Bank Name">{inp('bankName')}</Field>
        </div>
      )}

      {/* ── Documents ────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FileUpload
            label="Employee Photo"
            accept="image/*"
            currentPath={initial?.photoPath}
            onChange={f => setFiles(p => ({ ...p, photo: f }))}
            hint="JPG / PNG — max 10 MB"
          />
          <FileUpload
            label="Aadhaar Scanned Copy"
            accept="image/*,.pdf"
            currentPath={initial?.aadhaarDocPath}
            onChange={f => setFiles(p => ({ ...p, aadhaarDoc: f }))}
            hint="JPG / PNG / PDF — max 10 MB"
          />
          <FileUpload
            label="PAN Scanned Copy"
            accept="image/*,.pdf"
            currentPath={initial?.panDocPath}
            onChange={f => setFiles(p => ({ ...p, panDoc: f }))}
            hint="JPG / PNG / PDF — max 10 MB"
          />
          <FileUpload
            label="Bank Passbook Scanned Copy"
            accept="image/*,.pdf"
            currentPath={initial?.bankPassbookPath}
            onChange={f => setFiles(p => ({ ...p, bankPassbook: f }))}
            hint="JPG / PNG / PDF — max 10 MB"
          />
          {!initial?.id && (
            <p className="col-span-full text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠ Documents can be uploaded after the employee record is saved for the first time.
            </p>
          )}
        </div>
      )}

      {/* ── Sites (edit only) ─────────────────────────────── */}
      {tab === 'sites' && initial?.id && (
        <SiteAssignmentsPanel employeeId={initial.id} />
      )}

      {/* Submit (hidden on Sites tab — changes are saved inline) */}
      {tab !== 'sites' && (
        <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
          <button type="button" onClick={() => history.back()} className="btn btn-outline">Cancel</button>
          <button type="submit" disabled={isSubmitting || uploadDoc.isPending} className="btn btn-primary">
            {(isSubmitting || uploadDoc.isPending)
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : submitLabel
            }
          </button>
        </div>
      )}
    </form>
  );
}

// ── Site Assignments Panel ────────────────────────────────

function SiteAssignmentsPanel({ employeeId }: { employeeId: string }) {
  const { data: sites          = [] } = useSites();
  const { data: assignments    = [], isLoading } = useEmployeeSites(employeeId);
  const addMutation    = useAddEmployeeSite(employeeId);
  const removeMutation = useRemoveEmployeeSite(employeeId);
  const setPrimary     = useSetPrimaryEmployeeSite(employeeId);

  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [startDate,      setStartDate]      = useState('');

  const assignedSiteIds = new Set(assignments.map(a => a.siteId));
  const availableSites  = sites.filter(s => !assignedSiteIds.has(s.id));

  async function handleAdd() {
    if (!selectedSiteId) return;
    await addMutation.mutateAsync({
      siteId:    selectedSiteId,
      startDate: startDate || undefined,
    });
    setSelectedSiteId('');
    setStartDate('');
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500 py-4">Loading site assignments…</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Assign this employee to one or more work sites. The <strong>primary</strong> site is used for payroll reporting when no biometric data is available for a particular day.
      </p>

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No site assignments yet.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">ESI</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.site?.name ?? a.siteId}</td>
                  <td className="px-4 py-3 text-slate-500">{a.site?.city ?? '—'}</td>
                  <td className="px-4 py-3">
                    {a.site?.esiApplicable
                      ? <span className="badge badge-green text-xs">Yes</span>
                      : <span className="badge badge-gray text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.startDate ? new Date(a.startDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="primarySite"
                        checked={a.isPrimary}
                        onChange={() => setPrimary.mutate(a.siteId)}
                        className="accent-primary"
                      />
                      {a.isPrimary && <span className="text-xs text-primary font-medium">Primary</span>}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(a.siteId)}
                      disabled={removeMutation.isPending}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new site */}
      {availableSites.length > 0 && (
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-slate-600">Add Site</label>
            <select
              className="input"
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
            >
              <option value="">— Select site —</option>
              {availableSites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.city ? ` (${s.city})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Start Date</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedSiteId || addMutation.isPending}
            className="btn btn-primary py-2"
          >
            {addMutation.isPending ? 'Adding…' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  );
}
