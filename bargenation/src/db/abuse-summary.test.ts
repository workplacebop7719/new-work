/**
 * Operator visibility into an attack, proved against a real database.
 *
 * Two things are being proven, and the second matters more:
 *
 *   The aggregation is right — an operator who reads "one source, thirty
 *   attempts, past the allowance" has to be reading the truth, because they
 *   will act on it at two in the morning.
 *
 *   The path to it is the ONLY path. Staff have no select on
 *   `rate_limit_hits`, and the application role — the one reachable from a
 *   request handler — cannot call the summary at all. A survey reachable from
 *   a request handler is a survey reachable from a bug.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import pg from 'pg';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const STAFF_URL = process.env.TEST_ADMIN_DATABASE_URL;
const APP_URL = process.env.TEST_APP_DATABASE_URL;
const live = Boolean(ADMIN_URL && STAFF_URL && APP_URL);
const d = live ? describe : describe.skip;

interface Row {
  bucket: string;
  dimension: string;
  attempts: string;
  distinct_tokens: string;
  busiest_token_attempts: string;
  tokens_over_limit: string;
}

const token = (seed: string) => seed.repeat(64).slice(0, 64);

d('abuse summary', () => {
  let superuser: pg.Client;
  let staff: pg.Client;
  let app: pg.Client;

  beforeAll(async () => {
    superuser = new pg.Client({ connectionString: ADMIN_URL });
    await superuser.connect();
    staff = new pg.Client({ connectionString: STAFF_URL });
    await staff.connect();
    app = new pg.Client({ connectionString: APP_URL });
    await app.connect();
  });

  beforeEach(async () => {
    await superuser.query('delete from rate_limit_hits');
  });

  afterAll(async () => {
    await superuser?.query('delete from rate_limit_hits').catch(() => undefined);
    await superuser?.end();
    await staff?.end();
    await app?.end();
  });

  const hits = async (bucket: string, dimension: string, seed: string, n: number) => {
    await superuser.query(
      `insert into rate_limit_hits (bucket, dimension, token)
       select $1, $2, $3 from generate_series(1, $4)`,
      [bucket, dimension, token(seed), n],
    );
  };

  describe('the figures an operator acts on', () => {
    it('separates concentration from volume', async () => {
      // One source hammering, plus a long tail of ordinary traffic. These are
      // different attacks and the page has to be able to tell them apart.
      await hits('SIGN_IN', 'caller', 'a', 30);
      for (const seed of ['b', 'c', 'd', 'e']) await hits('SIGN_IN', 'caller', seed, 1);

      const { rows } = await staff.query<Row>('select * from abuse_summary(60, 20)');
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(Number(row.attempts)).toBe(34);
      expect(Number(row.distinct_tokens)).toBe(5);
      expect(Number(row.busiest_token_attempts)).toBe(30);
      expect(Number(row.tokens_over_limit)).toBe(1);
    });

    it('counts over-limit against the allowance it is given, not one of its own', async () => {
      await hits('SUBSCRIBE', 'subject', 'f', 4);
      const lenient = await staff.query<Row>('select * from abuse_summary(60, 20)');
      expect(Number(lenient.rows[0]!.tokens_over_limit)).toBe(0);

      // The application enforces 3 for this bucket. The database must not hold
      // a second opinion — it counts against whatever it is handed.
      const strict = await staff.query<Row>('select * from abuse_summary(60, 3)');
      expect(Number(strict.rows[0]!.tokens_over_limit)).toBe(1);
    });

    it('ignores anything outside the window it was asked about', async () => {
      await superuser.query(
        `insert into rate_limit_hits (bucket, dimension, token, occurred_at)
         values ('SIGN_IN', 'caller', $1, now() - interval '3 hours')`,
        [token('g')],
      );
      const hour = await staff.query<Row>('select * from abuse_summary(60, 20)');
      expect(hour.rows).toHaveLength(0);

      const day = await staff.query<Row>('select * from abuse_summary(1440, 20)');
      expect(Number(day.rows[0]!.attempts)).toBe(1);
    });

    /**
     * A dashboard that can be asked for a year of history is a table scan
     * waiting to be triggered, and nothing older than a day survives the
     * prune anyway. The clamp is in the function so it holds however it is
     * called.
     */
    it('clamps an absurd window rather than obeying it', async () => {
      await hits('SIGN_IN', 'caller', 'h', 2);
      const huge = await staff.query<Row>('select * from abuse_summary(999999, 20)');
      const day = await staff.query<Row>('select * from abuse_summary(1440, 20)');
      expect(huge.rows[0]!.attempts).toBe(day.rows[0]!.attempts);

      const zero = await staff.query<Row>('select * from abuse_summary(0, 20)');
      expect(zero.rows.length).toBeLessThanOrEqual(1);
    });
  });

  describe('what it will not give up', () => {
    it('returns no token, and no column that could hold one', async () => {
      await hits('SIGN_IN', 'caller', 'i', 3);
      const { rows, fields } = await staff.query<Row>('select * from abuse_summary(60, 20)');
      const names = fields.map((f) => f.name);
      expect(names).not.toContain('token');
      // Belt and braces: no returned value may be a 64-character token.
      for (const row of rows) {
        for (const value of Object.values(row)) {
          expect(String(value)).not.toMatch(/^[0-9a-f]{64}$/);
        }
      }
    });

    it('does not let staff read the underlying rows', async () => {
      await expect(staff.query('select * from rate_limit_hits')).rejects.toThrow(/permission denied/i);
    });

    it('is unreachable from the application role', async () => {
      await expect(app.query('select * from abuse_summary(60, 20)')).rejects.toThrow(/permission denied/i);
    });
  });
});
