/**
 * Shape checks for tokens that arrive in a link (PRD §31).
 *
 * A reset or verification token comes out of the query string, so it is
 * attacker-controlled and may be absent, enormous, or full of control
 * characters. It is bounded and character-checked before it reaches a
 * provider, and never parsed for meaning — the format belongs to whichever
 * adapter issued it, and a dev-adapter UUID and a Supabase token hash look
 * nothing alike.
 *
 * Separate from actions.ts because that file is `'use server'`, where every
 * export must be an async server action.
 */

/** Long enough for a provider hash, short enough not to be carried around. */
export const MAX_TOKEN_LENGTH = 512;

/**
 * Whitespace and C0/C1 control characters, written as escapes so the source
 * stays plain text — the same reason return-url.ts spells its class out.
 */
const UNSAFE = /[\s\u0000-\u001F\u007F-\u009F]/;

export function isPlausibleToken(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_TOKEN_LENGTH
    && !UNSAFE.test(value);
}
