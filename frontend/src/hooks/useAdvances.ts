import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  EmployeeAdvance, AdvanceType, AdvanceStatus,
  CreateAdvanceDto, BulkWeeklyAdvanceDto,
} from '@/types';

// ── List ──────────────────────────────────────────────────────────────────────

export function useAdvances(filters?: {
  employeeId?: string;
  type?:       AdvanceType | '';
  status?:     AdvanceStatus | '';
  siteId?:     string;
}) {
  const params: Record<string, string> = {};
  if (filters?.employeeId) params.employeeId = filters.employeeId;
  if (filters?.type)       params.type       = filters.type;
  if (filters?.status)     params.status     = filters.status;
  if (filters?.siteId)     params.siteId     = filters.siteId;

  return useQuery<EmployeeAdvance[]>({
    queryKey: ['advances', params],
    queryFn: async () => {
      const { data } = await api.get('/advances', { params });
      return data;
    },
  });
}

// ── Create single advance ─────────────────────────────────────────────────────

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAdvanceDto) => api.post('/advances', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['advances'] }),
  });
}

// ── Bulk weekly advances ──────────────────────────────────────────────────────

export function useBulkWeeklyAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkWeeklyAdvanceDto) => api.post('/advances/bulk-weekly', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['advances'] }),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/advances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['advances'] }),
  });
}
