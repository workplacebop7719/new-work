#!/usr/bin/env node
/**
 * A `'use server'` file may only export async functions.
 *
 * Everything else about such a file is fine: it typechecks, it lints, the
 * tests pass, `next dev` serves it. The failure appears only in a production
 * build, as "A 'use server' file can only export async functions, found
 * object" — with no file name in the message and a stack full of webpack
 * chunk ids.
 *
 * That has cost this codebase three separate debugging sessions:
 * DELETE_CONFIRMATION, isPlausibleToken, and IDLE. Each was a one-line
 * constant put in the obvious place beside the code that used it.
 *
 * So the guard is here rather than in anybody's memory. It reads the source
 * rather than the compiled output, so it fails in a second instead of after a
 * two-minute build.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      yield path;
    }
  }
}

/**
 * Exports that are allowed regardless.
 *
 * `export type` and `export interface` are erased before the bundler sees
 * them, so they are not exports at runtime at all. `export * from` and
 * `export { x } from` re-export somebody else's module, which this guard
 * cannot follow and which Next resolves separately.
 */
const TYPE_ONLY = /^export\s+(type|interface)\s/;
const RE_EXPORT = /^export\s+(\*|\{[^}]*\})\s+from\s/;
const ASYNC_FUNCTION = /^export\s+async\s+function\s/;
const DEFAULT_ASYNC = /^export\s+default\s+async\s+function\s/;

const problems = [];

for (const path of sourceFiles(SRC)) {
  const source = readFileSync(path, 'utf8');

  // The directive has to be the first statement to count.
  const firstCode = source
    .split('\n')
    .find((line) => line.trim() !== '' && !line.trim().startsWith('//'));
  if (!/^['"]use server['"]/.test(firstCode ?? '')) continue;

  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('export')) return;
    if (TYPE_ONLY.test(trimmed) || RE_EXPORT.test(trimmed)) return;
    if (ASYNC_FUNCTION.test(trimmed) || DEFAULT_ASYNC.test(trimmed)) return;

    problems.push({
      file: relative(root, path),
      line: index + 1,
      text: trimmed.length > 78 ? `${trimmed.slice(0, 75)}...` : trimmed,
    });
  });
}

console.log("\nBARGENATION 'use server' export guard\n");

if (problems.length === 0) {
  console.log('PASS — every export in a server-action file is an async function.\n');
  process.exit(0);
}

for (const problem of problems) {
  console.log(`  ${problem.file}:${problem.line}`);
  console.log(`    ${problem.text}\n`);
}

console.log(
  `FAIL — ${problems.length} non-function export${problems.length === 1 ? '' : 's'} in a ` +
  "'use server' file.\n\n" +
  '  A file with the "use server" directive may export ONLY async functions.\n' +
  '  Constants and values belong in a plain module beside it; types are fine\n' +
  '  because they are erased before the bundler sees them.\n\n' +
  '  This passes typecheck, lint and every test, and fails the production\n' +
  '  build with a message that names no file. That is why this guard exists.\n',
);
process.exit(1);
