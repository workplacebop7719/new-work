/**
 * The authentication port (PRD §28, §80).
 *
 * Everything above this interface is provider-agnostic. Supabase Auth is the
 * intended provider, but no page, action or component imports it — they talk
 * to this port. That is what lets the whole member surface be built and tested
 * now, against a development adapter, and lets the real provider drop in as an
 * isolated change once credentials exist.
 */

/** The only shape of "who is signed in" the rest of the app ever sees. */
export interface AuthUser {
  /** Matches profiles.id, and is what RLS policies compare auth.uid() against. */
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
}

/**
 * What a successful sign-in produces: the session to render, and the opaque
 * token that identifies it. The token is what goes in the httpOnly cookie —
 * an earlier version returned only the Session and left callers casting to
 * invent a token, which typechecked and would have silently stored nothing.
 */
export interface AuthResult {
  session: Session;
  token: string;
}

export interface Session {
  user: AuthUser;
  /** Absolute expiry. Sessions are checked against this, never trusted blindly. */
  expiresAt: string;
}

/**
 * A closed set of failure reasons.
 *
 * §29 forbids showing raw provider errors. Adapters translate whatever their
 * provider throws into one of these, and the UI renders a message from the
 * table below — so a provider message can never reach a customer verbatim,
 * and a provider change cannot alter our copy.
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_NOT_VERIFIED'
  | 'RATE_LIMITED'
  | 'INVALID_TOKEN'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE';

/**
 * A stable marker that survives module duplication.
 *
 * `instanceof` compares prototypes, which means it compares CLASS OBJECTS —
 * and Next.js bundles a `'use server'` module into a different graph from the
 * one the adapters are reached through. `types.ts` is therefore instantiated
 * twice in a running server, and an AuthError thrown by the adapter is not an
 * `instanceof` the AuthError that actions.ts imported.
 *
 * The symptom was silent and total: every sign-in failure, duplicate address
 * and short password rendered "We couldn't reach our sign-in service" instead
 * of its real message. AUTH_MESSAGE was effectively dead code, and the tests
 * passed throughout because inside one Vitest module graph there is only one
 * class. Found by driving the flow in a browser.
 */
const AUTH_ERROR_BRAND = 'bargenation.AuthError';

export class AuthError extends Error {
  /** Read by isAuthError. Not `instanceof`, deliberately — see above. */
  readonly brand = AUTH_ERROR_BRAND;

  constructor(
    readonly code: AuthErrorCode,
    /** Internal detail for logs. Never rendered. */
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

/**
 * The check every catch block must use instead of `instanceof AuthError`.
 *
 * It verifies the code as well as the brand. A duck-typed guard that trusted
 * `code` blindly would index AUTH_MESSAGE with an unknown key and render the
 * string "undefined" to a customer.
 */
export function isAuthError(err: unknown): err is AuthError {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { brand?: unknown; code?: unknown };
  return candidate.brand === AUTH_ERROR_BRAND
    && typeof candidate.code === 'string'
    && Object.prototype.hasOwnProperty.call(AUTH_MESSAGE, candidate.code);
}

/**
 * Customer-facing copy, in BARGENATION's voice (§72).
 *
 * INVALID_CREDENTIALS is deliberately vague about WHICH half was wrong:
 * saying "no account with that email" turns the sign-in form into a tool for
 * discovering who has an account here.
 */
export const AUTH_MESSAGE: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: 'That email and password don’t match. Try again.',
  EMAIL_TAKEN: 'There’s already an account with that email. Try signing in.',
  WEAK_PASSWORD: 'Use at least 10 characters. Longer is better than complicated.',
  EMAIL_NOT_VERIFIED: 'Confirm your email first — check for our message.',
  RATE_LIMITED: 'Too many attempts. Wait a minute and try again.',
  INVALID_TOKEN: 'That link has expired or already been used. Request a new one.',
  NOT_CONFIGURED: 'Accounts aren’t switched on yet.',
  UNAVAILABLE: 'We couldn’t reach our sign-in service. Try again shortly.',
};

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthPort {
  /** Whether this adapter can actually authenticate anyone. */
  readonly configured: boolean;
  /** Shown in the UI so a developer is never confused about which is live. */
  readonly name: string;
  /**
   * Whether a reset or verification link this port issues actually reaches an
   * inbox.
   *
   * Supabase sends its own transactional mail, so for that adapter this is
   * true. The development adapter hands its tokens to an email port that
   * records messages instead of sending them, so it is false — and the
   * recovery pages say so rather than accepting an address and leaving
   * somebody waiting for a message that will never arrive (§01).
   */
  readonly deliversEmail: boolean;

  signUp(input: Credentials & { displayName?: string }): Promise<AuthResult>;
  signIn(input: Credentials): Promise<AuthResult>;
  signOut(sessionToken: string): Promise<void>;
  /** Resolves a stored token to a session, or null when absent/expired. */
  getSession(sessionToken: string | null): Promise<Session | null>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}

/** PRD §30 keeps registration minimal; this is the whole password rule. */
export const MIN_PASSWORD_LENGTH = 10;

export function assertPasswordStrong(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError('WEAK_PASSWORD');
  }
}

/** Deliberately permissive: the confirmation email is the real check. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  const e = normaliseEmail(email);
  return e.length >= 3 && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
