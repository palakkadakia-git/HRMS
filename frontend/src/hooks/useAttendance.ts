import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Shift, Holiday, LeaveRecord, LeaveBalance,
  EmployeeLeaveBalance, MonthlyAttendance,
} from '@/types';

// ── Shifts ──────────────────────────────────────────────────────────────────

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/shifts');
      return data;
    },
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; shiftHours: number }) => {
      const { data } = await api.post('/attendance/shifts', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; shiftHours?: number }) => {
      const { data } = await api.patch(`/attendance/shifts/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/shifts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

// ── Holidays ────────────────────────────────────────────────────────────────

export function useHolidays(year: number, siteId?: string) {
  return useQuery<Holiday[]>({
    queryKey: ['holidays', year, siteId ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/holidays', {
        params: { year, ...(siteId ? { siteId } : {}) },
      });
      return data;
    },
    enabled: !!year,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; date: string; type: string; year: number; siteId?: string }) => {
      const { data } = await api.post('/attendance/holidays', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string; name?: string; date?: string; type?: string; year?: number; siteId?: string;
    }) => {
      const { data } = await api.patch(`/attendance/holidays/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/holidays/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

// ── Leave Records ────────────────────────────────────────────────────────────

export function useLeaveRecords(params: { employeeId: string; month?: number; year?: number }) {
  return useQuery<LeaveRecord[]>({
    queryKey: ['leave-records', params],
    queryFn: async () => {
      const { data } = await api.get('/attendance/leave-records', { params });
      return data;
    },
    enabled: !!params.employeeId,
  });
}

export function useCreateLeaveRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      employeeId: string; date: string; leaveType: string;
      days: number; remarks?: string;
    }) => {
      const { data } = await api.post('/attendance/leave-records', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-records'] }),
  });
}

export function useDeleteLeaveRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/leave-records/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-records'] }),
  });
}

// ── Leave Balances ───────────────────────────────────────────────────────────

export function useAllLeaveBalances(year: number) {
  return useQuery<EmployeeLeaveBalance[]>({
    queryKey: ['leave-balances', year],
    queryFn: async () => {
      const { data } = await api.get('/attendance/leave-balances', { params: { year } });
      return data;
    },
    enabled: !!year,
  });
}

export function useLeaveBalance(employeeId: string, year: number) {
  return useQuery<LeaveBalance>({
    queryKey: ['leave-balance', employeeId, year],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/leave-balances/${employeeId}`, { params: { year } });
      return data;
    },
    enabled: !!employeeId && !!year,
  });
}

export function useAllocateLeaves() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const { data } = await api.post('/attendance/leave-balances/allocate', { year });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balances'] }),
  });
}

export function useAccruePL() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data } = await api.post('/attendance/leave-balances/accrue-pl', { month, year });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balances'] }),
  });
}

// ── Monthly Attendance ───────────────────────────────────────────────────────

export function useMonthlyAttendance(month: number, year: number, employeeId?: string) {
  return useQuery<MonthlyAttendance[]>({
    queryKey: ['monthly-attendance', month, year, employeeId],
    queryFn: async () => {
      const { data } = await api.get('/attendance/monthly', {
        params: { month, year, ...(employeeId ? { employeeId } : {}) },
      });
      return data;
    },
    enabled: !!month && !!year,
  });
}

export function useUpdateMonthlyAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, ...body
    }: { id: string; presentDays?: number; lopDays?: number; otHours?: number }) => {
      const { data } = await api.patch(`/attendance/monthly/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-attendance'] }),
  });
}

export function useRunAutoFill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data } = await api.post('/attendance/autofill', { month, year });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-logs'] });
    },
  });
}

// ── Excel Export ─────────────────────────────────────────────────────────────

/**
 * Downloads the attendance Excel for the given month/year.
 * Returns a function — call it directly (not a useMutation, since it triggers
 * a browser download via a Blob URL rather than updating server state).
 */
export function useExportAttendanceExcel() {
  return async (month: number, year: number) => {
    const res = await api.get('/attendance/export', {
      params: { month, year },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

// ── Excel Import ─────────────────────────────────────────────────────────────

export function useImportAttendanceExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year, file }: { month: number; year: number; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/attendance/import', form, {
        params:  { month, year },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { updated: number; skipped: number; errors: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-attendance'] });
    },
  });
}
