import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Penalty, PenaltyStatus, CreatePenaltyDto, CancelPenaltyDto } from '@/types';

export function usePenalties(filters?: {
  employeeId?: string;
  month?:      number;
  year?:       number;
  status?:     PenaltyStatus | '';
}) {
  const params: Record<string, string> = {};
  if (filters?.employeeId)            params.employeeId = filters.employeeId;
  if (filters?.month)                 params.month      = String(filters.month);
  if (filters?.year)                  params.year       = String(filters.year);
  if (filters?.status)                params.status     = filters.status;

  return useQuery<Penalty[]>({
    queryKey: ['penalties', params],
    queryFn: async () => {
      const { data } = await api.get('/penalties', { params });
      return data;
    },
  });
}

export function useStaffEmployees() {
  return useQuery<{ id: string; employeeCode: string; firstName: string; lastName: string; designation?: string }[]>({
    queryKey: ['penalties-staff'],
    queryFn: async () => {
      const { data } = await api.get('/penalties/staff');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreatePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePenaltyDto) => api.post('/penalties', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['penalties'] }),
  });
}

export function useCancelPenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelPenaltyDto }) =>
      api.patch(`/penalties/${id}/cancel`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['penalties'] }),
  });
}
