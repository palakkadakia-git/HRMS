'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import {
  useCompanySettings,
  useUpdateCompanySettings,
  useUploadCompanyLogo,
} from '@/hooks/useSettings';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '@/hooks/useSites';
import {
  useDesignationMaster,
  useCreateDesignation,
  useUpdateDesignation,
  useDeleteDesignation,
  useBulkUploadDesignations,
  type DesignationBulkResult,
} from '@/hooks/useDesignationMaster';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { useAllPermissions, useUpdatePermission, usePermissions, type AppModule, type PermissionRow } from '@/hooks/usePermissions';
import { useRoles, useCreateRole, useDeleteRole } from '@/hooks/useRoles';
import { useMinimumWages, useCreateMinimumWage, useDeleteMinimumWage } from '@/hooks/useMinimumWages';
import type { CompanySettings, Site, DesignationMaster, User, SkillLevel, UserRole, Role, MinimumWage, CreateMinimumWageDto } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'SKILLED',      label: 'Skilled'      },
  { value: 'SEMI_SKILLED', label: 'Semi-Skilled'  },
  { value: 'UNSKILLED',    label: 'Unskilled'     },
  { value: 'STAFF',        label: 'Staff'         },
];

// ROLES is now loaded dynamically from the DB via useRoles() inside UsersTab

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Other',
];

type Tab = 'company' | 'sites' | 'designations' | 'users' | 'roles' | 'access' | 'minwages';

// ── Company tab ───────────────────────────────────────────────────────────────

