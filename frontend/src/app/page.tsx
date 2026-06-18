import { redirect } from 'next/navigation';

/**
 * Root route — just redirect.
 * The middleware handles auth: unauthenticated → /login, authenticated → here → /dashboard
 */
export default function RootPage() {
  redirect('/dashboard');
}
