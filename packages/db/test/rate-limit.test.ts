/**
 * Rate limiting on anonymous endpoints — question Q-27.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool } from '../src/client';
import { migrate } from '../src/migrate';
import { clientHash, consume, pruneRateLimitCounters, RATE_LIMITS } from '../src/rate-limit';

const NOW = new Date('2026-09-01T12:00:00Z');
let counter = 0;
/**
 * A fresh identifier per test *and* per run.
 *
 * The run suffix matters: counters live in a fixed hourly window, so without it
 * a second run inside the same hour would inherit the first run's consumed
 * budget and fail in a way that looks like a code bug.
 */
const RUN = randomUUID();
const uniqueClient = () => `198.51.100.${(counter += 1)}-${RUN}`;

beforeAll(async () => {
  process.env['RATE_LIMIT_SECRET'] ??= 'test-secret';
  await migrate();
});

afterAll(async () => {
  await closePool();
});

describe('key derivation (SEC-007)', () => {
  it('never contains the raw client identifier', () => {
    const ip = '203.0.113.7';
    const hash = clientHash(ip, NOW);
    expect(hash).not.toContain(ip);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rotates daily, so counters cannot be correlated across days', () => {
    const today = clientHash('203.0.113.7', new Date('2026-09-01T23:59:00Z'));
    const tomorrow = clientHash('203.0.113.7', new Date('2026-09-02T00:01:00Z'));
    expect(today).not.toBe(tomorrow);
  });

  it('refuses to run without a secret rather than hashing with a constant', () => {
    const saved = process.env['RATE_LIMIT_SECRET'];
    delete process.env['RATE_LIMIT_SECRET'];
    expect(() => clientHash('203.0.113.7', NOW)).toThrow(/RATE_LIMIT_SECRET/);
    process.env['RATE_LIMIT_SECRET'] = saved;
  });
});

describe('limits', () => {
  it('allows exactly the limit and refuses the next request', async () => {
    const client = uniqueClient();
    const { limit } = RATE_LIMITS.resume_email;

    for (let i = 1; i <= limit; i += 1) {
      const decision = await consume(client, 'resume_email', NOW);
      expect(decision.allowed, `request ${i} of ${limit}`).toBe(true);
      expect(decision.remaining).toBe(limit - i);
    }

    const refused = await consume(client, 'resume_email', NOW);
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps counting while refusing, so hammering does not reset the window', async () => {
    const client = uniqueClient();
    const { limit } = RATE_LIMITS.resume_email;
    for (let i = 0; i < limit + 5; i += 1) await consume(client, 'resume_email', NOW);

    const stillRefused = await consume(client, 'resume_email', NOW);
    expect(stillRefused.allowed).toBe(false);
  });

  it('counts each action separately', async () => {
    const client = uniqueClient();
    for (let i = 0; i < RATE_LIMITS.resume_email.limit + 1; i += 1) {
      await consume(client, 'resume_email', NOW);
    }
    // Exhausting the email budget must not lock the visitor out of the qualifier.
    expect((await consume(client, 'qualifier_answer', NOW)).allowed).toBe(true);
  });

  it('counts each client separately', async () => {
    const noisy = uniqueClient();
    for (let i = 0; i < RATE_LIMITS.resume_email.limit + 1; i += 1) {
      await consume(noisy, 'resume_email', NOW);
    }
    expect((await consume(uniqueClient(), 'resume_email', NOW)).allowed).toBe(true);
  });

  it('starts a fresh budget in the next window', async () => {
    const client = uniqueClient();
    const { limit, windowSeconds } = RATE_LIMITS.resume_email;
    for (let i = 0; i < limit + 1; i += 1) await consume(client, 'resume_email', NOW);
    expect((await consume(client, 'resume_email', NOW)).allowed).toBe(false);

    const nextWindow = new Date(NOW.getTime() + windowSeconds * 1000);
    expect((await consume(client, 'resume_email', nextWindow)).allowed).toBe(true);
  });

  it('is generous enough for a real visitor to finish the qualifier', async () => {
    const client = uniqueClient();
    // Eight answers, then a restart and eight more — a plausible human session.
    for (let i = 0; i < 16; i += 1) {
      expect((await consume(client, 'qualifier_answer', NOW)).allowed).toBe(true);
    }
  });
});

describe('pruning', () => {
  it('deletes counters for windows that have closed', async () => {
    const client = uniqueClient();
    const old = new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 7);
    await consume(client, 'qualifier_answer', old);

    const pruned = await pruneRateLimitCounters(NOW);
    expect(pruned).toBeGreaterThan(0);
  });

  it('keeps counters for the window still in progress', async () => {
    const client = uniqueClient();
    await consume(client, 'resume_email', NOW);
    await pruneRateLimitCounters(NOW);
    // Budget still consumed: pruning must not hand back an abuser's allowance.
    expect((await consume(client, 'resume_email', NOW)).remaining).toBe(
      RATE_LIMITS.resume_email.limit - 2,
    );
  });
});
