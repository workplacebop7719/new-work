/**
 * Retention sweep — CNV-001, SEC-007.
 *
 * Two properties matter more than the mechanics (assumption A-14):
 *
 *   1. It is dry-run by default. Deleting client-adjacent data must be an
 *      explicit act, not the default outcome of running a script.
 *   2. It reports what it would delete before it deletes anything, so the
 *      decision is reviewable.
 */
import { withSystemContext } from './client';
import { pruneRateLimitCounters } from './rate-limit';

/**
 * The PRD says abandoned qualifier data follows "a short retention schedule"
 * without naming a number. 30 days is assumption A-15, pending the privacy
 * lead's confirmation (question Q-26). Completed sessions are kept longer
 * because a visitor may legitimately return to a result they were sent.
 */
export const RETENTION_DAYS = {
  abandonedQualifierSession: 30,
  completedQualifierSession: 90,
  /**
   * Sessions are swept well after they stop working, not when they stop
   * working: SEC-006 wants "signed in from a new place" to be answerable, and
   * that needs the row to survive the session. 90 days matches the audit
   * window the same question is asked over.
   */
  expiredAuthSession: 90,
  /**
   * A closed invitation still holds the address it was sent to. Thirty days is
   * long enough for an administrator to see that someone accepted and short
   * enough that a declined invitation does not become a permanent record of an
   * address that never became a user (SEC-007 minimization).
   */
  closedInvitation: 30,
  /** Throttle counters are transient; a day past the lockout window is ample. */
  signInThrottle: 2,
  /**
   * Delivered outbox messages. Kept a month so "did we ever email them?" has an
   * answer during a support conversation. **Dead** messages are never swept:
   * they are the review queue (ARC-003), and a queue that empties itself is not
   * one.
   */
  deliveredOutboxMessage: 30,
} as const;

export interface RetentionReport {
  readonly abandonedSessions: number;
  readonly completedSessions: number;
  readonly expiredAuthSessions: number;
  readonly closedInvitations: number;
  readonly signInThrottleRows: number;
  readonly deliveredOutboxMessages: number;
  /** Closed rate-limit windows. Always pruned: they hold no personal data and
   *  keeping them serves no purpose. */
  readonly rateLimitCountersPruned: number;
  readonly applied: boolean;
}

export async function runRetention(options: { apply: boolean } = { apply: false }): Promise<RetentionReport> {
  return withSystemContext('scheduled retention sweep', async (tx) => {
    const count = async (sql: string, days: number): Promise<number> => {
      const { rows } = await tx.query<{ n: string }>(sql, [days]);
      return Number(rows[0]?.n ?? 0);
    };

    const abandonedSessions = await count(
      `SELECT count(*) AS n FROM qualifier_sessions
        WHERE completed_at IS NULL AND updated_at < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.abandonedQualifierSession,
    );
    const completedSessions = await count(
      `SELECT count(*) AS n FROM qualifier_sessions
        WHERE completed_at IS NOT NULL AND completed_at < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.completedQualifierSession,
    );

    // Swept on `last_seen_at` alone, revoked or not. Any session untouched for
    // 90 days is long past its absolute ceiling, so this window is strictly
    // wider than the one that decides whether a session still works.
    const expiredAuthSessions = await count(
      `SELECT count(*) AS n FROM auth_sessions
        WHERE last_seen_at < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.expiredAuthSession,
    );
    const closedInvitations = await count(
      `SELECT count(*) AS n FROM invitations
        WHERE (accepted_at IS NOT NULL OR revoked_at IS NOT NULL)
          AND coalesce(accepted_at, revoked_at) < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.closedInvitation,
    );
    const signInThrottleRows = await count(
      `SELECT count(*) AS n FROM sign_in_throttle
        WHERE updated_at < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.signInThrottle,
    );
    const deliveredOutboxMessages = await count(
      `SELECT count(*) AS n FROM outbox_messages
        WHERE state = 'delivered' AND delivered_at < now() - ($1 || ' days')::interval`,
      RETENTION_DAYS.deliveredOutboxMessage,
    );

    if (options.apply) {
      await tx.query(
        `DELETE FROM auth_sessions WHERE last_seen_at < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.expiredAuthSession],
      );
      await tx.query(
        `DELETE FROM invitations
          WHERE (accepted_at IS NOT NULL OR revoked_at IS NOT NULL)
            AND coalesce(accepted_at, revoked_at) < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.closedInvitation],
      );
      await tx.query(
        `DELETE FROM sign_in_throttle WHERE updated_at < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.signInThrottle],
      );
      // Delivered only. A dead message is evidence of something that did not
      // reach a person, and deleting it on a schedule would quietly close the
      // review queue ARC-003 asks somebody to keep open.
      await tx.query(
        `DELETE FROM outbox_messages
          WHERE state = 'delivered' AND delivered_at < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.deliveredOutboxMessage],
      );
      await tx.query(
        `DELETE FROM qualifier_sessions
          WHERE completed_at IS NULL AND updated_at < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.abandonedQualifierSession],
      );
      await tx.query(
        `DELETE FROM qualifier_sessions
          WHERE completed_at IS NOT NULL AND completed_at < now() - ($1 || ' days')::interval`,
        [RETENTION_DAYS.completedQualifierSession],
      );
    }

    const rateLimitCountersPruned = options.apply ? await pruneRateLimitCounters() : 0;

    return {
      abandonedSessions,
      completedSessions,
      expiredAuthSessions,
      closedInvitations,
      signInThrottleRows,
      deliveredOutboxMessages,
      rateLimitCountersPruned,
      applied: options.apply,
    };
  });
}
