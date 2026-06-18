'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { login as loginFn, logout as logoutFn, isAuthenticated } from '@/lib/auth';
import type { User } from '@/types';

// ── Current user ─────────────────────────────────────────

export function useMe() {
  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/auth/me');
      return data;
    },
    // Only fetch if a token exists (avoids unnecessary 401s)
    enabled: isAuthenticated(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Login ─────────────────────────────────────────────────

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginFn(email, password),

    onSuccess: (data) => {
      // Seed the cache so the first render of Sidebar has user data instantly
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    },

    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });
}

// ── Logout ────────────────────────────────────────────────

export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.clear(); // Wipe all cached queries
    logoutFn();          // Remove cookie + redirect
  };
}
