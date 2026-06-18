'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { MinimumWage, CreateMinimumWageDto } from '@/types';

const KEY = (siteId?: string, active?: boolean) =>
  ['minimum-wages', siteId ?? 'all', active ? 'active' : 'all'] as const;

export function useMinimumWages(siteId?: string, activeOnly = false) {
  return useQuery<MinimumWage[]>({
    queryKey: KEY(siteId, activeOnly),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (siteId)     params.siteId = siteId;
      if (activeOnly) params.active = 'true';
      const { data } = await api.get('/minimum-wages', { params });
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCreateMinimumWage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMinimumWageDto) => {
      const { data } = await api.post('/minimum-wages', dto);
      return data as MinimumWage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['minimum-wages'] });
      toast.success('Minimum wage saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });
}

export function useDeleteMinimumWage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/minimum-wages/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['minimum-wages'] });
      toast.success('Entry deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete'),
  });
}
