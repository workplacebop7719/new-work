/**
 * Repository guards.
 *
 * These enforce the PRD's non-negotiable engineering constraints (§27) as build
 * failures rather than review conventions. They run as part of `pnpm lint` and
 * again in CI.
 */
import { spawnSync } from 'node:child_process';

const GUARDS = [
  ['prohibited-claims.mjs', 'CNT-008, ENG-008'],
  ['regulatory-hardcoding.mjs', 'ENG-007'],
  ['migration-notes.mjs', 'ENG-006'],
  ['tenant-columns.mjs', 'DAT-002'],
  ['domain-purity.mjs', 'ARC-002, ENG-001'],
  ['tokens-drift.mjs', 'BRD-001'],
];

console.log('Repository guards (PRD §27 non-negotiable constraints)');

let failed = 0;
for (const [script] of GUARDS) {
  const result = spawnSync(process.execPath, [new URL(script, import.meta.url).pathname], {
    stdio: 'inherit',
  });
  if (result.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} guard(s) failed. These are PRD constraints, not style preferences —`);
  console.error('fix the code, or add the documented annotation and explain it in the pull request.');
  process.exit(1);
}
console.log('All guards passed.');
