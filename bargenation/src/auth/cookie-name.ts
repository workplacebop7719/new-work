/**
 * The session cookie name, and nothing else.
 *
 * Deliberately dependency-free. `middleware.ts` runs on the edge runtime,
 * which cannot load node:crypto — and importing this constant from
 * `session.ts` dragged in the auth adapters and broke the build. Anything
 * shared with middleware has to live somewhere with no imports at all.
 */
export const SESSION_COOKIE = 'bargenation_session';
