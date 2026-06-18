import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AttendanceLog } from '@/types';

interface QueryParams {
  siteId?: string;
  employeeId?: string;
  date?: string;    // YYYY-MM-DD
  month?: number;
  year?: number;
}

export function useAttendanceLogs(params: QueryParams = {}) {
  return useQuery<AttendanceLog[]>({
    queryKey: ['attendance-logs', params],
    queryFn: async () => {
      const { data } = await api.get('/attendance-logs', { params });
      return data;
    },
  });
}

export function useMonthlySummary(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['attendance-summary', employeeId, month, year],
    queryFn: async () => {
      const { data } = await api.get('/attendance-logs/summary', {
        params: { employeeId, month, year },
      });
      return data;
    },
    enabled: !!employeeId && !!month && !!year,
  });
}

export function useUpdateAttendanceLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; punchIn?: string; punchOut?: string; status?: string; remarks?: string }) => {
      const { data } = await api.patch(`/attendance-logs/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-logs'] }),
  });
}
