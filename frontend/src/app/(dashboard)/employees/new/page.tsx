'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import EmployeeForm from '@/components/employees/EmployeeForm';
import { useCreateEmployee } from '@/hooks/useEmployees';
import { usePermissions } from '@/hooks/usePermissions';
import type { CreateEmployeeDto } from '@/types';

export default function NewEmployeePage() {
  const router = useRouter();
  const create = useCreateEmployee();
  const { can, isLoading: permLoading } = usePermissions();

  async function handleSubmit(data: CreateEmployeeDto) {
    const emp = await create.mutateAsync(data);
    // Navigate to detail page so user can upload documents
    router.push(`/employees/${emp.id}`);
  }

  if (permLoading) {
    return (
      <>
        <Header title="Add Employee" />
        <main className="flex-1 p-6 flex items-center justify-center text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mr-3" />
          Loading…
        </main>
      </>
    );
  }

  if (!can('employees', 'create')) {
    return (
      <>
        <Header title="Access Denied" />
        <main className="flex-1 p-6 text-center">
          <div className="py-20">
            <p className="text-slate-500 mb-4">You don't have permission to create employees.</p>
            <Link href="/employees" className="btn btn-outline btn-sm">← Back to Employees</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Add Employee" subtitle="Create a new employee record" />
      <main className="flex-1 p-6">
        <div className="card p-6">
          <EmployeeForm
            onSubmit={handleSubmit}
            isSubmitting={create.isPending}
            submitLabel="Create Employee"
          />
        </div>
      </main>
    </>
  );
}
