#!/usr/bin/env node
/**
 * BARGENATION contrast guard (PRD §66, WCAG 2.2 AA).
 *
 * Parses the real token values out of src/app/globals.css so the palette
 * that ships is the palette that gets tested. Exits non-zero on failure.
 *
 * It also enforces the governing rule of the locked palette: brand pink
 * is a SURFACE. If someone ever tries to use --color-pink as type on
 * white, the "forbidden" block below fails the build with the reason.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');

const tokens = {};
for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  tokens[m[1]] = m[2].toLowerCase();
}

const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(tokens[a] ?? a), lum(tokens[b] ?? b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** [foreground, background, minimum, description] */
const required = [
  ['ink',        'white',      4.5, 'body text on white'],
  ['ink',        'wash',       4.5, 'body text on neutral wash'],
  ['ink',        'pink-wash',  4.5, 'body text on pink whisper'],
  ['ink',        'pink-veil',  4.5, 'body text on pink section ground'],
  ['ink',        'pink',       4.5, 'black on brand pink — the signature block'],
  ['ink-70',     'white',      4.5, 'secondary text on white'],
  ['ink-50',     'white',      4.5, 'meta text on white'],
  ['ink-50',     'wash',       4.5, 'meta text on wash'],
  ['pink-ink',   'white',      4.5, 'pink links and marks on white'],
  ['pink-ink',   'wash',       4.5, 'pink links on wash'],
  ['pink-deep',  'white',      4.5, 'pressed / visited link'],
  ['white',      'pink-ink',   4.5, 'white type on the solid pink button'],
  ['white',      'ink',        4.5, 'white type on black'],
  ['pink-ink',   'white',      3.0, 'focus ring against white'],
  ['line-strong','white',      3.0, 'strong hairline as a UI boundary'],
  ['ink',        'white',      3.0, 'black hairline as a UI boundary'],
];

/** Pairs that must FAIL — proof the governing rule is real. */
const forbidden = [
  ['pink', 'white', 4.5, 'brand pink as type on white (use pink-ink)'],
  ['pink', 'white', 3.0, 'brand pink as a hairline on white (use line-strong or ink)'],
];

let failed = 0;
console.log('BARGENATION contrast guard — WCAG 2.2 AA\n');
console.log('  REQUIRED PAIRS');
for (const [fg, bg, min, why] of required) {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(`  ✗ missing token in pair ${fg}/${bg}`); failed++; continue;
  }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${why}`);
}

console.log('\n  GOVERNING RULE — these MUST fall short, that is the point');
for (const [fg, bg, min, why] of forbidden) {
  const r = ratio(fg, bg);
  const correctlyFails = r < min;
  if (!correctlyFails) {
    failed++;
    console.log(`  ✗ ${r.toFixed(2)}:1 now clears ${min} — ${why} — rule no longer holds, revisit the system`);
  } else {
    console.log(`  ✓ ${r.toFixed(2).padStart(5)}:1  < ${min}  blocked: ${why}`);
  }
}

console.log(failed === 0 ? '\nPASS — palette clears AA.\n' : `\nFAIL — ${failed} problem(s).\n`);
process.exit(failed === 0 ? 0 : 1);
