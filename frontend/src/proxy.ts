import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that redirect to /dashboard when an authenticated user visits them. */
const AUTH_REDIRECT_PATHS = ['/login'];

/**
 * Routes that are fully public (no HR JWT required, no dashboard redirect).
 * /kiosk is the kiosk punch face — it uses its own kiosk token stored in localStorage.
 * /kiosk/setup is NOT listed here — it lives under the dashboard and requires HR auth.
 */
const PUBLIC_PATHS = ['/kiosk'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept API proxy calls — let them pass through to the NestJS backend
  if (pathname.startsWith('/api/')) return NextResponse.next();

  const token = request.cookies.get('hrms_token')?.value;

  // Fully public pages (kiosk punch face) — always allow through
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // Exception: /kiosk/setup DOES require HR auth — fall through to normal checks below
    if (!pathname.startsWith('/kiosk/setup')) return NextResponse.next();
  }

  const isLoginPage = AUTH_REDIRECT_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user → protected page: redirect to login
  if (!token && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user → login page: redirect to dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
