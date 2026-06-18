'use client';

import Link from 'next/link';
import { useState } from 'react';
import { clsx } from 'clsx';
import type { Employee, EmpStatus } from '@/types';
import { useUpdateStatus, useDeleteEmployee } from '@/hooks/useEmployees';
import Modal from '@/components/ui/Modal';

const STATUS_STYLE: Record<EmpStatus, string> = {
  ACTIVE:        'badge-green',
  PROBATION:     'badge-yellow',
  NOTICE_PERIOD: 'badge-red',
  INACTIVE:      'badge-gray',
};

const STATUS_LABEL: Record<EmpStatus, string> = {
  ACTIVE: 'Active', PROBATION: 'Probation', NOTICE_PERIOD: 'Notice Period', INACTIVE: 'Inactive',
};

const TYPE_LABEL: Record<string, string> = {
  INTERN: 'Intern', ON_ROLLS: 'On Rolls', ON_CONTRACT: 'On Contract',
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

interface Props {
  employees: Employee[];
  isLoading: boolean;
}

export default function EmployeeTable({ employees, isLoading }: Props) {
  const [statusModal, setStatusModal] = useState<Employee | null>(null);
  const [newStatus, setNewStatus]     = useState<EmpStatus>('ACTIVE');
  const [exitDate, setExitDate]       = useState('');

  const updateStatus = useUpdateStatus(statusModal?.id ?? '');
  const deleteEmp    = useDeleteEmployee();

  function openStatusModal(emp: Employee) {
    setStatusModal(emp);
    setNewStatus(emp.status);
    setExitDate('');
  }

  async function handleStatusSave() {
    if (!statusModal) return;
    await updateStatus.mutateAsync({ status: newStatus, ...(exitDate && { dateOfExit: exitDate }) });
    setStatusModal(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mr-3" />
        Loading employees…
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-4xl mb-3">👥</div>
        <p className="font-medium text-slate-600">No employees found</p>
        <p className="text-sm mt-1">Try adjusting filters or add a new employee</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Employee', 'Code', 'Designation', 'Type', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="tbl-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="tbl-row">
                <td className="tbl-cell">
                  <div className="flex items-center gap-3">
                    {emp.photoPath ? (
                      <img src={emp.photoPath} alt={emp.firstName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                        <Initials name={`${emp.firstName} ${emp.lastName}`} />
                      </div>
                    )}
                    <div>
                      <Link href={`/employees/${emp.id}`} className="font-semibold text-slate-800 hover:text-primary">
                        {emp.firstName} {emp.lastName}
                      </Link>
                      {emp.isBlacklisted && (
                        <span className="ml-2 badge badge-red text-[10px]">Blacklisted</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="tbl-cell">
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{emp.employeeCode}</code>
                </td>
                <td className="tbl-cell text-slate-600">{emp.designation ?? '—'}</td>
                <td className="tbl-cell">
                  <span className="badge badge-blue">{TYPE_LABEL[emp.type]}</span>
                </td>
                <td className="tbl-cell">
                  <span className={clsx('badge', STATUS_STYLE[emp.status])}>
                    {STATUS_LABEL[emp.status]}
                  </span>
                </td>
                <td className="tbl-cell text-slate-500 text-xs">
                  {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="tbl-cell">
                  <div className="flex gap-1">
                    <Link href={`/employees/${emp.id}`} className="btn btn-outline btn-sm">View</Link>
                    <Link href={`/employees/${emp.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                    <button
                      onClick={() => openStatusModal(emp)}
                      className="btn btn-outline btn-sm"
                    >
                      Status
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Change Modal */}
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Change Status — ${statusModal?.firstName} ${statusModal?.lastName}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setStatusModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleStatusSave} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value as EmpStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="NOTICE_PERIOD">Notice Period</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          {(newStatus === 'INACTIVE' || newStatus === 'NOTICE_PERIOD') && (
            <div>
              <label className="label">Date of Exit</label>
              <input type="date" className="input" value={exitDate} onChange={e => setExitDate(e.target.value)} />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