function CompanyTab() {
  const { data: cfg, isLoading } = useCompanySettings();
  const update    = useUpdateCompanySettings();
  const uploadLogo = useUploadCompanyLogo();
  const fileRef   = useRef<HTMLInputElement>(null);
  const { can }   = usePermissions();

  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cfg && Object.keys(form).length === 0) {
      setForm({
        companyName: cfg.companyName,
        address:     cfg.address,
        cin:         cfg.cin,
        tan:         cfg.tan,
        pan:         cfg.pan,
        state:       cfg.state,
        pfCeiling:   cfg.pfCeiling,
        esiCeiling:  cfg.esiCeiling,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  function set(k: keyof CompanySettings, v: string | number) {
    setSaved(false);
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync(form);
      setSaved(true);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Save failed.');
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Logo upload failed.');
    }
    // reset so same file can be selected again
    if (fileRef.current) fileRef.current.value = '';
  }

  const logoUrl = cfg?.logoPath
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}/${cfg.logoPath}`
    : null;

  if (isLoading) return <div className="py-20 text-center text-slate-400">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-8">

      {/* Logo section */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Company Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-3xl text-slate-300">🏢</span>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-3">
              Logo appears on payslips and reports. Recommended: square PNG/SVG, 200×200 px or larger.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogo}
            />
            {can('settings', 'update') && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLogo.isPending}
                className="btn btn-outline btn-sm"
              >
                {uploadLogo.isPending ? 'Uploading…' : logoUrl ? '🔄 Change Logo' : '📷 Upload Logo'}
              </button>
            )}
            {uploadLogo.isSuccess && (
              <p className="text-xs text-green-600 mt-1">✓ Logo updated</p>
            )}
          </div>
        </div>
      </div>

      {/* Company details form */}
      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <h3 className="font-semibold text-slate-700">Company Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Company Name</label>
            <input
              className="input w-full"
              value={form.companyName ?? ''}
              onChange={(e) => set('companyName', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="label">Registered Address</label>
            <textarea
              className="input w-full h-20 resize-none"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div>
            <label className="label">CIN</label>
            <input className="input w-full" value={form.cin ?? ''} onChange={(e) => set('cin', e.target.value)} />
          </div>
          <div>
            <label className="label">State</label>
            <select className="input w-full" value={form.state ?? ''} onChange={(e) => set('state', e.target.value)}>
              <option value="">Select state…</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Company TAN</label>
            <input className="input w-full" value={form.tan ?? ''} onChange={(e) => set('tan', e.target.value)} />
          </div>
          <div>
            <label className="label">Company PAN</label>
            <input className="input w-full" value={form.pan ?? ''} onChange={(e) => set('pan', e.target.value)} />
          </div>
        </div>

        <hr className="border-slate-100" />

        <h4 className="font-medium text-slate-600 text-sm">Statutory Ceilings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">EPF Wage Ceiling (₹)</label>
            <input
              type="number"
              className="input w-full"
              value={form.pfCeiling ?? ''}
              onChange={(e) => set('pfCeiling', Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Default ₹15,000</p>
          </div>
          <div>
            <label className="label">ESI Wage Ceiling (₹)</label>
            <input
              type="number"
              className="input w-full"
              value={form.esiCeiling ?? ''}
              onChange={(e) => set('esiCeiling', Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Default ₹21,000</p>
          </div>
        </div>

        {can('settings', 'update') && (
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={update.isPending} className="btn btn-primary btn-sm">
              {update.isPending ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && <span className="text-xs text-green-600">✓ Saved</span>}
          </div>
        )}
      </form>
    </div>
  );
}

// ── Sites tab ─────────────────────────────────────────────────────────────────

type SiteForm = {
  name: string; city: string; state: string;
  isActive: boolean; esiApplicable: boolean;
};

const SITE_BLANK: SiteForm = { name: '', city: '', state: '', isActive: true, esiApplicable: true };

function SitesTab() {
  const { data: sites = [], isLoading } = useSites();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();
  const { can }    = usePermissions();

  const [editing, setEditing] = useState<Site | null>(null);   // null = adding new
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SiteForm>(SITE_BLANK);
  const [err, setErr] = useState('');

  function openNew() {
    setEditing(null);
    setForm(SITE_BLANK);
    setErr('');
    setShowForm(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    setForm({
      name:          site.name,
      city:          site.city  ?? '',
      state:         site.state ?? '',
      isActive:      site.isActive,
      esiApplicable: site.esiApplicable,
    });
    setErr('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      if (editing) {
        await updateSite.mutateAsync({ id: editing.id, ...form });
      } else {
        await createSite.mutateAsync(form);
      }
      setShowForm(false);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Error saving site.');
    }
  }

  async function handleDelete(site: Site) {
    if (!confirm(`Delete site "${site.name}"? This will fail if employees are assigned.`)) return;
    try {
      await deleteSite.mutateAsync(site.id);
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Delete failed.');
    }
  }

  const isBusy = createSite.isPending || updateSite.isPending;

  return (
    <div className="max-w-3xl space-y-4">
      {can('settings', 'create') && (
        <div className="flex justify-end">
          <button onClick={openNew} className="btn btn-primary btn-sm">+ Add Site</button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-800 mb-5">{editing ? 'Edit Site' : 'Add Site'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Site Name *</label>
                <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="label">State</label>
                  <select className="input w-full" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    <option value="">Select…</option>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.esiApplicable} onChange={(e) => setForm({ ...form, esiApplicable: e.target.checked })} />
                  <span className="text-sm text-slate-700">ESI Applicable</span>
                </label>
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={isBusy} className="btn btn-primary btn-sm">
                  {isBusy ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : sites.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No sites yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-center font-semibold">ESI</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                {(can('settings', 'update') || can('settings', 'delete')) && (
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{site.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[site.city, site.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {site.esiApplicable
                      ? <span className="badge bg-green-100 text-green-700">Yes</span>
                      : <span className="badge bg-slate-100 text-slate-500">No</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {site.isActive
                      ? <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                      : <span className="badge bg-red-100 text-red-600">Inactive</span>
                    }
                  </td>
                  {(can('settings', 'update') || can('settings', 'delete')) && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-3 justify-center">
                        {can('settings', 'update') && (
                          <button onClick={() => openEdit(site)} className="text-primary text-xs hover:underline">Edit</button>
                        )}
                        {can('settings', 'delete') && (
                          <button onClick={() => handleDelete(site)} className="text-red-400 text-xs hover:text-red-600">Delete</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Designations tab ──────────────────────────────────────────────────────────

function DesignationsTab() {
  const { data: desigs = [], isLoading } = useDesignationMaster();
  const createDesig = useCreateDesignation();
  const updateDesig = useUpdateDesignation();
  const deleteDesig = useDeleteDesignation();
  const bulkUpload  = useBulkUploadDesignations();
  const { can }     = usePermissions();

  const [showForm,   setShowForm]   = useState(false);
  const [showBulk,   setShowBulk]   = useState(false);
  const [editing,    setEditing]    = useState<DesignationMaster | null>(null);
  const [name,       setName]       = useState('');
  const [skill,      setSkill]      = useState<SkillLevel>('SKILLED');
  const [err,        setErr]        = useState('');

  // Bulk upload state
  const bulkFileRef                         = useRef<HTMLInputElement>(null);
  const [bulkFile,   setBulkFile]           = useState<File | null>(null);
  const [bulkResult, setBulkResult]         = useState<DesignationBulkResult | null>(null);
  const [bulkErr,    setBulkErr]            = useState('');

  function openNew() {
    setEditing(null);
    setName('');
    setSkill('SKILLED');
    setErr('');
    setShowForm(true);
  }

  function openEdit(d: DesignationMaster) {
    setEditing(d);
    setName(d.designation);
    setSkill(d.skillLevel);
    setErr('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      if (editing) {
        await updateDesig.mutateAsync({ id: editing.id, designation: name, skillLevel: skill });
      } else {
        await createDesig.mutateAsync({ designation: name, skillLevel: skill });
      }
      setShowForm(false);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Error saving designation.');
    }
  }

  async function handleDelete(d: DesignationMaster) {
    if (!confirm(`Delete designation "${d.designation}"?`)) return;
    try {
      await deleteDesig.mutateAsync(d.id);
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Delete failed.');
    }
  }

  function openBulk() {
    setBulkFile(null);
    setBulkResult(null);
    setBulkErr('');
    setShowBulk(true);
  }

  function closeBulk() {
    setShowBulk(false);
    setBulkFile(null);
    setBulkResult(null);
    setBulkErr('');
    if (bulkFileRef.current) bulkFileRef.current.value = '';
  }

  async function handleBulkUpload() {
    if (!bulkFile) return;
    setBulkErr('');
    try {
      const result = await bulkUpload.mutateAsync(bulkFile);
      setBulkResult(result);
    } catch (ex: any) {
      setBulkErr(ex?.response?.data?.message ?? 'Upload failed.');
    }
  }

  const isBusy = createDesig.isPending || updateDesig.isPending;

  return (
    <div className="max-w-2xl space-y-4">
      {can('settings', 'create') && (
        <div className="flex justify-end gap-2">
          <button onClick={openBulk}  className="btn btn-outline btn-sm">📊 Bulk Upload</button>
          <button onClick={openNew}   className="btn btn-primary btn-sm">+ Add Designation</button>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-5">{editing ? 'Edit Designation' : 'Add Designation'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Designation Name *</label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Electrician, Supervisor"
                />
              </div>
              <div>
                <label className="label">Skill Level *</label>
                <select className="input w-full" value={skill} onChange={(e) => setSkill(e.target.value as SkillLevel)}>
                  {SKILL_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={isBusy} className="btn btn-primary btn-sm">
                  {isBusy ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk upload modal ── */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-800 mb-1">Bulk Upload Designations</h3>
            <p className="text-xs text-slate-400 mb-5">Upload an Excel file to create or update multiple designations at once.</p>

            {!bulkResult ? (
              <div className="space-y-5">
                {/* Step 1 — Download template */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xl shrink-0">1️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Download the Excel template</p>
                    <p className="text-xs text-blue-600 mt-0.5 mb-3">
                      Two columns: <strong>Designation</strong> and <strong>Skill Level</strong>.
                      Valid skill levels: SKILLED, SEMI_SKILLED, UNSKILLED, STAFF.
                    </p>
                    <a
                      href="/api/designation-master/template"
                      download="designation-bulk-upload-template.xlsx"
                      className="btn btn-outline btn-sm"
                    >
                      📥 Download Template (.xlsx)
                    </a>
                  </div>
                </div>

                {/* Step 2 — Upload */}
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xl shrink-0">2️⃣</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Upload the filled Excel file</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">
                      Existing designations with the same name will have their skill level updated.
                    </p>
                    <div
                      onClick={() => bulkFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="text-3xl mb-2">📊</div>
                      <p className="text-sm text-slate-600 font-medium">
                        {bulkFile ? bulkFile.name : 'Click to select Excel file'}
                      </p>
                      {bulkFile && (
                        <p className="text-xs text-slate-400 mt-0.5">{(bulkFile.size / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                    <input
                      ref={bulkFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => { setBulkFile(e.target.files?.[0] ?? null); setBulkErr(''); }}
                    />
                  </div>
                </div>

                {bulkErr && <p className="text-xs text-red-500">{bulkErr}</p>}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={closeBulk} className="btn btn-ghost btn-sm">Cancel</button>
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    disabled={!bulkFile || bulkUpload.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {bulkUpload.isPending ? 'Uploading…' : 'Upload & Import'}
                  </button>
                </div>
              </div>
            ) : (
              /* Results view */
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-700">{bulkResult.total}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Rows</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">{bulkResult.created}</p>
                    <p className="text-xs text-emerald-600 mt-1">Imported</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-500">{bulkResult.skipped}</p>
                    <p className="text-xs text-red-500 mt-1">Skipped</p>
                  </div>
                </div>

                {bulkResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-2">⚠ Errors ({bulkResult.errors.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {bulkResult.errors.map((e, i) => (
                        <div key={i} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                          <span className="font-semibold">Row {e.row}</span>
                          {e.designation ? ` · ${e.designation}` : ''}: {e.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="button" onClick={closeBulk} className="btn btn-primary btn-sm">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : desigs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No designations yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Designation</th>
                <th className="px-4 py-3 text-left font-semibold">Skill Level</th>
                {(can('settings', 'update') || can('settings', 'delete')) && (
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {desigs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.designation}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      d.skillLevel === 'SKILLED'      ? 'bg-blue-100 text-blue-700'   :
                      d.skillLevel === 'SEMI_SKILLED' ? 'bg-amber-100 text-amber-700' :
                      d.skillLevel === 'UNSKILLED'    ? 'bg-slate-100 text-slate-600' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {SKILL_LEVELS.find((s) => s.value === d.skillLevel)?.label ?? d.skillLevel}
                    </span>
                  </td>
                  {(can('settings', 'update') || can('settings', 'delete')) && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-3 justify-center">
                        {can('settings', 'update') && (
                          <button onClick={() => openEdit(d)} className="text-primary text-xs hover:underline">Edit</button>
                        )}
                        {can('settings', 'delete') && (
                          <button onClick={() => handleDelete(d)} className="text-red-400 text-xs hover:text-red-600">Delete</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

type UserForm = { email: string; name: string; role: string; password: string };
const USER_BLANK: UserForm = { email: '', name: '', role: 'HR', password: '' };

function UsersTab() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] }           = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { can }    = usePermissions();

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser]       = useState<UserForm>(USER_BLANK);
  const [createErr, setCreateErr]   = useState('');

  async function toggleActive(user: User) {
    try {
      await updateUser.mutateAsync({ id: user.id, isActive: !user.isActive });
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Update failed.');
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Permanently delete user "${user.name}" (${user.email})? This cannot be undone.`)) return;
    try {
      await deleteUser.mutateAsync(user.id);
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Delete failed.');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr('');
    try {
      await createUser.mutateAsync(newUser);
      setShowCreate(false);
      setNewUser(USER_BLANK);
    } catch (ex: any) {
      setCreateErr(ex?.response?.data?.message ?? 'Error creating user.');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {can('settings', 'create') && (
        <div className="flex justify-end">
          <button onClick={() => { setNewUser(USER_BLANK); setCreateErr(''); setShowCreate(true); }} className="btn btn-primary btn-sm">
            + Add User
          </button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-5">Create User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input w-full" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input w-full" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input w-full" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {roles.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Password *</label>
                <input
                  type="password"
                  className="input w-full"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                />
              </div>
              {createErr && <p className="text-xs text-red-500">{createErr}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="btn btn-primary btn-sm">
                  {createUser.isPending ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-center font-semibold">Role</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                {(can('settings', 'update') || can('settings', 'delete')) && (
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${
                      user.role === 'ADMIN'    ? 'bg-red-100 text-red-700'    :
                      user.role === 'HR'       ? 'bg-blue-100 text-blue-700'  :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.isActive
                      ? <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                      : <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                    }
                  </td>
                  {(can('settings', 'update') || can('settings', 'delete')) && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-3 justify-center">
                        {can('settings', 'update') && (
                          <button
                            onClick={() => toggleActive(user)}
                            disabled={updateUser.isPending}
                            className={`text-xs hover:underline ${user.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        {can('settings', 'delete') && (
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deleteUser.isPending}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Access Control tab ────────────────────────────────────────────────────────

const MODULES: { key: AppModule; label: string }[] = [
  { key: 'employees',  label: 'Employees'  },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave',      label: 'Leave'      },
  { key: 'payroll',    label: 'Payroll'    },
  { key: 'reports',    label: 'Reports'    },
  { key: 'settings',   label: 'Settings'   },
  { key: 'kiosk',      label: 'Kiosk'      },
];

// NON_ADMIN_ROLES is now loaded dynamically from useRoles() inside AccessControlTab

const CRUD_FLAGS = ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const;
const CRUD_LABELS: Record<typeof CRUD_FLAGS[number], string> = {
  canCreate: 'C', canRead: 'R', canUpdate: 'U', canDelete: 'D',
};

function AccessControlTab() {
  const { data: allPerms = [], isLoading: permsLoading } = useAllPermissions();
  const { data: allRoles = [], isLoading: rolesLoading } = useRoles();
  const updatePerm = useUpdatePermission();
  const { can }    = usePermissions();
  const isLoading  = permsLoading || rolesLoading;

  // All roles except ADMIN, in the order returned by the backend
  const nonAdminRoles = allRoles.filter(r => r.name !== 'ADMIN');

  function getRow(role: string, module: string): PermissionRow | undefined {
    return allPerms.find(p => p.role === role && p.module === module);
  }

  async function toggle(row: PermissionRow, flag: typeof CRUD_FLAGS[number]) {
    try {
      await updatePerm.mutateAsync({ ...row, [flag]: !row[flag] });
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Update failed.');
    }
  }

  if (isLoading) return <div className="py-20 text-center text-slate-400">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-4 bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <strong>Note:</strong> ADMIN always has full CRUD access and cannot be restricted.
        Changes take effect within 60 seconds as the backend cache refreshes.
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-semibold w-32">Module</th>
              {nonAdminRoles.map(role => (
                <th key={role.name} className="px-4 py-3 text-center font-semibold" colSpan={4}>
                  {role.label}
                </th>
              ))}
            </tr>
            {/* CRUD sub-headers */}
            <tr className="bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
              <th className="px-4 py-2" />
              {nonAdminRoles.map(role =>
                CRUD_FLAGS.map(flag => (
                  <th key={`${role.name}-${flag}`} className="px-2 py-2 text-center font-semibold text-slate-500">
                    {CRUD_LABELS[flag]}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MODULES.map(mod => (
              <tr key={mod.key} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{mod.label}</td>
                {nonAdminRoles.map(role => {
                  const row = getRow(role.name, mod.key);
                  return CRUD_FLAGS.map(flag => (
                    <td key={`${role.name}-${flag}`} className="px-2 py-3 text-center">
                      {row ? (
                        <button
                          type="button"
                          onClick={() => can('settings', 'update') ? toggle(row, flag) : undefined}
                          disabled={updatePerm.isPending || !can('settings', 'update')}
                          className={`w-6 h-6 rounded text-xs font-bold border transition-colors ${
                            row[flag]
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300 text-slate-300 hover:border-indigo-400'
                          } ${!can('settings', 'update') ? 'cursor-not-allowed opacity-60' : ''}`}
                          title={
                            !can('settings', 'update')
                              ? 'You don\'t have permission to change access controls'
                              : `${role.label} — ${flag} on ${mod.label}: ${row[flag] ? 'ON (click to disable)' : 'OFF (click to enable)'}`
                          }
                        >
                          {CRUD_LABELS[flag]}
                        </button>
                      ) : (
                        <span className="text-slate-200 text-xs">—</span>
                      )}
                    </td>
                  ));
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        <strong>C</strong> = Create &nbsp;·&nbsp;
        <strong>R</strong> = Read &nbsp;·&nbsp;
        <strong>U</strong> = Update &nbsp;·&nbsp;
        <strong>D</strong> = Delete
      </p>
    </div>
  );
}

// ── Roles tab ─────────────────────────────────────────────────────────────────

function RolesTab() {
  const { data: roles = [], isLoading } = useRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const { can }    = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [name,     setName]     = useState('');
  const [label,    setLabel]    = useState('');
  const [err,      setErr]      = useState('');

  function openCreate() {
    setName('');
    setLabel('');
    setErr('');
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await createRole.mutateAsync({ name, label });
      setShowForm(false);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Error creating role.');
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`Delete role "${role.label}" (${role.name})? All its permission settings will be removed.`)) return;
    try {
      await deleteRole.mutateAsync(role.name);
    } catch (ex: any) {
      alert(ex?.response?.data?.message ?? 'Delete failed.');
    }
  }

  return (
    <div className="max-w-2xl space-y-4">

      {/* Info banner */}
      <div className="card p-4 bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <strong>Roles</strong> define who can do what. After creating a role, configure its module permissions
        in the <strong>Access Control</strong> tab, then assign it to users in the <strong>Users</strong> tab.
      </div>

      {can('settings', 'create') && (
        <div className="flex justify-end">
          <button onClick={openCreate} className="btn btn-primary btn-sm">+ Add Role</button>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-5">Create Role</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Role Key *</label>
                <input
                  className="input w-full uppercase"
                  placeholder="e.g. SUPERVISOR"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Machine identifier — letters, digits, underscores only. Cannot be changed later.
                </p>
              </div>
              <div>
                <label className="label">Display Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Supervisor"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown in the UI (role badge, user table, etc.).
                </p>
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={createRole.isPending} className="btn btn-primary btn-sm">
                  {createRole.isPending ? 'Creating…' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : roles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No roles found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Role Key</th>
                <th className="px-4 py-3 text-left font-semibold">Display Name</th>
                <th className="px-4 py-3 text-center font-semibold">Type</th>
                {can('settings', 'delete') && (
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{role.name}</td>
                  <td className="px-4 py-3 text-slate-700">{role.label}</td>
                  <td className="px-4 py-3 text-center">
                    {role.isSystem ? (
                      <span className="badge bg-slate-100 text-slate-500">System</span>
                    ) : (
                      <span className="badge bg-indigo-100 text-indigo-700">Custom</span>
                    )}
                  </td>
                  {can('settings', 'delete') && (
                    <td className="px-4 py-3 text-center">
                      {role.isSystem ? (
                        <span className="text-xs text-slate-300">Protected</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(role)}
                          disabled={deleteRole.isPending}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Minimum Wages tab ─────────────────────────────────────────────────────────

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  SKILLED:      'Skilled',
  SEMI_SKILLED: 'Semi-Skilled',
  UNSKILLED:    'Unskilled',
  STAFF:        'Staff',
};

function MinimumWagesTab() {
  const { data: sites = [] } = useSites();
  const { can } = usePermissions();
  const createMW  = useCreateMinimumWage();
  const deleteMW  = useDeleteMinimumWage();

  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id ?? '');
  const [showHistory, setShowHistory]        = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    skillLevel: SkillLevel | '';
    monthlyWage: string;
    effectiveFrom: string;
  }>({ open: false, skillLevel: '', monthlyWage: '', effectiveFrom: new Date().toISOString().split('T')[0] });

  // Keep selectedSiteId in sync when sites load
  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) setSelectedSiteId(sites[0].id);
  }, [sites, selectedSiteId]);

  const { data: wages = [], isLoading } = useMinimumWages(
    selectedSiteId || undefined,
    !showHistory,
  );

  function openModal(skillLevel?: SkillLevel) {
    setModal({
      open: true,
      skillLevel: skillLevel ?? '',
      monthlyWage: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiteId || !modal.skillLevel || !modal.monthlyWage) return;
    const dto: CreateMinimumWageDto = {
      siteId:       selectedSiteId,
      skillLevel:   modal.skillLevel as SkillLevel,
      monthlyWage:  parseFloat(modal.monthlyWage),
      effectiveFrom: modal.effectiveFrom,
    };
    await createMW.mutateAsync(dto);
    setModal(m => ({ ...m, open: false }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this minimum wage entry?')) return;
    await deleteMW.mutateAsync(id);
  }

  const fmtMoney = (n: number) =>
    `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate  = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Site</label>
          <select
            value={selectedSiteId}
            onChange={e => setSelectedSiteId(e.target.value)}
            className="form-input !py-1.5 !text-sm w-52"
          >
            <option value="">— All sites —</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ''}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 mt-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={e => setShowHistory(e.target.checked)}
            className="rounded"
          />
          Show history
        </label>

        <div className="ml-auto mt-4">
          {can('settings', 'create') && (
            <button
              onClick={() => openModal()}
              disabled={!selectedSiteId}
              className="btn btn-primary btn-sm"
            >
              + Set Wage
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : wages.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm border border-dashed rounded-lg">
          {selectedSiteId
            ? 'No minimum wage entries for this site.'
            : 'Select a site to view minimum wages.'}
          {can('settings', 'create') && selectedSiteId && (
            <>
              {' '}
              <button onClick={() => openModal()} className="text-primary hover:underline">
                Add one
              </button>
              .
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                {!selectedSiteId && <th className="px-4 py-3 text-left">Site</th>}
                <th className="px-4 py-3 text-left">Skill Level</th>
                <th className="px-4 py-3 text-right">Monthly Wage</th>
                <th className="px-4 py-3 text-left">Effective From</th>
                <th className="px-4 py-3 text-left">Effective To</th>
                {(can('settings', 'create') || can('settings', 'delete')) && (
                  <th className="px-4 py-3 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wages.map(w => {
                const isActive = !w.effectiveTo;
                return (
                  <tr key={w.id} className={`hover:bg-slate-50 ${isActive ? 'bg-green-50/40' : ''}`}>
                    {!selectedSiteId && (
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {w.site?.name ?? '—'}
                        {w.site?.city && <span className="text-slate-400 text-xs ml-1">({w.site.city})</span>}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {SKILL_LEVEL_LABELS[w.skillLevel] ?? w.skillLevel}
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-700 font-medium px-1.5 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {fmtMoney(Number(w.monthlyWage))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(w.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {w.effectiveTo ? fmtDate(w.effectiveTo) : <span className="text-green-600">Present</span>}
                    </td>
                    {(can('settings', 'create') || can('settings', 'delete')) && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {can('settings', 'create') && isActive && (
                            <button
                              onClick={() => openModal(w.skillLevel)}
                              className="text-xs text-primary hover:underline"
                            >
                              Update
                            </button>
                          )}
                          {can('settings', 'delete') && (
                            <button
                              onClick={() => handleDelete(w.id)}
                              disabled={deleteMW.isPending}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Set Minimum Wage</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="form-label">Site</label>
                <p className="text-sm font-medium text-slate-700">
                  {sites.find(s => s.id === selectedSiteId)?.name ?? '—'}
                </p>
              </div>

              <div>
                <label className="form-label">
                  Skill Level <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={modal.skillLevel}
                  onChange={e => setModal(m => ({ ...m, skillLevel: e.target.value as SkillLevel }))}
                  className="form-input"
                >
                  <option value="">Select…</option>
                  {SKILL_LEVELS.map(sl => (
                    <option key={sl.value} value={sl.value}>{sl.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Monthly Wage (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  placeholder="e.g. 17000"
                  value={modal.monthlyWage}
                  onChange={e => setModal(m => ({ ...m, monthlyWage: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">
                  Effective From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={modal.effectiveFrom}
                  onChange={e => setModal(m => ({ ...m, effectiveFrom: e.target.value }))}
                  className="form-input"
                />
                <p className="text-xs text-slate-400 mt-0.5">
                  The existing active entry (if any) will be closed automatically.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(m => ({ ...m, open: false }))}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMW.isPending}
                  className="btn btn-primary flex-1"
                >
                  {createMW.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'company',      label: '🏢 Company'        },
  { id: 'sites',        label: '📍 Sites'           },
  { id: 'designations', label: '🏷 Designations'    },
  { id: 'minwages',     label: '💰 Min. Wages'      },
  { id: 'users',        label: '👥 Users'           },
  { id: 'roles',        label: '🎭 Roles'           },
  { id: 'access',       label: '🔐 Access Control'  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('company');

  return (
    <>
      <Header title="Settings" subtitle="Company configuration & master data" />

      <main className="flex-1 p-6">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 mb-6 flex-wrap">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'company'      && <CompanyTab        />}
        {tab === 'sites'        && <SitesTab          />}
        {tab === 'designations' && <DesignationsTab   />}
        {tab === 'minwages'     && <MinimumWagesTab   />}
        {tab === 'users'        && <UsersTab          />}
        {tab === 'roles'        && <RolesTab          />}
        {tab === 'access'       && <AccessControlTab  />}
      </main>
    </>
  );
}
