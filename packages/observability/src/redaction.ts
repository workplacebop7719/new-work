/**
 * Redaction for structured logs and audit context — PRD §16, §27.
 *
 * Logs are "structured redacted" by requirement (ARC-009). Redaction is applied
 * on the way in, not by a log-shipping filter, so a local console and a hosted
 * log sink see the same safe payload.
 */

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|signed_?url|storage_?key|api_?key/i;
const EMAIL = /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi;
/** Canadian and North American phone shapes, loosely. */
const PHONE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

export const REDACTED = '[redacted]';

export function redactString(value: string): string {
  return value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED);
}

/**
 * Deep-redacts an object for logging. Depth-limited: a cyclic or very deep
 * structure is truncated rather than allowed to hang the logger.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return output;
}
