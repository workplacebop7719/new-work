import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  AuthError, assertPasswordStrong, isPlausibleEmail, normaliseEmail,
  type AuthPort, type AuthResult, type Credentials, type AuthUser,
} from './types';

/**
 * DEVELOPMENT AUTHENTICATION ADAPTER.
 *
 * Exists so the member surface — Watchlist, Saved, Deal Signals, preferences —
 * can be built and tested end to end before Supabase credentials arrive (§80).
 * It is the auth equivalent of the fixture dataset: real behaviour, obviously
 * not real infrastructure.
 *
 * State lives in memory and is lost on restart. There is no email delivery, so
 * reset and verification tokens are returned to the caller instead of sent.
 *
 * THIS MUST NEVER RUN IN PRODUCTION. `createDevAuth` throws when NODE_ENV is
 * production, which is asserted by a test. A fake auth provider reaching
 * production would be the single worst failure this codebase could have — an
 * in-memory user store means anyone can create an account as anyone.
 */

interface StoredUser extends AuthUser {
  salt: string;
  hash: string;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** scrypt, not because this store is worth protecting, but so the shape of the
 *  code never teaches anyone that comparing plaintext passwords is acceptable. */
function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = hashPassword(password, salt);
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createDevAuth(options: { now?: () => Date } = {}): AuthPort {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'The development auth adapter cannot run in production. ' +
      'Configure a real provider (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY).',
    );
  }

  const now = options.now ?? (() => new Date());
  const users = new Map<string, StoredUser>();          // email -> user
  const sessions = new Map<string, { userId: string; expiresAt: number }>();
  const resetTokens = new Map<string, string>();        // token -> email
  const verifyTokens = new Map<string, string>();       // token -> email

  const publicUser = (u: StoredUser): AuthUser => ({
    id: u.id, email: u.email, displayName: u.displayName, emailVerified: u.emailVerified,
  });

  function issue(user: StoredUser): AuthResult {
    const token = randomUUID();
    const expiresAt = now().getTime() + SESSION_TTL_MS;
    sessions.set(token, { userId: user.id, expiresAt });
    return {
      token,
      session: { user: publicUser(user), expiresAt: new Date(expiresAt).toISOString() },
    };
  }

  const port: AuthPort & {
    __pendingVerifyToken(email: string): string | undefined;
    __pendingResetToken(email: string): string | undefined;
  } = {
    configured: true,
    name: 'development (in-memory)',

    async signUp({ email, password, displayName }) {
      const e = normaliseEmail(email);
      if (!isPlausibleEmail(e)) throw new AuthError('INVALID_CREDENTIALS', 'implausible email');
      assertPasswordStrong(password);
      if (users.has(e)) throw new AuthError('EMAIL_TAKEN');

      const salt = randomBytes(16).toString('hex');
      const user: StoredUser = {
        id: randomUUID(),
        email: e,
        displayName: displayName?.trim() || null,
        emailVerified: false,
        salt,
        hash: hashPassword(password, salt),
      };
      users.set(e, user);
      verifyTokens.set(randomUUID(), e);

      return issue(user);
    },

    async signIn({ email, password }: Credentials) {
      const e = normaliseEmail(email);
      const user = users.get(e);
      // Same error whether the account is missing or the password is wrong,
      // so this form cannot be used to enumerate who has an account.
      if (!user || !verifyPassword(password, user.salt, user.hash)) {
        throw new AuthError('INVALID_CREDENTIALS');
      }
      return issue(user);
    },

    async signOut(sessionToken) {
      sessions.delete(sessionToken);
    },

    async getSession(sessionToken) {
      if (!sessionToken) return null;
      const record = sessions.get(sessionToken);
      if (!record) return null;
      if (record.expiresAt <= now().getTime()) {
        sessions.delete(sessionToken);
        return null;
      }
      const user = [...users.values()].find((u) => u.id === record.userId);
      if (!user) return null;
      return { user: publicUser(user), expiresAt: new Date(record.expiresAt).toISOString() };
    },

    async requestPasswordReset(email) {
      const e = normaliseEmail(email);
      // Always succeeds, whether or not the address exists — otherwise this
      // endpoint reveals which addresses have accounts.
      if (users.has(e)) resetTokens.set(randomUUID(), e);
    },

    async resetPassword(token, newPassword) {
      assertPasswordStrong(newPassword);
      const email = resetTokens.get(token);
      if (!email) throw new AuthError('INVALID_TOKEN');
      const user = users.get(email);
      if (!user) throw new AuthError('INVALID_TOKEN');

      user.salt = randomBytes(16).toString('hex');
      user.hash = hashPassword(newPassword, user.salt);
      resetTokens.delete(token);

      // Every existing session is invalidated: a password reset is how someone
      // recovers a compromised account, so an attacker's session must not survive.
      for (const [t, s] of sessions) if (s.userId === user.id) sessions.delete(t);
    },

    async verifyEmail(token) {
      const email = verifyTokens.get(token);
      if (!email) throw new AuthError('INVALID_TOKEN');
      const user = users.get(email);
      if (!user) throw new AuthError('INVALID_TOKEN');
      user.emailVerified = true;
      verifyTokens.delete(token);
    },

    // ---- development-only helpers, standing in for email delivery ----
    __pendingVerifyToken(email) {
      const e = normaliseEmail(email);
      return [...verifyTokens.entries()].find(([, v]) => v === e)?.[0];
    },
    __pendingResetToken(email) {
      const e = normaliseEmail(email);
      return [...resetTokens.entries()].find(([, v]) => v === e)?.[0];
    },
  };

  return port;
}

export type DevAuth = ReturnType<typeof createDevAuth> & {
  __pendingVerifyToken(email: string): string | undefined;
  __pendingResetToken(email: string): string | undefined;
};
