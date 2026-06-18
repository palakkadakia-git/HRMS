'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Dependent, CreateDependentDto } from '@/types';

const KEY = (empId: string) => ['dependents', empId] as const;

export function useDependents(employeeId: string) {
  return useQuery<Dependent[]>({
    queryKey: KEY(employeeId),
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/dependents`);
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useCreateDependent(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDependentDto) =>
      api.post<Dependent>(`/employees/${employeeId}/dependents`, dto).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY(employeeId) }); toast.success('Dependent added'); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed to add dependent'),
  });
}

export function useUpdateDependent(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateDependentDto> }) =>
      api.put(`/employees/${employeeId}/dependents/${id}`, dto).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY(employeeId) }); toast.success('Dependent updated'); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed to update dependent'),
  });
}

export function useDeleteDependent(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) => api.delete(`/employees/${employeeId}/dependents/${depId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY(employeeId) }); toast.success('Dependent removed'); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove'),
  });
}
