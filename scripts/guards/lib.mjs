import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'coverage', '.turbo', 'test-results', 'playwright-report',
]);

export async function walk(dir, predicate) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      found.push(...(await walk(path, predicate)));
    } else if (predicate(path)) {
      found.push(path);
    }
  }
  return found;
}

export async function read(path) {
  return readFile(path, 'utf8');
}

export function rel(path) {
  return relative(ROOT, path);
}

export function report(name, failures) {
  if (failures.length === 0) {
    console.log(`  ✓ ${name}`);
    return true;
  }
  console.error(`  ✗ ${name}`);
  for (const failure of failures) console.error(`      ${failure}`);
  return false;
}
