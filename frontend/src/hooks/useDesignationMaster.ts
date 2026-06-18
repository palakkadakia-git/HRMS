'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DesignationMaster, SkillLevel } from '@/types';

export function useDesignationMaster() {
  return useQuery<DesignationMaster[]>({
    queryKey: ['designation-master'],
    queryFn: async () => {
      const { data } = await api.get('/designation-master');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Returns just the list of designation strings for <datalist> / autocomplete */
export function useDesignationNames(): string[] {
  const { data = [] } = useDesignationMaster();
  return data.map(d => d.designation);
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { designation: string; skillLevel: SkillLevel }) => {
      const { data } = await api.post('/designation-master', body);
      return data as DesignationMaster;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designation-master'] }),
  });
}

export function useUpdateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; designation: string; skillLevel: SkillLevel }) => {
      const { data } = await api.patch(`/designation-master/${id}`, body);
      return data as DesignationMaster;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designation-master'] }),
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/designation-master/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designation-master'] }),
  });
}

export interface DesignationBulkResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; designation: string; error: string }[];
}

export function useBulkUploadDesignations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<DesignationBulkResult> => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/designation-master/bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designation-master'] }),
  });
}
