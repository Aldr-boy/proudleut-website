import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const { pathname } = request.nextUrl;

  // Admin route protection.
  // Cookie value is compared directly against ADMIN_SECRET (env var, server-side only).
  // For production: upgrade to HMAC-signed cookie (e.g. via jose) or Supabase Auth.
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = request.cookies.get(ADMIN_COOKIE);
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || !session || session.value !== adminSecret) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
