'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import EmployeeForm from '@/components/employees/EmployeeForm';
import { useEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { usePermissions } from '@/hooks/usePermissions';
import type { CreateEmployeeDto } from '@/types';

/** Trim ISO datetime strings to YYYY-MM-DD for <input type="date"> */
function toDateValue(v?: string | null): string {
  return v ? v.split('T')[0] : '';
}

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: emp, isLoading, error } = useEmployee(id);
  const update = useUpdateEmployee(id);
  const { can, isLoading: permLoading } = usePermissions();

  async function handleSubmit(data: CreateEmployeeDto) {
    await update.mutateAsync(data);
    // onSuccess (passed below) handles navigation after doc uploads finish
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (isLoading || permLoading) {
    return (
      <>
        <Header title="Edit Employee" />
        <main className="flex-1 p-6 flex items-center justify-center text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mr-3" />
          Loading…
        </main>
      </>
    );
  }

  /* ── Access denied ───────────────────────────────────────── */
  if (!can('employees', 'update')) {
    return (
      <>
        <Header title="Access Denied" />
        <main className="flex-1 p-6 text-center">
          <div className="py-20">
            <p className="text-slate-500 mb-4">You don't have permission to edit employees.</p>
            <Link href={`/employees/${id}`} className="btn btn-outline btn-sm">← Back to Employee</Link>
          </div>
        </main>
      </>
    );
  }

  /* ── Not found ────────────────────────────────────────────── */
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

  /* ── Normalise dates for <input type="date"> ──────────────── */
  const initialData = {
    ...emp,
    dateOfBirth:   toDateValue(emp.dateOfBirth),
    dateOfJoining: toDateValue(emp.dateOfJoining),
    dateOfExit:    toDateValue(emp.dateOfExit),
  };

  return (
    <>
      <Header
        title={`Edit — ${emp.firstName} ${emp.lastName}`}
        subtitle={emp.employeeCode}
        actions={
          <div className="flex gap-2">
            <Link href={`/employees/${emp.id}`} className="btn btn-outline btn-sm">← Cancel</Link>
          </div>
        }
      />

      <main className="flex-1 p-6">
        <div className="card p-6">
          <EmployeeForm
            initial={initialData}
            onSubmit={handleSubmit}
            onSuccess={() => router.push(`/employees/${emp.id}`)}
            isSubmitting={update.isPending}
            submitLabel="Save Changes"
          />
        </div>
      </main>
    </>
  );
}
