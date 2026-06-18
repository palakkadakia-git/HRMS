'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { EmployeeSite } from '@/types';

// ── Fetch all site assignments for an employee ────────────
export function useEmployeeSites(employeeId: string) {
  return useQuery<EmployeeSite[]>({
    queryKey: ['employee-sites', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/sites`);
      return data;
    },
    enabled: !!employeeId,
  });
}

// ── Add a site assignment ─────────────────────────────────
export function useAddEmployeeSite(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { siteId: string; isPrimary?: boolean; startDate?: string }) => {
      const { data } = await api.post(`/employees/${employeeId}/sites`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-sites', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ── Remove a site assignment ──────────────────────────────
export function useRemoveEmployeeSite(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) => {
      const { data } = await api.delete(`/employees/${employeeId}/sites/${siteId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-sites', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ── Set primary site ──────────────────────────────────────
export function useSetPrimaryEmployeeSite(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) => {
      const { data } = await api.patch(`/employees/${employeeId}/sites/primary`, { siteId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-sites', employeeId] });
    },
  });
}
