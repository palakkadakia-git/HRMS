import Cookies from 'js-cookie';
import api from './api';
import type { AuthResponse } from '@/types';

export const TOKEN_KEY = 'hrms_token';

/** Exchange credentials for a JWT and persist it in a cookie. */
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  // Store token in a cookie (accessible by the middleware for SSR auth checks)
  Cookies.set(TOKEN_KEY, data.accessToken, {
    expires: 7,        // 7 days, matches JWT expiry
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  return data;
}

/** Clear the token and redirect to the login page. */
export function logout() {
  Cookies.remove(TOKEN_KEY);
  window.location.href = '/login';
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!Cookies.get(TOKEN_KEY);
}
