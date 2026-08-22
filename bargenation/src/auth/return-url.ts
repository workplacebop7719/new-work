/**
 * SAFE RETURN URLS (PRD §31).
 *
 * When a logged-out customer saves a deal or adds to their Watchlist, we send
 * them to sign in and then back to what they were doing. That "back to" value
 * arrives from the query string, which means it is attacker-controlled — and a
 * redirect target taken from user input is the classic open-redirect
 * vulnerability. A phishing link can send someone to our real sign-in page and
 * bounce them, freshly authenticated and trusting, to a copy of it.
 *
 * So this is an ALLOWLIST, not a blocklist. A candidate must positively prove
 * it is a same-origin path; anything else silently becomes the default.
 *
 * Nothing here trusts URL parsing alone. Several of the payloads in the test
 * file parse "successfully" into something dangerous, which is exactly why the
 * string checks run first.
 */

/** Where we send people when the requested target is missing or unsafe. */
export const DEFAULT_RETURN_TO = '/today';

/** Auth routes are excluded: returning to one loops or re-prompts. */
const AUTH_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth',
];

/**
 * C0 and C1 control characters, including the CR/LF pair used for response
 * header splitting. Written as escapes so the source stays plain text.
 */
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * A safe candidate starts with exactly one forward slash, and the character
 * after it is neither a slash nor a backslash.
 *
 *   "/deals/x"      ok
 *   "//evil.com"    protocol-relative — the browser reads this as another host
 *   "/\evil.com"    backslash variant some browsers normalise to "//"
 */
const SINGLE_LEADING_SLASH = /^\/(?![/\\])/;

/**
 * Percent-encoded slashes, backslashes and whitespace at the start. Some
 * layers decode before redirecting, turning "/%2F%2Fevil.com" back into
 * "///evil.com".
 */
const ENCODED_PREFIX = /^\/(?:%2f|%5c|%09|%0a|%0d|%00)/i;

/** The origin candidates are resolved against. Never reachable in reality. */
const PROBE_ORIGIN = 'https://bargenation.invalid';

export function isSafeReturnTo(candidate: unknown): candidate is string {
  if (typeof candidate !== 'string') return false;
  if (candidate.length === 0 || candidate.length > 512) return false;

  // No control characters anywhere — a CR/LF here would be header injection.
  if (CONTROL_CHARS.test(candidate)) return false;

  // A backslash anywhere is rejected outright. It has no legitimate use in our
  // paths and is the most common normalisation trick.
  if (candidate.includes('\\')) return false;

  if (!SINGLE_LEADING_SLASH.test(candidate)) return false;
  if (ENCODED_PREFIX.test(candidate)) return false;

  // Resolve against a throwaway origin and require it to stay there. This
  // catches anything the string checks above missed.
  let parsed: URL;
  try {
    parsed = new URL(candidate, PROBE_ORIGIN);
  } catch {
    return false;
  }
  if (parsed.origin !== PROBE_ORIGIN) return false;

  // Never bounce back into the auth flow itself.
  const path = parsed.pathname.toLowerCase();
  if (AUTH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return false;

  return true;
}

/** Always returns something safe to redirect to. */
export function safeReturnTo(candidate: unknown): string {
  return isSafeReturnTo(candidate) ? candidate : DEFAULT_RETURN_TO;
}

/**
 * Builds the sign-in link that remembers what the customer was doing.
 * An unsafe or absent target simply produces a plain sign-in link.
 */
export function loginHref(returnTo?: unknown): string {
  if (!isSafeReturnTo(returnTo)) return '/login';
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}
