import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; Next compiles them in place so
  // there is no separate build step to forget (ADR-0001).
  transpilePackages: [
    '@northstar/ui',
    '@northstar/domain',
    '@northstar/auth',
    '@northstar/observability',
    '@northstar/integrations',
    '@northstar/db',
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // SEC-001 baseline. Tightened with a nonce-based CSP in CC-02, once
          // there is a real page to measure the policy against.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // ARC-007: no third-party script may load without a documented owner,
          // purpose, consent category and performance budget.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default config;
