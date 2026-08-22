/**
 * PUB-006 / ARC-007 / ANL-001.
 *
 * Three things must stay true of the web application, and all three are easy to
 * break with one convenient line:
 *
 *   1. No third-party script host appears anywhere in the app source. Consent
 *      gating cannot be trusted if a tag can be added in a template.
 *   2. Analytics is dispatched only through @northstar/observability, never by
 *      pushing to a global.
 *   3. Nothing calls the analytics dispatcher without going through the consent
 *      wrapper in lib/analytics.ts.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const THIRD_PARTY_HOSTS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /connect\.facebook\.net/i,
  /hotjar\.com/i,
  /segment\.(io|com)/i,
  /fullstory\.com/i,
  /clarity\.ms/i,
  /doubleclick\.net/i,
  /cdn\.jsdelivr\.net/i,
  /unpkg\.com/i,
];

const GLOBAL_PUSH = [/dataLayer\s*\.\s*push/, /window\s*\.\s*(gtag|ga|analytics|_paq)\b/];

const files = await walk(`${ROOT}/apps/web`, (p) => /\.(ts|tsx|js|jsx|css|html)$/.test(p));
const failures = [];

for (const file of files) {
  const name = rel(file);
  const text = await read(file);
  text.split('\n').forEach((line, index) => {
    for (const host of THIRD_PARTY_HOSTS) {
      if (host.test(line)) {
        failures.push(
          `${name}:${index + 1} third-party host ${host} — no external script may load, ` +
            'and any new one needs a documented owner, purpose, consent category and ' +
            'performance budget (ARC-007) plus a consent gate (PUB-006).',
        );
      }
    }
    for (const push of GLOBAL_PUSH) {
      if (push.test(line)) {
        failures.push(`${name}:${index + 1} analytics global ${push} — use @northstar/observability (ANL-001).`);
      }
    }
  });
}

// The Analytics class must be constructed in exactly one place: the consent
// wrapper. A second construction site is a second way to bypass the gate.
const constructions = [];
for (const file of files) {
  const text = await read(file);
  if (/new\s+Analytics\s*\(/.test(text)) constructions.push(rel(file));
}
if (constructions.length > 1 || (constructions[0] && constructions[0] !== 'apps/web/lib/analytics.ts')) {
  failures.push(
    `Analytics is constructed in ${constructions.join(', ')}. It must be constructed only in ` +
      'apps/web/lib/analytics.ts, which applies the consent gate (PUB-006).',
  );
}

process.exit(report('no third-party scripts; analytics behind the consent gate (PUB-006)', failures) ? 0 : 1);
