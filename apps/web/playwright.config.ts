import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

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
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
    {
      // ARC-006: critical public pages must render useful primary content
      // without client-side JavaScript. Asserted, not assumed.
      name: 'no-javascript',
      use: { ...devices['Desktop Chrome'], launchOptions, javaScriptEnabled: false },
      testMatch: /no-javascript\.spec\.ts|qualifier-no-js\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:3000/en',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
