/**
 * Qualifier session store — CNV-001, CNV-002, PUB-006.
 *
 * Sessions are addressed by an unguessable resume token. Only its SHA-256 hash
 * is stored, so a database disclosure does not hand an attacker working resume
 * links, and there is deliberately no "list sessions" function anywhere in this
 * module: the only way to reach a row is to already hold its token.
 */
import { createHash, randomBytes } from 'node:crypto';
import { newId, type Answers, type ResultCategory } from '@northstar/domain';
import { withSystemContext } from './client';

export interface QualifierSession {
  readonly id: string;
  readonly locale: 'en' | 'fr';
  readonly answers: Answers;
  readonly resultCategory: ResultCategory | null;
  readonly ruleVersion: string | null;
  readonly consentAnalytics: boolean | null;
  readonly consentDecidedAt: Date | null;
  readonly completedAt: Date | null;
}

interface Row {
  id: string;
  locale: 'en' | 'fr';
  answers: Answers;
  result_category: ResultCategory | null;
  rule_version: string | null;
  consent_analytics: boolean | null;
  consent_decided_at: Date | null;
  completed_at: Date | null;
}

const toSession = (row: Row): QualifierSession => ({
  id: row.id,
  locale: row.locale,
  answers: row.answers,
  resultCategory: row.result_category,
  ruleVersion: row.rule_version,
  consentAnalytics: row.consent_analytics,
  consentDecidedAt: row.consent_decided_at,
  completedAt: row.completed_at,
});

/** 32 bytes of randomness, base64url. Long enough that guessing is not a threat. */
export function newResumeToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResumeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const SYSTEM_REASON = 'qualifier session (pre-tenant, addressed by resume token)';

export async function createSession(locale: 'en' | 'fr'): Promise<{ token: string; session: QualifierSession }> {
  const token = newResumeToken();
  const id = newId();
  const session = await withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `INSERT INTO qualifier_sessions (id, resume_token_hash, locale)
       VALUES ($1, $2, $3)
       RETURNING id, locale, answers, result_category, rule_version,
                 consent_analytics, consent_decided_at, completed_at`,
      [id, hashResumeToken(token), locale],
    );
    return toSession(rows[0]!);
  });
  return { token, session };
}

export async function findSession(token: string): Promise<QualifierSession | undefined> {
  if (!token) return undefined;
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT id, locale, answers, result_category, rule_version,
              consent_analytics, consent_decided_at, completed_at
         FROM qualifier_sessions WHERE resume_token_hash = $1`,
      [hashResumeToken(token)],
    );
    return rows[0] ? toSession(rows[0]) : undefined;
  });
}

export async function saveAnswers(token: string, answers: Answers): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE qualifier_sessions
          SET answers = $2, updated_at = now()
        WHERE resume_token_hash = $1`,
      [hashResumeToken(token), JSON.stringify(answers)],
    );
  });
}

export async function completeSession(
  token: string,
  resultCategory: ResultCategory,
  ruleVersion: string,
): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE qualifier_sessions
          SET result_category = $2, rule_version = $3, completed_at = now(), updated_at = now()
        WHERE resume_token_hash = $1`,
      [hashResumeToken(token), resultCategory, ruleVersion],
    );
  });
}

/**
 * Records the analytics consent decision.
 *
 * `granted: false` is stored, not treated as absence: a durable "no" is what
 * makes opt-out persistent across devices and cookie clearing (PUB-006).
 */
export async function recordConsent(token: string, granted: boolean): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE qualifier_sessions
          SET consent_analytics = $2, consent_decided_at = now(), updated_at = now()
        WHERE resume_token_hash = $1`,
      [hashResumeToken(token), granted],
    );
  });
}

/**
 * Stores a contact address for a resume link. Requires its own consent, separate
 * from marketing consent (SEC-012) — the database enforces the pairing too.
 */
export async function recordContactEmail(token: string, email: string): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE qualifier_sessions
          SET contact_email = $2, contact_consent_at = now(), updated_at = now()
        WHERE resume_token_hash = $1`,
      [hashResumeToken(token), email],
    );
  });
}
