/**
 * Generates tokens.css from tokens.ts so there is exactly one source of truth.
 *
 * Run with `pnpm --filter @northstar/ui tokens:css`. CI re-runs it and fails if
 * the committed CSS differs, which stops the stylesheet drifting away from the
 * values the contrast tests actually verify.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { COLOR, MOTION, SPACE, TARGET, TYPE } from './tokens';

function block(entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
}

export function renderCss(): string {
  return `/* GENERATED FILE — edit src/tokens/tokens.ts and run \`pnpm tokens:css\`. */
:root {
${block(COLOR)}

${block(TYPE)}

${block(SPACE)}

${block(MOTION)}

${block(TARGET)}
}

/*
 * BRD-003 / ACC-005: reduced motion is honoured with an equivalent non-motion
 * state, not by leaving an animation half-applied. Durations collapse to
 * effectively zero; nothing that conveyed information via motion is lost,
 * because no component depends on motion to convey it (ENG-004).
 */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-base: 1ms;
    --duration-slow: 1ms;
  }

  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}

/*
 * ACC-002: a single visible focus indicator for every focusable element. Defined
 * once here so no component can ship without one, and thick enough to remain
 * visible at 400% zoom (ACC-004).
 */
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Windows High Contrast Mode: system colours must win (ACC-004). */
@media (forced-colors: active) {
  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline-color: Highlight;
  }
}
`;
}

const target = new URL('./tokens.css', import.meta.url).pathname;
const rendered = renderCss();

// `--check` is what CI runs: it proves the committed stylesheet is exactly what
// tokens.ts produces, so a hand-edit to the CSS cannot escape the contrast tests
// (which only ever see the TypeScript values).
if (process.argv.includes('--check')) {
  const existing = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (existing !== rendered) {
    console.error(
      'tokens.css is out of date with tokens.ts. Run `pnpm --filter @northstar/ui tokens:css`.',
    );
    process.exit(1);
  }
  console.log('tokens.css matches tokens.ts');
} else {
  writeFileSync(target, rendered, 'utf8');
  console.log(`wrote ${target}`);
}
