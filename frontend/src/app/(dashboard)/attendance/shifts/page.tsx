'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '@/hooks/useAttendance';
import { usePermissions } from '@/hooks/usePermissions';
import type { Shift } from '@/types';

interface FormState { name: string; shiftHours: string; }
const EMPTY: FormState = { name: '', shiftHours: '' };

export default function ShiftsPage() {
  const { data: shifts = [], isLoading } = useShifts();
  const create  = useCreateShift();
  const update  = useUpdateShift();
  const remove  = useDeleteShift();
  const { can } = usePermissions();

  const [showForm, setShowForm]   = useState(false);
  const [editing,  setEditing]    = useState<Shift | null>(null);
  const [form,     setForm]       = useState<FormState>(EMPTY);
  const [err,      setErr]        = useState('');

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErr('');
    setShowForm(true);
  }

  function openEdit(shift: Shift) {
    setEditing(shift);
    setForm({ name: shift.name, shiftHours: String(shift.shiftHours) });
    setErr('');
    setShowForm(true);
  }

  async function handleSubmit() {
    setErr('');
    const hrs = parseInt(form.shiftHours, 10);
    if (!form.name.trim())         { setErr('Name is required.'); return; }
    if (!hrs || hrs < 1 || hrs > 24) { setErr('Shift hours must be 1–24.'); return; }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: form.name.trim(), shiftHours: hrs });
      } else {
        await create.mutateAsync({ name: form.name.trim(), shiftHours: hrs });
      }
      setShowForm(false);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Something went wrong.');
    }
  }

  async function handleDelete(shift: Shift) {
    if (!confirm(`Delete shift "${shift.name}"? Employees assigned this shift will lose their shift.`)) return;
    try {
      await remove.mutateAsync(shift.id);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Delete failed.');
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <>
      <Header
        title="Shifts"
        subtitle="Manage shift definitions (8h, 10h, 12h, etc.)"
        actions={
          can('attendance', 'create') && (
            <button onClick={openCreate} className="btn btn-primary btn-sm">+ Add Shift</button>
          )
        }
      />

      <main className="flex-1 p-6">
        <div className="card overflow-hidden max-w-2xl">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              Loading shifts…
            </div>
          ) : shifts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-2">🕐</p>
              <p>No shifts defined yet.</p>
              {can('attendance', 'create') && (
                <button onClick={openCreate} className="btn btn-primary btn-sm mt-4">Add First Shift</button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Shift Name</th>
                  <th className="px-5 py-3 text-center font-semibold">Hours</th>
                {(can('attendance', 'update') || can('attendance', 'delete')) && (
                  <th className="px-5 py-3 text-center font-semibold">Actions</th>
                )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {s.shiftHours}h
                      </span>
                    </td>
                    {(can('attendance', 'update') || can('attendance', 'delete')) && (
                      <td className="px-5 py-3 text-center space-x-3">
                        {can('attendance', 'update') && (
                          <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline">Edit</button>
                        )}
                        {can('attendance', 'delete') && (
                          <button onClick={() => handleDelete(s)} className="text-xs text-red-500 hover:underline">Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
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
              {editing ? 'Edit Shift' : 'Add Shift'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Shift Name</label>
                <input
                  type="text"
                  placeholder="e.g. General, Night, 12-Hour"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Shift Hours</label>
                <input
                  type="number" min="1" max="24"
                  placeholder="e.g. 8, 10, 12"
                  value={form.shiftHours}
                  onChange={(e) => setForm({ ...form, shiftHours: e.target.value })}
                  className="input w-full"
                />
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
