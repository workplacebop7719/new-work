import 'server-only';
import { getPool } from '@/db/client';
import type pg from 'pg';

/**
 * Subscribing to The Bargenation Edit (PRD §38, §40).
 *
 * CASL's obligation is evidentiary: you must be able to show, per address,
 * that consent was given — when, how, and from where. A boolean column cannot
 * do that, so status is DERIVED from an append-only consent log, and the log
 * is the record.
 *
 * This does not make anyone compliant. It makes compliance provable, which is
 * the part software can contribute.
 */

export type SubscribeOutcome =
  | { ok: true; state: 'PENDING_CONFIRMATION'; confirmToken: string }
  | { ok: true; state: 'ALREADY_SUBSCRIBED' }
  | { ok: false; reason: string };

/** Runs a query with a subscriber token in scope, so the 0012 policies apply. */
async function withToken<T>(
  token: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1,$2,true)', ['request.newsletter_token', token ?? '']);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

const normalise = (email: string) => email.trim().toLowerCase();
const plausible = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

/**
 * Records a request to subscribe. Never completes it.
 *
 * Double opt-in is not optional here: an address is not subscribed until
 * somebody proves they can read it. This returns the confirmation token so the
 * caller can send it — or, when no provider is configured, so the flow can
 * honestly report that nothing was sent.
 */
export async function requestSubscription(input: {
  email: string;
  source: string;
  evidence?: Record<string, unknown>;
}): Promise<SubscribeOutcome> {
  const address = normalise(input.email);
  if (!plausible(address)) return { ok: false, reason: 'That does not look like an email address.' };

  /**
   * Goes through a database function rather than doing the upsert here.
   *
   * Deciding whether to record a new request requires knowing the address's
   * current status, and reading newsletter_subscribers by email is precisely
   * the capability migration 0012 withholds — it would turn this form into an
   * address-enumeration oracle. The function permits the operation without
   * granting the capability, and returns only a state and a token.
   */
  return withToken(null, async (client) => {
    const { rows } = await client.query<{ state: string; confirm_token: string | null }>(
      `select state, confirm_token::text from newsletter_request_subscription($1, $2, $3)`,
      [address, input.source, JSON.stringify(input.evidence ?? {})],
    );
    const row = rows[0]!;

    if (row.state === 'ALREADY_SUBSCRIBED') {
      return { ok: true, state: 'ALREADY_SUBSCRIBED' } as const;
    }
    return {
      ok: true,
      state: 'PENDING_CONFIRMATION',
      confirmToken: row.confirm_token!,
    } as const;
  });
}

export type ConfirmOutcome =
  | { ok: true; manageToken: string }
  | { ok: false; reason: string };

/** Completes double opt-in. The confirm token is spent here and never reused. */
export async function confirmSubscription(confirmToken: string): Promise<ConfirmOutcome> {
  return withToken(confirmToken, async (client) => {
    const { rows } = await client.query<{
      id: string; status: string; manage_token: string;
    }>(
      `select id, status, manage_token::text from newsletter_subscribers
       where confirm_token = $1::uuid`,
      [confirmToken],
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: 'That confirmation link is not valid.' } as const;
    if (row.status === 'UNSUBSCRIBED') {
      return { ok: false, reason: 'That address has unsubscribed. Sign up again to restart.' } as const;
    }
    if (row.status === 'SUBSCRIBED') {
      return { ok: true, manageToken: row.manage_token } as const;
    }

    await client.query(
      `update newsletter_subscribers
       set status = 'SUBSCRIBED', confirmed_at = now()
       where id = $1`,
      [row.id],
    );
    await client.query(
      `insert into newsletter_consent_events (subscriber_id, event, evidence)
       values ($1, 'CONFIRMED', $2)`,
      [row.id, JSON.stringify({ via: 'confirmation link' })],
    );
    await client.query(
      `insert into newsletter_preferences (subscriber_id) values ($1)
       on conflict (subscriber_id) do nothing`,
      [row.id],
    );

    return { ok: true, manageToken: row.manage_token } as const;
  });
}

export type UnsubscribeOutcome = { ok: true } | { ok: false; reason: string };

/**
 * Unsubscribes. Always succeeds from the customer's point of view if the token
 * is valid, including when they were already unsubscribed — making somebody
 * click twice to be sure is the opposite of the intent.
 */
export async function unsubscribe(manageToken: string): Promise<UnsubscribeOutcome> {
  return withToken(manageToken, async (client) => {
    const { rows } = await client.query<{ id: string; status: string }>(
      `select id, status from newsletter_subscribers where manage_token = $1::uuid`,
      [manageToken],
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: 'That link is not valid.' } as const;
    if (row.status === 'UNSUBSCRIBED') return { ok: true } as const;

    await client.query(
      `update newsletter_subscribers
       set status = 'UNSUBSCRIBED', unsubscribed_at = now() where id = $1`,
      [row.id],
    );
    await client.query(
      `insert into newsletter_consent_events (subscriber_id, event) values ($1,'UNSUBSCRIBED')`,
      [row.id],
    );
    return { ok: true } as const;
  });
}

export interface SubscriberView {
  email: string;
  status: string;
  cadence: string;
  /** The dated consent record, which is the point of all this. */
  history: Array<{ event: string; occurredAt: string }>;
}

/** What a subscriber can see about themselves, via their manage token. */
export async function readSubscriber(manageToken: string): Promise<SubscriberView | null> {
  return withToken(manageToken, async (client) => {
    const { rows } = await client.query<{
      id: string; email: string; status: string; cadence: string | null;
    }>(
      `select s.id, s.email, s.status, p.cadence
       from newsletter_subscribers s
       left join newsletter_preferences p on p.subscriber_id = s.id
       where s.manage_token = $1::uuid`,
      [manageToken],
    );
    const row = rows[0];
    if (!row) return null;

    const events = await client.query<{ event: string; occurred_at: Date }>(
      `select event, occurred_at from newsletter_consent_events
       where subscriber_id = $1 order by occurred_at asc`,
      [row.id],
    );

    return {
      email: row.email,
      status: row.status,
      cadence: row.cadence ?? 'WEEKLY',
      history: events.rows.map((e) => ({
        event: e.event,
        occurredAt: e.occurred_at.toISOString(),
      })),
    };
  });
}

export async function setCadence(manageToken: string, cadence: string): Promise<boolean> {
  if (!['DAILY', 'WEEKLY', 'ALERTS_ONLY'].includes(cadence)) return false;
  return withToken(manageToken, async (client) => {
    const { rowCount } = await client.query(
      `update newsletter_preferences set cadence = $2, updated_at = now()
       where subscriber_id in (
         select id from newsletter_subscribers where manage_token = $1::uuid
       )`,
      [manageToken, cadence],
    );
    return (rowCount ?? 0) > 0;
  });
}
