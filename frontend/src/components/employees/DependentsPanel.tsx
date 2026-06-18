'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useDependents, useCreateDependent, useUpdateDependent, useDeleteDependent } from '@/hooks/useDependents';
import { SEX_OPTIONS, RELATION_OPTIONS, type Dependent, type CreateDependentDto } from '@/types';

const REL_LABEL: Record<string, string> = {
  SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Other',
};

const EMPTY: CreateDependentDto = { firstName: '', lastName: '', sex: 'MALE', relationship: 'SPOUSE', dateOfBirth: '' };

export default function DependentsPanel({ employeeId }: { employeeId: string }) {
  const { data: deps = [], isLoading } = useDependents(employeeId);
  const create = useCreateDependent(employeeId);
  const update = useUpdateDependent(employeeId);
  const remove = useDeleteDependent(employeeId);

  const [open, setOpen]   = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [form, setForm]   = useState<CreateDependentDto>({ ...EMPTY });

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setOpen(true); }
  function openEdit(dep: Dependent) { setEditing(dep); setForm({ firstName: dep.firstName, lastName: dep.lastName, sex: dep.sex, relationship: dep.relationship, dateOfBirth: dep.dateOfBirth?.split('T')[0] ?? '' }); setOpen(true); }

  async function handleSave() {
    if (editing) { await update.mutateAsync({ id: editing.id, dto: form }); }
    else         { await create.mutateAsync(form); }
    setOpen(false);
  }

  const isSaving = create.isPending || update.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Dependents ({deps.length})</h3>
        <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add Dependent</button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
      ) : deps.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-400 text-sm">No dependents added yet</p>
          <button onClick={openAdd} className="btn btn-outline btn-sm mt-2">+ Add Dependent</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Name', 'Sex', 'Relationship', 'Date of Birth', ''].map(h => (
                  <th key={h} className="tbl-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deps.map(dep => (
                <tr key={dep.id} className="tbl-row">
                  <td className="tbl-cell font-medium">{dep.firstName} {dep.lastName}</td>
                  <td className="tbl-cell text-slate-500">{dep.sex}</td>
                  <td className="tbl-cell"><span className="badge badge-blue">{REL_LABEL[dep.relationship]}</span></td>
                  <td className="tbl-cell text-slate-500">
                    {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="tbl-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(dep)} className="btn btn-outline btn-xs">Edit</button>
                      <button
                        onClick={() => confirm('Remove this dependent?') && remove.mutate(dep.id)}
                        className="btn btn-xs"
                        style={{ background: '#fde8e8', color: '#c0392b', border: 'none' }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Dependent' : 'Add Dependent'}
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {([['firstName','First Name'],['lastName','Last Name']] as [keyof CreateDependentDto, string][]).map(([f, l]) => (
            <div key={f}>
              <label className="label">{l} *</label>
              <input type="text" className="input" value={form[f] as string} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Sex *</label>
            <select className="input" value={form.sex} onChange={e => setForm(p => ({ ...p, sex: e.target.value as any }))}>
              {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Relationship *</label>
            <select className="input" value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value as any }))}>
              {RELATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dateOfBirth ?? ''} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
