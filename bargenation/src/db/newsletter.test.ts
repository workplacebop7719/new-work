/**
 * Subscribing to The Edit, against a real database.
 *
 * Two claims are being tested. That the consent record is genuinely
 * evidentiary — dated, append-only, and complete enough to answer "when did I
 * agree to this?" precisely rather than plausibly. And that one subscriber's
 * token cannot reach another's row, which is enforced by policy rather than by
 * a WHERE clause somebody has to remember.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const APP_URL = process.env.TEST_APP_DATABASE_URL;
const live = Boolean(ADMIN_URL && APP_URL);
const d = live ? describe : describe.skip;

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const ALICE = `alice${STAMP}@example.com`;
const BOB = `bob${STAMP}@example.com`;

d('newsletter subscription', () => {
  let admin: pg.Client;
  let repo: typeof import('@/newsletter/subscribe');

  beforeAll(async () => {
    process.env.DATABASE_URL = APP_URL;
    repo = await import('@/newsletter/subscribe');
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
  });

  afterAll(async () => {
    await admin?.end();
    const { getPool } = await import('@/db/client');
    await getPool().end();
  });

  describe('double opt-in', () => {
    let confirmToken: string;
    let manageToken: string;

    it('a request does not subscribe anyone', async () => {
      const r = await repo.requestSubscription({ email: ALICE, source: '/edit' });
      expect(r.ok).toBe(true);
      if (!r.ok || r.state !== 'PENDING_CONFIRMATION') throw new Error('expected pending');
      confirmToken = r.confirmToken;

      const { rows } = await admin.query<{ status: string }>(
        'select status from newsletter_subscribers where email = $1', [ALICE],
      );
      expect(rows[0]!.status).toBe('PENDING');
    });

    it('records a dated REQUESTED event with where it came from', async () => {
      const { rows } = await admin.query<{ event: string; evidence: { source?: string } }>(
        `select e.event, e.evidence from newsletter_consent_events e
         join newsletter_subscribers s on s.id = e.subscriber_id
         where s.email = $1 order by e.occurred_at`,
        [ALICE],
      );
      expect(rows.map((r) => r.event)).toEqual(['REQUESTED']);
      expect(rows[0]!.evidence.source).toBe('/edit');
    });

    it('refuses an implausible address rather than storing it', async () => {
      const r = await repo.requestSubscription({ email: 'not-an-address', source: '/edit' });
      expect(r.ok).toBe(false);
    });

    it('normalises case so one person cannot subscribe twice', async () => {
      await repo.requestSubscription({ email: ALICE.toUpperCase(), source: '/edit' });
      const { rows } = await admin.query<{ n: number }>(
        'select count(*)::int as n from newsletter_subscribers where email = $1', [ALICE],
      );
      expect(rows[0]!.n).toBe(1);
    });

    it('confirming subscribes, and records the confirmation', async () => {
      const r = await repo.confirmSubscription(confirmToken);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      manageToken = r.manageToken;

      const { rows } = await admin.query<{ status: string; confirmed_at: Date | null }>(
        'select status, confirmed_at from newsletter_subscribers where email = $1', [ALICE],
      );
      expect(rows[0]!.status).toBe('SUBSCRIBED');
      expect(rows[0]!.confirmed_at).not.toBeNull();

      /**
       * Asserts the SHAPE of the record, not an exact array. A second signup
       * attempt while still pending is a second consent request, and logging
       * it is the correct evidentiary behaviour — so the count depends on how
       * many times the address was submitted, which is not what this is about.
       */
      const events = await admin.query<{ event: string }>(
        `select e.event from newsletter_consent_events e
         join newsletter_subscribers s on s.id = e.subscriber_id
         where s.email = $1 order by e.occurred_at`, [ALICE],
      );
      const sequence = events.rows.map((r) => r.event);
      expect(sequence[0]).toBe('REQUESTED');
      expect(sequence[sequence.length - 1]).toBe('CONFIRMED');
      expect(sequence.filter((e) => e === 'CONFIRMED')).toHaveLength(1);
    });

    it('rejects an unknown confirmation token', async () => {
      const r = await repo.confirmSubscription('00000000-0000-4000-8000-000000000000');
      expect(r.ok).toBe(false);
    });

    it('a second request for an already-subscribed address does not reset them', async () => {
      const count = async () => {
        const { rows } = await admin.query<{ n: number }>(
          `select count(*)::int as n from newsletter_consent_events e
           join newsletter_subscribers s on s.id = e.subscriber_id where s.email = $1`, [ALICE],
        );
        return rows[0]!.n;
      };
      const before = await count();

      const r = await repo.requestSubscription({ email: ALICE, source: '/edit' });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.state).toBe('ALREADY_SUBSCRIBED');

      // Nothing recorded: logging a fresh REQUESTED against somebody who is
      // already subscribed would make their consent history misleading.
      expect(await count()).toBe(before);
    });

    it('a subscriber can see their own dated consent record', async () => {
      const view = await repo.readSubscriber(manageToken);
      expect(view).not.toBeNull();
      expect(view!.email).toBe(ALICE);
      const events = view!.history.map((h) => h.event);
      expect(events[0]).toBe('REQUESTED');
      expect(events).toContain('CONFIRMED');
      // The point of the record: it can answer "when" precisely.
      expect(Number.isNaN(new Date(view!.history[0]!.occurredAt).getTime())).toBe(false);
    });

    it('unsubscribing is recorded, and is idempotent', async () => {
      expect((await repo.unsubscribe(manageToken)).ok).toBe(true);
      expect((await repo.unsubscribe(manageToken)).ok).toBe(true);

      const events = await admin.query<{ event: string }>(
        `select e.event from newsletter_consent_events e
         join newsletter_subscribers s on s.id = e.subscriber_id
         where s.email = $1 order by e.occurred_at`, [ALICE],
      );
      expect(events.rows.filter((r) => r.event === 'UNSUBSCRIBED')).toHaveLength(1);
    });

    it('will not silently resurrect an unsubscribed address', async () => {
      const again = await repo.requestSubscription({ email: ALICE, source: '/edit' });
      expect(again.ok).toBe(true);
      // A fresh confirmation is required; they are not simply switched back on.
      const { rows } = await admin.query<{ status: string }>(
        'select status from newsletter_subscribers where email = $1', [ALICE],
      );
      expect(rows[0]!.status).toBe('UNSUBSCRIBED');
    });
  });

  describe('one subscriber cannot reach another', () => {
    let aliceManage: string;
    let bobManage: string;

    beforeAll(async () => {
      const a = await repo.requestSubscription({ email: `x${ALICE}`, source: '/edit' });
      const b = await repo.requestSubscription({ email: BOB, source: '/edit' });
      if (!a.ok || a.state !== 'PENDING_CONFIRMATION') throw new Error('setup');
      if (!b.ok || b.state !== 'PENDING_CONFIRMATION') throw new Error('setup');
      const ca = await repo.confirmSubscription(a.confirmToken);
      const cb = await repo.confirmSubscription(b.confirmToken);
      if (!ca.ok || !cb.ok) throw new Error('setup');
      aliceManage = ca.manageToken;
      bobManage = cb.manageToken;
    });

    it('each token reads only its own row', async () => {
      expect((await repo.readSubscriber(aliceManage))!.email).toBe(`x${ALICE}`);
      expect((await repo.readSubscriber(bobManage))!.email).toBe(BOB);
    });

    it('an invented token reads nothing', async () => {
      expect(await repo.readSubscriber('11111111-2222-4333-8444-555555555555')).toBeNull();
    });

    /**
     * The confirmation token travels through email and may sit in an inbox for
     * years. It must not become a key to read or change anything later.
     */
    it('a spent confirmation token cannot be used to manage the subscription', async () => {
      const a = await repo.requestSubscription({ email: `y${ALICE}`, source: '/edit' });
      if (!a.ok || a.state !== 'PENDING_CONFIRMATION') throw new Error('setup');
      await repo.confirmSubscription(a.confirmToken);

      expect(await repo.readSubscriber(a.confirmToken)).toBeNull();
      expect((await repo.unsubscribe(a.confirmToken)).ok).toBe(false);
    });

    it('changing cadence with one token does not affect the other', async () => {
      expect(await repo.setCadence(aliceManage, 'DAILY')).toBe(true);
      expect((await repo.readSubscriber(aliceManage))!.cadence).toBe('DAILY');
      expect((await repo.readSubscriber(bobManage))!.cadence).toBe('WEEKLY');
    });

    it('refuses a cadence that is not offered', async () => {
      expect(await repo.setCadence(aliceManage, 'HOURLY')).toBe(false);
    });
  });

  describe('the consent log is evidence', () => {
    it('cannot be edited or deleted, including by us', async () => {
      await expect(admin.query(`update newsletter_consent_events set event = 'CONFIRMED'`))
        .rejects.toThrow(/append-only/i);
      await expect(admin.query('delete from newsletter_consent_events'))
        .rejects.toThrow(/append-only/i);
    });
  });
});
