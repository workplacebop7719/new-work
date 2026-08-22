/**
 * CNT-008 / ENG-008 — prohibited commercial and regulatory claims.
 *
 * PRD §27: "Never claim the product is 'AODA certified', 'government approved'
 * or a substitute for client certification or legal advice."
 * PRD §5 mandatory wording: avoid "certified compliant", "guaranteed protection",
 * or any copy implying that payment transfers the client's legal responsibility.
 *
 * This runs over source and content, not just marketing copy, because the phrase
 * that ships is usually the one someone typed into a component.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const PROHIBITED = [
  { pattern: /\bAODA[- ]certified\b/i, note: 'PRD §27' },
  { pattern: /\bcertified compliant\b/i, note: 'PRD §5 mandatory wording' },
  { pattern: /\bgovernment[- ]approved\b/i, note: 'PRD §27' },
  { pattern: /\bgovernment[- ]authoriz(ed|ation)\b/i, note: 'PRD §3 non-goals' },
  { pattern: /\bguaranteed (compliance|protection)\b/i, note: 'PRD §5' },
  { pattern: /\bguarantee[sd]? (your )?compliance\b/i, note: 'PRD §5' },
  { pattern: /\bfully compliant\b/i, note: 'PRD §6 service promise' },
  { pattern: /\beffortless compliance\b/i, note: 'PRD §14 voice' },
  { pattern: /\bcertifi(e|ies|cation) (conforme|garantie)\b/i, note: 'PRD §5 (FR)' },
  { pattern: /\bapprouvé par le gouvernement\b/i, note: 'PRD §27 (FR)' },
];

/** `northstar-allow-claim: <reason>` marks a deliberate mention, reviewed in PR. */
const ALLOW = /northstar-allow-claim:/;

const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|css|json|md|mdx|sql|yml|yaml)$/;
// docs/PRD.md is the source document; it quotes the prohibited phrases in order
// to prohibit them. Guard files themselves necessarily contain the patterns.
const EXEMPT = [/^docs\/PRD\.md$/, /^scripts\/guards\//, /^docs\/adr\//, /^docs\/traceability\.md$/];

const files = await walk(ROOT, (p) => EXTENSIONS.test(p));
const failures = [];

for (const file of files) {
  const name = rel(file);
  if (EXEMPT.some((re) => re.test(name))) continue;
  const text = await read(file);
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (ALLOW.test(line)) return;
    for (const { pattern, note } of PROHIBITED) {
      if (pattern.test(line)) {
        failures.push(`${name}:${index + 1} prohibited claim ${pattern} (${note}): ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

process.exit(report('prohibited claims (CNT-008, ENG-008)', failures) ? 0 : 1);
