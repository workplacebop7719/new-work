import { NextResponse, type NextRequest } from 'next/server';

/**
 * Content-Security-Policy — SEC-001, ARC-007.
 *
 * Deferred at CC-01 because a policy written against an empty shell would have
 * been wrong by CC-02. Now that the application has forms and server actions,
 * the policy is worth having and can be written against something real.
 *
 * A per-request nonce plus `strict-dynamic` is used rather than a host
 * allowlist, because an allowlist is only as good as the hosts on it — and this
 * application deliberately has none. The policy therefore states the intent
 * directly: nothing loads that we did not put here.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    // `strict-dynamic` lets a nonced script load its own chunks, which is what
    // the framework needs, while ignoring any host allowlist.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Next injects inline styles; 'unsafe-inline' for styles is a much smaller
    // exposure than for scripts, and removing it would mean forking the
    // framework's style handling. Recorded as an accepted risk.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // No third-party analytics, so no connect-src exemption. If one is ever
    // added it must come with a documented owner, purpose, consent category and
    // performance budget (ARC-007) — and this line is where that shows up.
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, which are served without scripts and do
    // not benefit from a per-request nonce.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
