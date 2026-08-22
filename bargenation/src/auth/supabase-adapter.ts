import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AuthError, assertPasswordStrong, isPlausibleEmail, normaliseEmail,
  type AuthPort, type AuthResult, type Credentials,
} from './types';

/**
 * SUPABASE AUTH ADAPTER (PRD §28).
 *
 * NOT YET EXERCISED AGAINST A LIVE PROJECT. No Supabase credentials exist for
 * BARGENATION, so while this code is complete and typechecked, it has never
 * made a real call. Treat the first run against a real project as the point
 * where it is actually verified — the tests below it cover the translation
 * layer, not the network.
 *
 * Required environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * The service-role key is deliberately absent. It bypasses row level security
 * entirely, so it must never be used by request-handling code (§69).
 */

/**
 * Translates provider errors into our closed set.
 *
 * This is the layer §29 requires: a raw Supabase message must never reach a
 * customer, both because the wording is not ours and because provider errors
 * distinguish "no such user" from "wrong password", which would make the
 * sign-in form an account-enumeration oracle.
 */
export function translateSupabaseError(raw: unknown): AuthError {
  const message = (raw as { message?: string } | null)?.message ?? '';
  const status = (raw as { status?: number } | null)?.status;
  const m = message.toLowerCase();

  if (status === 429 || m.includes('rate limit')) return new AuthError('RATE_LIMITED', message);
  if (m.includes('already registered') || m.includes('already been registered')) {
    return new AuthError('EMAIL_TAKEN', message);
  }
  if (m.includes('email not confirmed')) return new AuthError('EMAIL_NOT_VERIFIED', message);
  if (m.includes('password') && m.includes('should be')) return new AuthError('WEAK_PASSWORD', message);
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return new AuthError('INVALID_CREDENTIALS', message);
  }
  if (m.includes('token') || m.includes('expired') || m.includes('otp')) {
    return new AuthError('INVALID_TOKEN', message);
  }
  // Anything unrecognised becomes a generic failure rather than leaking through.
  return new AuthError('UNAVAILABLE', message || 'unrecognised provider error');
}

export function createSupabaseAuth(): AuthPort {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // A port that reports itself unconfigured rather than half-working, so the
    // UI can disable the controls honestly instead of failing at submit (§01).
    return unconfigured();
  }

  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const toResult = (data: {
    session: { access_token: string; expires_at?: number } | null;
    user: { id: string; email?: string; email_confirmed_at?: string | null;
            user_metadata?: { display_name?: string } } | null;
  }): AuthResult => {
    if (!data.session || !data.user) throw new AuthError('UNAVAILABLE', 'no session returned');
    return {
      token: data.session.access_token,
      session: {
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          displayName: data.user.user_metadata?.display_name ?? null,
          emailVerified: Boolean(data.user.email_confirmed_at),
        },
        expiresAt: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
      },
    };
  };

  return {
    configured: true,
    name: 'supabase',

    async signUp({ email, password, displayName }) {
      const e = normaliseEmail(email);
      if (!isPlausibleEmail(e)) throw new AuthError('INVALID_CREDENTIALS', 'implausible email');
      assertPasswordStrong(password);

      const { data, error } = await client.auth.signUp({
        email: e,
        password,
        options: { data: { display_name: displayName?.trim() || null } },
      });
      if (error) throw translateSupabaseError(error);
      return toResult(data);
    },

    async signIn({ email, password }: Credentials) {
      const { data, error } = await client.auth.signInWithPassword({
        email: normaliseEmail(email),
        password,
      });
      if (error) throw translateSupabaseError(error);
      return toResult(data);
    },

    async signOut(sessionToken) {
      // Best effort: the cookie is cleared by the caller regardless.
      await client.auth.admin?.signOut?.(sessionToken).catch(() => undefined);
    },

    async getSession(sessionToken) {
      if (!sessionToken) return null;
      const { data, error } = await client.auth.getUser(sessionToken);
      if (error || !data.user) return null;
      return {
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          displayName: data.user.user_metadata?.display_name ?? null,
          emailVerified: Boolean(data.user.email_confirmed_at),
        },
        // getUser does not return an expiry; the cookie carries its own.
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    },

    async requestPasswordReset(email) {
      // Never surfaces whether the address exists.
      await client.auth.resetPasswordForEmail(normaliseEmail(email)).catch(() => undefined);
    },

    async resetPassword(token, newPassword) {
      assertPasswordStrong(newPassword);
      const { error: verifyError } = await client.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });
      if (verifyError) throw translateSupabaseError(verifyError);

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw translateSupabaseError(error);
    },

    async verifyEmail(token) {
      const { error } = await client.auth.verifyOtp({ token_hash: token, type: 'email' });
      if (error) throw translateSupabaseError(error);
    },
  };
}

/** A port that fails honestly and identically for every operation. */
export function unconfigured(): AuthPort {
  const refuse = async (): Promise<never> => {
    throw new AuthError('NOT_CONFIGURED');
  };
  return {
    configured: false,
    name: 'unconfigured',
    signUp: refuse,
    signIn: refuse,
    signOut: async () => undefined,
    getSession: async () => null,
    requestPasswordReset: refuse,
    resetPassword: refuse,
    verifyEmail: refuse,
  };
}
