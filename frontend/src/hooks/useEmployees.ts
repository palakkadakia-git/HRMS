'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Employee, EmployeeListResponse, CreateEmployeeDto, UpdateEmployeeDto, EmpStatus } from '@/types';

const KEYS = {
  all:  (p: any) => ['employees', p] as const,
  one:  (id: string) => ['employees', id] as const,
};

// ── List ──────────────────────────────────────────────────
export function useEmployees(params: {
  search?: string; status?: string; type?: string; page?: number; limit?: number;
} = {}) {
  return useQuery<EmployeeListResponse>({
    queryKey: KEYS.all(params),
    queryFn: async () => {
      const { data } = await api.get('/employees', { params });
      return data;
    },
  });
}

// ── Single ────────────────────────────────────────────────
export function useEmployee(id: string) {
  return useQuery<Employee>({
    queryKey: KEYS.one(id),
    queryFn: async () => { const { data } = await api.get(`/employees/${id}`); return data; },
    enabled: !!id,
  });
}

// ── Create ────────────────────────────────────────────────
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => api.post<Employee>('/employees', dto).then(r => r.data),
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Employee ${emp.employeeCode} created successfully`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create employee'),
  });
}

// ── Update ────────────────────────────────────────────────
export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateEmployeeDto) => api.put<Employee>(`/employees/${id}`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: KEYS.one(id) });
      toast.success('Employee updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update employee'),
  });
}

// ── Status change ──────────────────────────────────────────
export function useUpdateStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { status: EmpStatus; dateOfExit?: string }) =>
      api.patch(`/employees/${id}/status`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: KEYS.one(id) });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update status'),
  });
}

// ── Document upload ────────────────────────────────────────
export function useUploadDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, file }: { docType: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/employees/${employeeId}/documents/${docType}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.one(employeeId) });
      toast.success('Document uploaded');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Upload failed'),
  });
}

// ── Bulk upload ────────────────────────────────────────────
export function useBulkUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/employees/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`${result.success} employees added (${result.failed} failed)`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Bulk upload failed'),
  });
}

// ── Delete ────────────────────────────────────────────────
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete'),
  });
}
