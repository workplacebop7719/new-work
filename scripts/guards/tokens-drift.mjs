/**
 * BRD-001 — the committed tokens.css must be exactly what tokens.ts renders.
 *
 * Without this, a hand-edit to the stylesheet silently escapes the contrast
 * tests, which only ever see the TypeScript values.
 */
import { spawnSync } from 'node:child_process';
import { ROOT, report } from './lib.mjs';

const result = spawnSync(
  'pnpm',
  ['--filter', '@northstar/ui', 'exec', 'tsx', 'src/tokens/emit-css.ts', '--check'],
  { cwd: ROOT, encoding: 'utf8' },
);

const failures =
  result.status === 0
    ? []
    : [(result.stderr || result.stdout || 'tokens:css --check failed').trim()];

process.exit(report('tokens.css matches tokens.ts (BRD-001)', failures) ? 0 : 1);
