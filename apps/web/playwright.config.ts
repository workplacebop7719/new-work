import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Rate-limit counters live in fixed hourly windows and persist across runs
 * (Q-27). Without a per-run component in the client identifier, a second full
 * suite inside the same hour would inherit the first run's consumed budget and
 * start failing in a way that looks like a product bug. The projects also
 * differ from each other so they cannot exhaust one another in parallel.
 */
const RUN = randomUUID();
const clientAddress = (project: string) => `198.51.100.${project}-${RUN}`;

/**
 * Some environments (CI images, this remote container) ship a preinstalled
 * Chromium whose build number does not match the pinned @playwright/test.
 * Point at it when it exists rather than downloading a second copy.
 */
const PREINSTALLED_CHROMIUM = process.env['CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(PREINSTALLED_CHROMIUM)
  ? { executablePath: PREINSTALLED_CHROMIUM }
  : {};

/**
 * ARC-005 requires targets to hold "separately to representative mobile and
 * desktop populations", so journeys run on both rather than desktop only.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    // Exercises the real x-forwarded-for path rather than the 'unknown' fallback.
    extraHTTPHeaders: { 'x-forwarded-for': clientAddress('1') },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions, extraHTTPHeaders: { 'x-forwarded-for': clientAddress('10') } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], launchOptions, extraHTTPHeaders: { 'x-forwarded-for': clientAddress('20') } },
    },
    {
      // ARC-006: critical public pages must render useful primary content
      // without client-side JavaScript. Asserted, not assumed.
      name: 'no-javascript',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions,
        javaScriptEnabled: false,
        extraHTTPHeaders: { 'x-forwarded-for': clientAddress('30') },
      },
      testMatch: /no-javascript\.spec\.ts|qualifier-no-js\.spec\.ts|identity-no-js\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:3000/en',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
