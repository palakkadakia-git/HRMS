'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '@/hooks/useAttendance';
import { useSites } from '@/hooks/useSites';
import { usePermissions } from '@/hooks/usePermissions';
import type { Holiday, HolidayType } from '@/types';

// ── constants ────────────────────────────────────────────────────────────────

const HOLIDAY_TYPES: { value: HolidayType; label: string; badge: string }[] = [
  { value: 'NATIONAL', label: 'National',  badge: 'bg-red-100 text-red-700'        },
  { value: 'FESTIVAL', label: 'Festival',  badge: 'bg-orange-100 text-orange-700'  },
  { value: 'OPTIONAL', label: 'Optional',  badge: 'bg-slate-100 text-slate-600'    },
];

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

interface FormState {
  name: string;
  date: string;
  type: HolidayType;
  siteId: string;   // '' = all sites
}

const EMPTY: FormState = { name: '', date: '', type: 'FESTIVAL', siteId: '' };

// ── page ─────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const now = new Date();
  const [year,          setYear]         = useState(now.getFullYear());
  const [filterSiteId,  setFilterSiteId] = useState('');   // '' = show all

  const { data: sites    = [] } = useSites();
  const { data: holidays = [], isLoading } = useHolidays(year);   // fetch all, filter in UI

  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const remove = useDeleteHoliday();
  const { can } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Holiday | null>(null);
  const [form,     setForm]     = useState<FormState>(EMPTY);
  const [err,      setErr]      = useState('');

  // Client-side filter by site ('' = global/all-site ones + site-specific)
  const displayed = filterSiteId
    ? holidays.filter((h) => !h.siteId || h.siteId === filterSiteId)
    : holidays;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErr('');
    setShowForm(true);
  }

  function openEdit(h: Holiday) {
    setEditing(h);
    setForm({
      name:   h.name,
      date:   h.date.split('T')[0],
      type:   h.type,
      siteId: h.siteId ?? '',
    });
    setErr('');
    setShowForm(true);
  }

  async function handleSubmit() {
    setErr('');
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!form.date)        { setErr('Date is required.'); return; }

    const dateYear = new Date(form.date + 'T00:00:00').getFullYear();
    const payload = {
      name:   form.name.trim(),
      date:   form.date,
      type:   form.type,
      year:   dateYear,
      siteId: form.siteId || undefined,   // '' → undefined (null in DB = all sites)
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Something went wrong.');
    }
  }

  async function handleDelete(h: Holiday) {
    if (!confirm(`Delete "${h.name}"?`)) return;
    try { await remove.mutateAsync(h.id); }
    catch (e: any) { alert(e?.response?.data?.message ?? 'Delete failed.'); }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <>
      <Header
        title="Holidays"
        subtitle="National, festival, and site-specific holidays"
        actions={
          can('attendance', 'create') && (
            <button onClick={openCreate} className="btn btn-primary btn-sm">+ Add Holiday</button>
          )
        }
      />

      <main className="flex-1 p-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-32">
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Show for site</label>
            <select
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
              className="input w-52"
            >
              <option value="">All Sites (global view)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-400 pb-2">{displayed.length} holidays</span>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300 inline-block" />
            All sites
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block" />
            Site-specific
          </span>
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              Loading…
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-2">🎉</p>
              <p>No holidays declared for {year}.</p>
              {can('attendance', 'create') && (
                <button onClick={openCreate} className="btn btn-primary btn-sm mt-4">Add First Holiday</button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Holiday</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Applies To</th>
                {(can('attendance', 'update') || can('attendance', 'delete')) && (
                  <th className="px-5 py-3 text-center font-semibold">Actions</th>
                )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((h) => {
                  const typeInfo = HOLIDAY_TYPES.find((t) => t.value === h.type)!;
                  const siteName = h.site?.name ?? (h.siteId ? '—' : null);
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{h.name}</td>
                      <td className="px-5 py-3 text-slate-600">{fmtDate(h.date.split('T')[0])}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.badge}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {siteName ? (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {siteName}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            All Sites
                          </span>
                        )}
                      </td>
                      {(can('attendance', 'update') || can('attendance', 'delete')) && (
                        <td className="px-5 py-3 text-center space-x-3">
                          {can('attendance', 'update') && (
                            <button onClick={() => openEdit(h)} className="text-xs text-primary hover:underline">Edit</button>
                          )}
                          {can('attendance', 'delete') && (
                            <button onClick={() => handleDelete(h)} className="text-xs text-red-500 hover:underline">Delete</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 text-base mb-5">
              {editing ? 'Edit Holiday' : 'Add Holiday'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Durga Puja, Janmashtami"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as HolidayType })}
                  className="input w-full"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Applies To
                </label>
                <select
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">All Sites (national / common)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` — ${s.city}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave as "All Sites" for Republic Day, Independence Day, Diwali, etc.
                  Choose a site for state/regional holidays like Durga Puja or Pongal.
                </p>
              </div>

              {err && <p className="text-xs text-red-500">{err}</p>}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowForm(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary btn-sm">
                {isPending ? 'Saving…' : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
