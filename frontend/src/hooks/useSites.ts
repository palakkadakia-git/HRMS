'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Site } from '@/types';

export function useSites() {
  return useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await api.get('/sites');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Site>) => {
      const { data } = await api.post('/sites', body);
      return data as Site;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Site> & { id: string }) => {
      const { data } = await api.patch(`/sites/${id}`, body);
      return data as Site;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sites/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}
