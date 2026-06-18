'use client';

import { useState } from 'react';
import { useLogin } from '@/hooks/useAuth';
import type { Metadata } from 'next';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  const { mutate: login, isPending, isError, error } = useLogin();

  const errorMsg = (() => {
    if (!isError) return null;
    const msg = (error as any)?.response?.data?.message;
    return Array.isArray(msg) ? msg[0] : msg || 'Login failed';
  })();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login({ email, password });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">HRMS</h1>
          <p className="text-blue-200 mt-1 text-sm">
            Human Resource Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-800">Sign in to continue</h2>
          <p className="text-sm text-slate-500 mt-0.5 mb-6">Internal access only</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="admin@hrms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                ⚠ {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary w-full justify-center py-2.5 mt-2 text-base"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Dev credentials hint */}
          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              Default credentials (development)
            </p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Admin &nbsp;&nbsp;→ admin@hrms.com / Admin@123</p>
              <p>HR &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ hr@hrms.com / Hr@123</p>
              <p>Accounts → accounts@hrms.com / Accounts@123</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
