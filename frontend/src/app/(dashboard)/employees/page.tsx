'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import EmployeeTable from '@/components/employees/EmployeeTable';
import BulkUploadModal from '@/components/employees/BulkUploadModal';
import Pagination from '@/components/ui/Pagination';
import { useEmployees } from '@/hooks/useEmployees';
import { usePermissions } from '@/hooks/usePermissions';
import { STATUS_OPTIONS, TYPE_OPTIONS } from '@/types';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type,   setType]   = useState('');
  const [page,   setPage]   = useState(1);
  const [bulk,   setBulk]   = useState(false);

  const { data, isLoading } = useEmployees({ search, status, type, page, limit: 20 });
  const { can } = usePermissions();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <>
      <Header
        title="Employee Master"
        subtitle={data ? `${data.total} employee${data.total !== 1 ? 's' : ''}` : ''}
        actions={
          <div className="flex gap-2">
            {can('employees', 'create') && (
              <button onClick={() => setBulk(true)} className="btn btn-outline btn-sm">
                📊 Bulk Upload
              </button>
            )}
            {can('employees', 'create') && (
              <Link href="/employees/new" className="btn btn-primary btn-sm">
                + Add Employee
              </Link>
            )}
          </div>
        }
      />

      <main className="flex-1 p-6">
        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Search by name, code, PAN…"
            value={search}
            onChange={handleSearch}
            className="input w-64"
          />
          <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="input w-44" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || status || type) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus(''); setType(''); setPage(1); }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card">
          <EmployeeTable employees={data?.data ?? []} isLoading={isLoading} />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>

      <BulkUploadModal open={bulk} onClose={() => setBulk(false)} />
    </>
  );
}
