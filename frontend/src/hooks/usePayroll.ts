import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PayrollRun, Payslip, PayrollSummary } from '@/types';

// ── Payroll runs ─────────────────────────────────────────────────────────────

export function usePayrollRuns() {
  return useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data } = await api.get('/payroll/runs');
      return data;
    },
  });
}

export function usePayrollRun(id: string) {
  return useQuery<PayrollRun>({
    queryKey: ['payroll-run', id],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/runs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePayrollPayslips(runId: string) {
  return useQuery<Payslip[]>({
    queryKey: ['payroll-payslips', runId],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/runs/${runId}/payslips`);
      return data;
    },
    enabled: !!runId,
  });
}

export function usePayrollSummary(runId: string) {
  return useQuery<PayrollSummary>({
    queryKey: ['payroll-summary', runId],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/runs/${runId}/summary`);
      return data;
    },
    enabled: !!runId,
  });
}

export function useRunPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { month: number; year: number }) => {
      const { data } = await api.post('/payroll/run', body);
      return data as PayrollRun;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-payslips'] });
      qc.invalidateQueries({ queryKey: ['payroll-summary'] });
    },
  });
}

export function useFinalizePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/payroll/runs/${id}/finalize`);
      return data as PayrollRun;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', id] });
    },
  });
}

export function useApprovePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/payroll/runs/${id}/approve`);
      return data as PayrollRun;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', id] });
    },
  });
}

export function useMarkPaidPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/payroll/runs/${id}/pay`);
      return data as PayrollRun;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', id] });
    },
  });
}

export function useDeletePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payroll/runs/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

// ── Payslips ─────────────────────────────────────────────────────────────────

export function usePayslip(id: string) {
  return useQuery<Payslip>({
    queryKey: ['payslip', id],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/payslips/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePayrollSiteCost(runId: string) {
  return useQuery<{
    allocations: any[];
    siteSummaries: Array<{
      siteId: string | null;
      siteName: string | null;
      count: number;
      totalGross: number;
      totalEmpPF: number;
      totalEmpESI: number;
      totalPT: number;
      totalEmplPF: number;
      totalEmplESI: number;
      totalEdli: number;
      totalEpfAdmin: number;
      totalCost: number;
    }>;
  }>({
    queryKey: ['payroll-site-cost', runId],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/runs/${runId}/site-cost`);
      return data;
    },
    enabled: !!runId,
  });
}

export function useUpdatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, ...body
    }: { id: string; tds?: number; penaltyDeduction?: number; advanceDeduction?: number }) => {
      const { data } = await api.patch(`/payroll/payslips/${id}`, body);
      return data as Payslip;
    },
    onSuccess: (ps) => {
      qc.invalidateQueries({ queryKey: ['payroll-payslips', ps.payrollRunId] });
      qc.invalidateQueries({ queryKey: ['payroll-summary', ps.payrollRunId] });
      qc.invalidateQueries({ queryKey: ['payslip', ps.id] });
    },
  });
}
