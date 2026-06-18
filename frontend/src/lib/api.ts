import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { TOKEN_KEY } from './auth';

/**
 * Central Axios instance.
 * All requests go to /api/* which Next.js rewrites to the NestJS backend.
 * This keeps the browser from ever needing the backend URL directly.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor — attach JWT ─────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove(TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
