import type { AuthPort } from './types';
import { createSupabaseAuth, unconfigured } from './supabase-adapter';
import { createDevAuth } from './dev-adapter';

/**
 * Chooses the authentication adapter (PRD §80).
 *
 * The rules, in order:
 *
 *   1. Supabase credentials present  -> the real provider, everywhere.
 *   2. Production without them       -> `unconfigured`. Never the dev adapter.
 *   3. Otherwise                     -> the in-memory dev adapter.
 *
 * Rule 2 is the important one. The dev adapter keeps users in memory, so if it
 * ever reached production anyone could create an account as anyone. It throws
 * on construction under NODE_ENV=production as a second line of defence, and
 * this function makes sure it is never even attempted there.
 *
 * When nothing is configured the port reports `configured: false`, and the UI
 * disables its controls and says why rather than failing at submit (§01).
 */
export function createAuth(): AuthPort {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (hasSupabase) return createSupabaseAuth();
  if (process.env.NODE_ENV === 'production') return unconfigured();
  return createDevAuth();
}

/**
 * Module-level singleton so the in-memory dev store survives across requests
 * within a process. Re-created per process, which is exactly the lifetime the
 * development adapter is documented to have.
 */
declare global {
  var __bargenationAuth: AuthPort | undefined;
}

export function auth(): AuthPort {
  globalThis.__bargenationAuth ??= createAuth();
  return globalThis.__bargenationAuth;
}

export * from './types';
export { safeReturnTo, isSafeReturnTo, loginHref, DEFAULT_RETURN_TO } from './return-url';
