'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type AppModule  = 'employees' | 'attendance' | 'leave' | 'payroll' | 'reports' | 'settings' | 'kiosk';
export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface PermissionRow {
  role:      string;
  module:    AppModule;
  canCreate: boolean;
  canRead:   boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// ── Current user's permissions ────────────────────────────────────────────────

/**
 * Returns a `can(module, action)` helper based on the authenticated user's
 * role permissions. ADMIN always returns true (backend returns a full-access
 * synthetic matrix for ADMIN).
 *
 * Usage:
 *   const { can } = usePermissions();
 *   if (!can('employees', 'delete')) return null;
 */
export function usePermissions() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['permissions/me'],
    queryFn:  async () => {
      const { data } = await api.get<PermissionRow[]>('/permissions/me');
      return data;
    },
    staleTime: 5 * 60_000,   // 5 min — mirrors backend in-memory TTL
  });

  const can = useCallback(
    (module: AppModule, action: CrudAction): boolean => {
      if (isLoading) return false;
      const row = rows.find(r => r.module === module);
      if (!row) return false;
      const key = `can${action.charAt(0).toUpperCase() + action.slice(1)}` as keyof PermissionRow;
      return row[key] as boolean;
    },
    [rows, isLoading],
  );

  return { can, isLoading, rows };
}

// ── Full matrix (Settings → Access Control tab) ───────────────────────────────

export function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions/all'],
    queryFn:  async () => {
      const { data } = await api.get<PermissionRow[]>('/permissions');
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: PermissionRow) => {
      const { data } = await api.put(`/permissions/${row.role}/${row.module}`, {
        canCreate: row.canCreate,
        canRead:   row.canRead,
        canUpdate: row.canUpdate,
        canDelete: row.canDelete,
      });
      return data as PermissionRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions/all'] });
      qc.invalidateQueries({ queryKey: ['permissions/me'] });
    },
  });
}
