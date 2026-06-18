'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { SalaryRevision, SalaryComponents, CreateSalaryRevisionDto } from '@/types';

const KEYS = {
  all:    (empId: string) => ['salary-revisions', empId] as const,
  active: (empId: string) => ['salary-revisions', empId, 'active'] as const,
};

// ── All revisions for an employee ─────────────────────────
export function useSalaryRevisions(employeeId: string) {
  return useQuery<SalaryRevision[]>({
    queryKey: KEYS.all(employeeId),
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/salary-revisions`);
      return data;
    },
    enabled: !!employeeId,
  });
}

// ── Active (current) revision ──────────────────────────────
export function useActiveSalaryRevision(employeeId: string) {
  return useQuery<SalaryRevision | null>({
    queryKey: KEYS.active(employeeId),
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/salary-revisions/active`);
      return data;
    },
    enabled: !!employeeId,
  });
}

// ── Preview breakdown (no save) ────────────────────────────
export function useSalaryPreview(employeeId: string, grossSalary: number) {
  return useQuery<SalaryComponents>({
    queryKey: ['salary-preview', employeeId, grossSalary],
    queryFn: async () => {
      const { data } = await api.get(
        `/employees/${employeeId}/salary-revisions/preview`,
        { params: { grossSalary } },
      );
      return data;
    },
    enabled: !!employeeId && grossSalary > 0,
    staleTime: 60_000,  // cache preview for 1 min
  });
}

// ── Create / Revise ───────────────────────────────────────
export function useCreateSalaryRevision(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSalaryRevisionDto) =>
      api.post<SalaryRevision>(`/employees/${employeeId}/salary-revisions`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(employeeId) });
      qc.invalidateQueries({ queryKey: KEYS.active(employeeId) });
      qc.invalidateQueries({ queryKey: ['employees', employeeId] });
      toast.success('Salary revision saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save revision'),
  });
}
