import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/auth/cookie-name';
import { isSafeReturnTo } from '@/auth/return-url';

/**
 * Route protection for the member portal (PRD §28, §31, §32).
 *
 * This is a CHEAP GATE, not the authorisation boundary. Middleware runs on the
 * edge runtime, where we cannot reach the database or the auth provider
 * without a network round trip on every request — so all it does is check
 * whether a session cookie is present and bounce anonymous visitors to sign
 * in with their destination remembered.
 *
 * The real checks happen further in, and must never be removed on the
 * assumption that this file already did them:
 *
 *   - src/app/app/layout.tsx resolves the cookie to an actual session and
 *     redirects if it does not resolve. A forged or expired cookie gets past
 *     middleware and is stopped there.
 *   - PostgreSQL row level security decides what any given customer can read
 *     or write, and holds even if both layers above are wrong (§48).
 *
 * A cookie's presence proves nothing. It is only ever used here to decide
 * whether to bother rendering the portal at all.
 */
const PROTECTED_PREFIX = '/app';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const destination = `${pathname}${search}`;
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  // Validate our own value before echoing it back into a redirect.
  if (isSafeReturnTo(destination)) url.searchParams.set('returnTo', destination);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/app/:path*'],
};
