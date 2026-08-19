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

/**
 * The PRD says abandoned qualifier data follows "a short retention schedule"
 * without naming a number. 30 days is assumption A-15, pending the privacy
 * lead's confirmation (question Q-26). Completed sessions are kept longer
 * because a visitor may legitimately return to a result they were sent.
 */
export const RETENTION_DAYS = {
  abandonedQualifierSession: 30,
  completedQualifierSession: 90,
} as const;

export interface RetentionReport {
  readonly abandonedSessions: number;
  readonly completedSessions: number;
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

    if (options.apply) {
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

    return { abandonedSessions, completedSessions, applied: options.apply };
  });
}
