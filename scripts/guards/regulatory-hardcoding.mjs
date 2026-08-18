/**
 * ENG-007 — "Never hard-code regulatory claims in components. Render them from
 * versioned content objects with sources and review dates."
 *
 * Heuristic by necessity: it looks for regulatory vocabulary in component files
 * and asks for it to come from a claim instead. False positives are expected and
 * are resolved with an explicit, reviewable annotation rather than by weakening
 * the rule — that annotation is the audit trail of every deliberate exception.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const REGULATORY_VOCABULARY = [
  /\bWCAG\s?2\.\d\b/,
  /\bAODA\b/,
  /\bIASR\b/,
  /\bIntegrated Accessibility Standards\b/i,
  /\bO\.?\s?Reg\.?\s?191\/11\b/i,
  /\bcompliance report\b/i,
  /\bDecember\s+31,?\s+20\d\d\b/i,
  /\b\d{1,3}\+?\s+employees?\b.*\b(must|required|obligation)\b/i,
];

const ALLOW = /northstar-allow-regulatory:/;

// Component and page code. The domain content model, the guards and the docs are
// where regulatory vocabulary legitimately lives.
const COMPONENT_PATHS = /^(apps\/web\/(app|components)|packages\/ui\/src\/components)\//;
// Tests are not rendered to a user; they legitimately quote source titles and
// assert on regulatory copy. Only shipped component source is scanned.
const EXTENSIONS = /(?<!\.test)\.(tsx|jsx)$/;

const files = await walk(ROOT, (p) => EXTENSIONS.test(p));
const failures = [];

for (const file of files) {
  const name = rel(file);
  if (!COMPONENT_PATHS.test(name)) continue;
  const text = await read(file);
  text.split('\n').forEach((line, index) => {
    if (ALLOW.test(line)) return;
    // Comments explain the rule; they are not rendered.
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    for (const pattern of REGULATORY_VOCABULARY) {
      if (pattern.test(code)) {
        failures.push(
          `${name}:${index + 1} hard-coded regulatory text ${pattern}. Render it from a RegulatoryClaim ` +
            `(ENG-007), or annotate the line with "northstar-allow-regulatory: <reason>".`,
        );
      }
    }
  });
}

process.exit(report('no hard-coded regulatory claims (ENG-007)', failures) ? 0 : 1);
