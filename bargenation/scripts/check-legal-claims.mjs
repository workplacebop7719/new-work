#!/usr/bin/env node
/**
 * Legal copy guard (PRD §70).
 *
 * Two failure modes this exists to prevent, both of which are easy to
 * introduce with a well-meaning edit:
 *
 *   1. Claiming compliance. "CCPA compliant" is a legal conclusion, and
 *      nobody qualified has reached it. Describing what the software does is
 *      fine; asserting that it satisfies a statute is not.
 *
 *   2. Filling a missing company detail with something plausible. A
 *      placeholder that looks like a real address stops reading as a gap, and
 *      the gap is the honest state.
 *
 * Exits non-zero on either.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/disclosures/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/about/page.tsx',
  'src/content/legal.ts',
  'src/components/legal/LegalShell.tsx',
];

/** Phrases that assert a legal conclusion rather than describing behaviour. */
const COMPLIANCE_CLAIMS = [
  /\b(?:fully|entirely|completely)\s+compliant\b/i,
  /\b(?:ccpa|cpra|pipeda|gdpr|coppa|casl|law\s*25)[- ]compliant\b/i,
  /\bcompliant\s+with\s+(?:the\s+)?(?:ccpa|cpra|pipeda|gdpr|coppa|casl)/i,
  /\bwe\s+(?:are|is)\s+compliant\b/i,
  /\bmeets?\s+all\s+(?:legal\s+)?requirements\b/i,
  /\blegally\s+(?:vetted|approved|binding\s+advice)\b/i,
  /\bapproved\s+by\s+(?:our\s+)?(?:lawyers?|counsel)\b/i,
  /\bthis\s+constitutes\s+legal\s+advice\b/i,
];

/** Values that would make an unset company detail look settled. */
const PLAUSIBLE_PLACEHOLDERS = [
  /\b\d+\s+(?:Main|High|King|Queen|Bay|Yonge|Market)\s+(?:St|Street|Rd|Road|Ave|Avenue)\b/i,
  /\b(?:legal|privacy|support|hello|info)@bargenation\.(?:com|ca|io)\b/i,
  /\bBargenation\s+(?:Inc|Ltd|LLC|Limited|Corp|Corporation|Pty)\b\.?/i,
  /\bprovince\s+of\s+(?:Ontario|Quebec|British\s+Columbia)\b/i,
  /\bstate\s+of\s+(?:California|Delaware|New\s+York)\b/i,
];

let failures = 0;
const fail = (file, message) => {
  console.log(`  ✗ ${file}\n      ${message}`);
  failures++;
};

console.log('BARGENATION legal copy guard\n');

for (const relative of TARGETS) {
  let source;
  try {
    source = readFileSync(join(root, relative), 'utf8');
  } catch {
    fail(relative, 'file is missing — a linked legal page must exist');
    continue;
  }

  for (const pattern of COMPLIANCE_CLAIMS) {
    const hit = source.match(pattern);
    if (hit) fail(relative, `claims compliance: "${hit[0]}"`);
  }
  for (const pattern of PLAUSIBLE_PLACEHOLDERS) {
    const hit = source.match(pattern);
    if (hit) fail(relative, `invented company detail: "${hit[0]}"`);
  }
}

// The review flag must be a literal false, not derived from anything a
// deployment could set about itself.
const legal = readFileSync(join(root, 'src/content/legal.ts'), 'utf8');
if (!/export const LAWYER_REVIEWED\s*=\s*false\s*;/.test(legal)) {
  fail('src/content/legal.ts', 'LAWYER_REVIEWED must be a literal false until a lawyer has read these');
}
if (/LAWYER_REVIEWED\s*=\s*(?:Boolean\(|process\.env)/.test(legal)) {
  fail('src/content/legal.ts', 'LAWYER_REVIEWED must not come from the environment');
}

// Required details must default to null, never to a string.
for (const match of legal.matchAll(/envVar:\s*'([A-Z_]+)',\s*\n\s*value:\s*([^\n,]+)/g)) {
  if (!match[2].startsWith('read(')) {
    fail('src/content/legal.ts', `${match[1]} has a hardcoded value; it must be read from the environment`);
  }
}

// Every footer link marked built must resolve to a page.
const footer = readFileSync(join(root, 'src/components/chrome/SiteFooter.tsx'), 'utf8');
for (const m of footer.matchAll(/href:\s*'([^']+)',\s*built:\s*true/g)) {
  const route = m[1];
  const dir = join(root, 'src/app', route.replace(/^\//, ''));
  let ok = false;
  try {
    ok = statSync(dir).isDirectory() && readdirSync(dir).some((f) => f.startsWith('page.'));
  } catch { ok = false; }
  if (route !== '/' && !ok) fail('SiteFooter.tsx', `links to ${route} as built, but no page exists`);
}

console.log(failures === 0 ? '\nPASS — no compliance claims, no invented details.\n' : `\nFAIL — ${failures} problem(s).\n`);
process.exit(failures === 0 ? 0 : 1);
