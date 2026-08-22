/**
 * The transactional outbox — ADR-0006 decision 2, ARC-003, ARC-004.
 *
 * Two halves that never run together:
 *
 *   `enqueue(tx, ...)` takes a transaction the caller already has open. It does
 *   not open one. That is the whole mechanism: the message and the domain change
 *   it describes commit or roll back as one, so there is no state in which the
 *   platform has told a vendor about something that did not happen.
 *
 *   `drainOutbox(...)` is the worker. It claims due messages, calls the port,
 *   and records the outcome — with backoff on failure and a dead state once the
 *   attempts run out. Nothing is dropped silently.
 */
import {
  assertAllowlisted,
  assertConsentSatisfied,
  destinationOf,
  newId,
  type OutboundDestination,
  type OutboundMessageType,
} from '@northstar/domain';
import { redactString } from '@northstar/observability';
import { withSystemContext, type TenantClient } from './client';

/**
 * How a message reaches its vendor.
 *
 * Injected rather than imported, so this package never depends on an adapter.
 * `deliverOutbound` in @northstar/integrations is the implementation; a test can
 * pass a function that counts calls or fails on demand.
 */
export type OutboundDeliverer = (envelope: {
  messageType: OutboundMessageType;
  payload: Readonly<Record<string, unknown>>;
  idempotencyKey: string;
}) => Promise<{ externalId: string }>;

export const OUTBOX_STATES = ['pending', 'delivering', 'delivered', 'dead'] as const;
export type OutboxState = (typeof OUTBOX_STATES)[number];

/**
 * How many times a message is tried before it is declared dead.
 *
 * With the backoff below, eight attempts span roughly four hours — long enough
 * to ride out a vendor's incident, short enough that a genuinely broken message
 * reaches the review queue the same working day.
 */
export const MAX_ATTEMPTS = 8;

/**
 * Backoff in seconds by attempt number, with jitter applied at use.
 *
 * Explicit rather than computed, because the shape matters more than the
 * formula: fast twice (a blip), then minutes (an outage), then a long tail. A
 * pure doubling from one second would spend its first four attempts inside
 * fifteen seconds, which is four attempts wasted on the same broken state.
 */
const BACKOFF_SECONDS = [5, 30, 120, 300, 900, 1800, 3600, 7200];

