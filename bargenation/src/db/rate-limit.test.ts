/**
 * Rate limiting against a real database.
 *
 * Two things are being proven: that the counters actually count, and that
 * NEITHER TABLE HOLDS AN ADDRESS. The second matters more — /privacy says we
 * do not record your IP, and a rate limiter is the most natural place in a
 * codebase for one to appear.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import pg from 'pg';

const APP_URL = process.env.TEST_APP_DATABASE_URL;
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const live = Boolean(APP_URL && ADMIN_URL);
const d = live ? describe : describe.skip;

/** A caller header, so the caller dimension is exercised rather than skipped. */
function withCaller(ip: string | null) {
  vi.doMock('next/headers', () => ({
    headers: async () => new Map(ip ? [['x-forwarded-for', ip]] : []),
  }));
}

d('rate limiting', () => {
  let admin: pg.Client;
  let store: typeof import('@/security/rate-limit-store');

  beforeAll(async () => {
    process.env.DATABASE_URL = APP_URL;
    process.env.APP_SECRET = 'a-long-enough-development-secret';
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query('delete from rate_limit_hits');
    await admin.query('delete from challenge_uses');

    withCaller('203.0.113.9');
    store = await import('@/security/rate-limit-store');
  });

  /**
   * Every test in this file shares one mocked caller, so their hits pile into
   * the same caller bucket. Six tests recording three PASSWORD_RESET hits each
   * is eighteen against an allowance of fifteen — enough for a later test that
   * expects "allowed" to fail on the CALLER dimension while asserting
   * something about the SUBJECT one.
   *
   * That produced an intermittent failure that ten clean runs hid. Each test
   * now starts from an empty table.
   */
  beforeEach(async () => {
    await admin.query('delete from rate_limit_hits');
  });

  afterAll(async () => {
    await admin?.end();
    const { getPool } = await import('@/db/client');
    await getPool().end();
  });

  /** A unique address per test, so one test's hits are not another's. */
  const fresh = () => `rate${Date.now()}${Math.random().toString(36).slice(2)}@example.com`;

  describe('counting', () => {
    it('allows an attempt nobody has made before', async () => {
      expect(await store.checkRateLimit('PASSWORD_RESET', fresh()))
        .toEqual({ allowed: true });
    });

    it('refuses once the allowance for that address is spent', async () => {
      const address = fresh();
      for (let i = 0; i < 3; i++) await store.recordRateLimitHit('PASSWORD_RESET', address);

      const decision = await store.checkRateLimit('PASSWORD_RESET', address);
      expect(decision).toMatchObject({ allowed: false, dimension: 'subject' });
    });

    it('keeps buckets apart — a reset limit does not block a sign-up', async () => {
      const address = fresh();
      for (let i = 0; i < 3; i++) await store.recordRateLimitHit('PASSWORD_RESET', address);

      expect((await store.checkRateLimit('PASSWORD_RESET', address)).allowed).toBe(false);
      expect((await store.checkRateLimit('SIGN_UP', address)).allowed).toBe(true);
    });

    it('treats a differently-cased address as the same address', async () => {
      const address = fresh();
      for (let i = 0; i < 3; i++) {
        await store.recordRateLimitHit('PASSWORD_RESET', address.toUpperCase());
      }
      expect((await store.checkRateLimit('PASSWORD_RESET', address)).allowed).toBe(false);
    });

    /**
     * THE LOCKOUT THAT MUST NOT COME BACK.
     *
     * A browser test caught the first version refusing the real owner after
     * an attacker had burned the allowance against their address. Sign-in is
     * now limited by caller only, so hits against one address never accumulate
     * into a refusal.
     */
    it('never refuses a sign-in because of the address being tried', async () => {
      const address = fresh();
      for (let i = 0; i < 40; i++) await store.recordRateLimitHit('SIGN_IN', address);

      // Forty attempts DOES eventually refuse — but as the caller, never as
      // the address. An earlier version of this test asserted "still allowed"
      // and passed only because the caller allowance was then 50; tightening
      // it to 20 revealed the test was watching the wrong dimension.
      const decision = await store.checkRateLimit('SIGN_IN', address);
      if (!decision.allowed) expect(decision.dimension).toBe('caller');

      const { rows } = await admin.query<{ n: number }>(
        `select count(*)::int as n from rate_limit_hits
         where bucket = 'SIGN_IN' and dimension = 'subject'`,
      );
      expect(rows[0]!.n).toBe(0);
    });

    it('writes nothing against an address for a bucket with no address limit', async () => {
      const address = fresh();
      await store.recordRateLimitHit('SIGN_IN', address);
      const { rows } = await admin.query<{ n: number }>(
        `select count(*)::int as n from rate_limit_hits
         where bucket = 'SIGN_IN' and dimension = 'subject'`,
      );
      expect(rows[0]!.n).toBe(0);
    });

    it('forgets a subject’s hits where there is a subject limit', async () => {
      const address = fresh();
      for (let i = 0; i < 3; i++) await store.recordRateLimitHit('PASSWORD_RESET', address);
      expect((await store.checkRateLimit('PASSWORD_RESET', address)).allowed).toBe(false);

      await store.clearRateLimit('PASSWORD_RESET', address);
      expect((await store.checkRateLimit('PASSWORD_RESET', address)).allowed).toBe(true);
    });

    it('only forgets that one subject, not the whole bucket', async () => {
      const mine = fresh();
      const theirs = fresh();
      for (let i = 0; i < 3; i++) await store.recordRateLimitHit('PASSWORD_RESET', theirs);
      await store.clearRateLimit('PASSWORD_RESET', mine);

      expect((await store.checkRateLimit('PASSWORD_RESET', theirs)).allowed).toBe(false);
    });

    it('ignores hits that have fallen out of the window', async () => {
      const address = fresh();
      for (let i = 0; i < 3; i++) await store.recordRateLimitHit('PASSWORD_RESET', address);
      expect((await store.checkRateLimit('PASSWORD_RESET', address)).allowed).toBe(false);

      // Two hours later the hour-long window has moved past them.
      const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
      expect((await store.checkRateLimit('PASSWORD_RESET', address, later)).allowed).toBe(true);
    });
  });

  /* ============================================================
     WHAT IS STORED
     ============================================================ */

  describe('what the table holds', () => {
    it('has no column that could hold an address or an IP', async () => {
      const { rows } = await admin.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_name = 'rate_limit_hits'`,
      );
      const names = rows.map((r) => r.column_name);
      expect(names.some((n) => /email|address|ip|agent|host/i.test(n))).toBe(false);
      expect(names.sort()).toEqual(['bucket', 'dimension', 'id', 'occurred_at', 'token']);
    });

    /** The load-bearing one: the address must not be findable in the row. */
    it('stores a keyed token, not the address it came from', async () => {
      const address = `plain${Date.now()}@example.com`;
      await store.recordRateLimitHit('PASSWORD_RESET', address);

      const { rows } = await admin.query<{ token: string }>(
        `select token from rate_limit_hits where dimension = 'subject'
         order by occurred_at desc limit 5`,
      );
      for (const row of rows) {
        expect(row.token).not.toContain(address);
        expect(row.token).not.toContain('plain');
        expect(row.token).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('stores a keyed token for the caller too, never the address itself', async () => {
      await store.recordRateLimitHit('SIGN_IN', fresh());
      const { rows } = await admin.query<{ token: string; n: string }>(
        `select token, count(*) as n from rate_limit_hits
         where dimension = 'caller' group by token`,
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.token).not.toContain('203.0.113');
        expect(row.token).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    /**
     * Domain separation. The same value hashed for two purposes must not give
     * the same token, or a rate-limit row could be matched against one minted
     * elsewhere and the two linked.
     */
    it('gives the same value different tokens for different purposes', async () => {
      const { token } = await import('@/security/secret');
      const value = 'same-value@example.com';
      expect(token('rate-limit-subject', value)).not.toBe(token('rate-limit-caller', value));
      expect(token('rate-limit-subject', value)).not.toBe(token('challenge', value));
    });
  });

  /* ============================================================
     CHALLENGE REPLAY
     ============================================================ */

  describe('spending a bot challenge', () => {
    it('accepts a signature once', async () => {
      expect(await store.spendChallenge('a'.repeat(64))).toBe(true);
    });

    /** The gap BOT-RESISTANCE.md documented, now closed. */
    it('refuses the same signature a second time', async () => {
      const signature = 'b'.repeat(64);
      expect(await store.spendChallenge(signature)).toBe(true);
      expect(await store.spendChallenge(signature)).toBe(false);
    });

    /**
     * The insert IS the check. Asking first and inserting after leaves a
     * window where two concurrent requests both see nothing and both proceed
     * — which is precisely the request pattern an attacker sends.
     */
    it('lets exactly one of several concurrent attempts through', async () => {
      const signature = 'c'.repeat(64);
      const results = await Promise.all(
        Array.from({ length: 8 }, () => store.spendChallenge(signature)),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  describe('housekeeping', () => {
    it('prunes rows that are past being useful', async () => {
      await admin.query(
        `insert into rate_limit_hits (bucket, dimension, token, occurred_at)
         values ('SIGN_IN', 'subject', $1, now() - interval '2 days')`,
        ['d'.repeat(64)],
      );
      const removed = await store.pruneRateLimits();
      expect(removed).toBeGreaterThan(0);

      const { rows } = await admin.query<{ n: number }>(
        `select count(*)::int as n from rate_limit_hits
         where occurred_at < now() - interval '1 day'`,
      );
      expect(rows[0]!.n).toBe(0);
    });
  });
});
