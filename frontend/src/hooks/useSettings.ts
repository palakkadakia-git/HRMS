'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CompanySettings } from '@/types';

export function useCompanySettings() {
  return useQuery<CompanySettings>({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<CompanySettings>) => {
      const { data } = await api.put('/settings', body);
      return data as CompanySettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/settings/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { logoPath: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }),
  });
}