function backoffFor(attempts: number): number {
  const base = BACKOFF_SECONDS[Math.min(attempts, BACKOFF_SECONDS.length - 1)] ?? 7200;
  // ±20% jitter. Without it, a vendor outage that fails a thousand messages at
  // once retries all thousand at the same instant, repeatedly.
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

export interface OutboxMessage {
  readonly id: string;
  readonly organizationId: string | null;
  readonly destination: OutboundDestination;
  readonly messageType: OutboundMessageType;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
  readonly state: OutboxState;
  readonly attempts: number;
  readonly nextAttemptAt: Date;
  readonly lastError: string | null;
  readonly externalId: string | null;
  readonly createdAt: Date;
  readonly deliveredAt: Date | null;
}

interface Row {
  id: string;
  organization_id: string | null;
  destination: OutboundDestination;
  message_type: OutboundMessageType;
  payload: Record<string, unknown>;
  idempotency_key: string;
  state: OutboxState;
  attempts: number;
  next_attempt_at: Date;
  last_error: string | null;
  external_id: string | null;
  created_at: Date;
  delivered_at: Date | null;
}

const COLUMNS = `id, organization_id, destination, message_type, payload, idempotency_key,
                 state, attempts, next_attempt_at, last_error, external_id, created_at, delivered_at`;

const toMessage = (row: Row): OutboxMessage => ({
  id: row.id,
  organizationId: row.organization_id,
  destination: row.destination,
  messageType: row.message_type,
  payload: row.payload,
  idempotencyKey: row.idempotency_key,
  state: row.state,
  attempts: row.attempts,
  nextAttemptAt: row.next_attempt_at,
  lastError: row.last_error,
  externalId: row.external_id,
  createdAt: row.created_at,
  deliveredAt: row.delivered_at,
});

/**
 * Writes an outbound intent inside the caller's transaction.
 *
 * The two assertions run *before* the insert, so a payload that could not
 * lawfully be sent is never even queued. Refusing at enqueue rather than at
 * delivery means the mistake surfaces in the request that made it, next to the
 * code that caused it — not hours later in a worker log.
 */
export async function enqueue(
  tx: TenantClient,
  input: {
    organizationId: string | null;
    messageType: OutboundMessageType;
    payload: Record<string, unknown>;
  },
): Promise<string> {
  assertAllowlisted(input.messageType, input.payload);
  assertConsentSatisfied(input.messageType, input.payload);

  const id = newId();
  await tx.query(
    `INSERT INTO outbox_messages (id, organization_id, destination, message_type, payload, idempotency_key)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      id,
      input.organizationId,
      destinationOf(input.messageType),
      input.messageType,
      JSON.stringify(input.payload),
      // ARC-004: derived from the row's own id, so it is stable across every
      // retry of this message and unique across messages. A key derived from the
      // payload would collide for two legitimately identical sends.
      `${input.messageType}:${id}`,
    ],
  );
  return id;
}

export interface DrainReport {
  readonly claimed: number;
  readonly delivered: number;
  readonly retried: number;
  readonly died: number;
  readonly applied: boolean;
}

export interface DrainOptions {
  /** Dry-run by default, matching the retention job (A-14). */
  readonly apply?: boolean;
  readonly limit?: number;
  readonly now?: Date;
}

/**
 * Delivers due messages.
 *
 * Runs under system context because the outbox spans tenants by definition — a
 * worker cannot know which tenant's message is next. The reason is stated, which
 * is what `withSystemContext` demands.
 *
 * Each message is claimed with `FOR UPDATE SKIP LOCKED`, so two workers running
 * at once divide the work rather than fighting over it or double-sending.
 */
export async function drainOutbox(
  deliver: OutboundDeliverer,
  options: DrainOptions = {},
): Promise<DrainReport> {
  const apply = options.apply ?? false;
  const limit = options.limit ?? 50;
  const now = options.now ?? new Date();

  const due = await withSystemContext('outbox delivery (spans tenants by design)', async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM outbox_messages
        WHERE state = 'pending' AND next_attempt_at <= $1
        ORDER BY next_attempt_at
        LIMIT $2
        FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );
    return rows.map(toMessage);
  });

  if (!apply) {
    return { claimed: due.length, delivered: 0, retried: 0, died: 0, applied: false };
  }

  let delivered = 0;
  let retried = 0;
  let died = 0;

  for (const message of due) {
    try {
      const result = await deliver({
        messageType: message.messageType,
        payload: message.payload,
        idempotencyKey: message.idempotencyKey,
      });
      await markDelivered(message.id, result.externalId);
      delivered += 1;
    } catch (error) {
      const attempts = message.attempts + 1;
      // The provider's message is redacted before it is stored: an error body
      // routinely quotes the request back, and the request contained an address.
      const reason = redactString(error instanceof Error ? error.message : String(error)).slice(0, 1000);

      if (attempts >= MAX_ATTEMPTS) {
        await markDead(message.id, attempts, reason);
        died += 1;
      } else {
        await scheduleRetry(message.id, attempts, reason, backoffFor(attempts));
        retried += 1;
      }
    }
  }

  return { claimed: due.length, delivered, retried, died, applied: true };
}

const WORKER_REASON = 'outbox worker (spans tenants by design)';

async function markDelivered(id: string, externalId: string): Promise<void> {
  await withSystemContext(WORKER_REASON, async (tx) => {
    await tx.query(
      `UPDATE outbox_messages
          SET state = 'delivered', delivered_at = now(), external_id = $2,
              attempts = attempts + 1, updated_at = now()
        WHERE id = $1 AND state = 'pending'`,
      [id, externalId],
    );
  });
}

async function scheduleRetry(
  id: string,
  attempts: number,
  reason: string,
  delaySeconds: number,
): Promise<void> {
  await withSystemContext(WORKER_REASON, async (tx) => {
    await tx.query(
      `UPDATE outbox_messages
          SET attempts = $2, last_error = $3, updated_at = now(),
              next_attempt_at = now() + ($4 || ' seconds')::interval
        WHERE id = $1`,
      [id, attempts, reason, String(delaySeconds)],
    );
  });
}

async function markDead(id: string, attempts: number, reason: string): Promise<void> {
  await withSystemContext(WORKER_REASON, async (tx) => {
    await tx.query(
      `UPDATE outbox_messages
          SET state = 'dead', attempts = $2, last_error = $3, updated_at = now()
        WHERE id = $1`,
      [id, attempts, reason],
    );
  });
}

/**
 * The dead-letter queue, for the review ARC-003 requires.
 *
 * There is deliberately no "retry all dead messages" function. A message that
 * failed eight times over four hours failed for a reason, and the reason is
 * usually not one that waiting fixes — reviving one should be a decision
 * somebody makes about that message.
 */
export async function listDeadLetters(limit = 50): Promise<readonly OutboxMessage[]> {
  return withSystemContext('dead-letter review (ARC-003)', async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM outbox_messages
        WHERE state = 'dead' ORDER BY updated_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toMessage);
  });
}

export async function countPending(now: Date = new Date()): Promise<{ due: number; scheduled: number }> {
  return withSystemContext('outbox queue depth', async (tx) => {
    const { rows } = await tx.query<{ due: string; scheduled: string }>(
      `SELECT count(*) FILTER (WHERE next_attempt_at <= $1) AS due,
              count(*) FILTER (WHERE next_attempt_at > $1) AS scheduled
         FROM outbox_messages WHERE state = 'pending'`,
      [now],
    );
    return { due: Number(rows[0]?.due ?? 0), scheduled: Number(rows[0]?.scheduled ?? 0) };
  });
}

/* -------------------------------------------------------------------------- */
/* Marketing consent register (CNV-004, SEC-012)                              */
/* -------------------------------------------------------------------------- */

export const CONSENT_SOURCES = ['sign_up', 'qualifier', 'account_settings', 'support_request'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/**
 * Records a marketing consent decision inside the caller's transaction.
 *
 * Both answers are recorded. A "no" is a decision with a date, and the ability
 * to show that someone declined is as important as the ability to show they
 * agreed — it is what stops a later "we must have had consent" from being an
 * argument rather than a record.
 */
export async function recordMarketingConsent(
  tx: TenantClient,
  input: {
    organizationId: string;
    userId: string | null;
    email: string;
    granted: boolean;
    source: ConsentSource;
  },
): Promise<void> {
  await tx.query(
    `INSERT INTO marketing_consents (id, organization_id, user_id, email, granted, source)
     VALUES ($1, $2, $3, lower($4), $5, $6)`,
    [newId(), input.organizationId, input.userId, input.email.trim(), input.granted, input.source],
  );
}

/**
 * The current decision for an address, or undefined if never asked.
 *
 * The latest row wins, which is why the register is append-only: the history is
 * what makes "current" defensible.
 */
export async function currentMarketingConsent(
  organizationId: string,
  email: string,
): Promise<{ granted: boolean; decidedAt: Date; source: ConsentSource } | undefined> {
  return withSystemContext('marketing consent lookup', async (tx) => {
    const { rows } = await tx.query<{ granted: boolean; decided_at: Date; source: ConsentSource }>(
      `SELECT granted, decided_at, source FROM marketing_consents
        WHERE organization_id = $1 AND lower(email) = lower($2)
        ORDER BY decided_at DESC LIMIT 1`,
      [organizationId, email.trim()],
    );
    const row = rows[0];
    return row ? { granted: row.granted, decidedAt: row.decided_at, source: row.source } : undefined;
  });
}
