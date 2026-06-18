/**
 * Hooks for the kiosk — use the kiosk JWT stored in localStorage,
 * NOT the HR cookie. The kiosk endpoints are @Public() on the backend.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { KioskEmployee, KioskSite } from '@/types';

export const KIOSK_TOKEN_KEY = 'hrms_kiosk_token';

function kioskApi() {
  const token = localStorage.getItem(KIOSK_TOKEN_KEY);
  return axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 10_000,
  });
}

/** HR: activate a kiosk for a site — uses HR JWT from api.ts */
export function useSetupKiosk() {
  // This mutation is called from the kiosk setup page (HR is logged in)
  // so we use the normal api import to carry the HR cookie auth.
  return useMutation({
    mutationFn: async (body: { siteId: string; lat: number; lng: number }) => {
      // Import api lazily to use HR auth
      const { default: api } = await import('@/lib/api');
      const { data } = await api.post('/kiosk/session', body);
      return data as { kioskToken: string; site: KioskSite };
    },
  });
}

/** Kiosk: fetch employees + face descriptors for the kiosk's site */
export function useKioskEmployees(enabled = true) {
  return useQuery<KioskEmployee[]>({
    queryKey: ['kiosk-employees'],
    queryFn: async () => {
      const { data } = await kioskApi().get('/kiosk/employees');
      return data;
    },
    enabled,
    staleTime: 0,              // always considered stale → refetches on focus/mount
    refetchInterval: 30_000,   // poll every 30 s so new enrolments appear quickly
    refetchOnMount: 'always',  // always fetch fresh when the component mounts
    refetchOnWindowFocus: true,
  });
}

/** Kiosk: get site info (name for display in header) */
export function useKioskSite(enabled = true) {
  return useQuery<KioskSite>({
    queryKey: ['kiosk-site'],
    queryFn: async () => {
      const { data } = await kioskApi().get('/kiosk/site');
      return data;
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/** Kiosk: record a punch (called after face is matched client-side) */
export function useKioskPunch() {
  return useMutation({
    mutationFn: async (body: { employeeId: string; lat?: number; lng?: number }) => {
      const { data } = await kioskApi().post('/kiosk/punch', body);
      return data as {
        action: 'PUNCH_IN' | 'PUNCH_OUT';
        time: string;
        employee: { id: string; name: string };
      };
    },
  });
}
