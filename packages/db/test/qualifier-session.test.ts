/**
 * CNV-001 save-and-resume, PUB-006 consent recording, and the retention sweep.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, withSystemContext } from '../src/client';
import { migrate } from '../src/migrate';
import {
  completeSession,
  createSession,
  findSession,
  hashResumeToken,
  newResumeToken,
  recordConsent,
  recordContactEmail,
  saveAnswers,
} from '../src/qualifier-session';
import { RETENTION_DAYS, runRetention } from '../src/retention';

beforeAll(async () => {
  await migrate();
});

afterAll(async () => {
  await closePool();
});

describe('save and resume (CNV-001)', () => {
  it('creates a session with no account and resumes it by token', async () => {
    const { token, session } = await createSession('en');
    expect(session.answers).toEqual({});

    await saveAnswers(token, { ontario_presence: 'yes', employee_band: '50_to_199' });

    const resumed = await findSession(token);
    expect(resumed?.id).toBe(session.id);
    expect(resumed?.answers.employee_band).toBe('50_to_199');
  });

  it('stores only the hash of the resume token', async () => {
    const { token, session } = await createSession('en');
    const stored = await withSystemContext('test: inspect stored token', async (tx) => {
      const { rows } = await tx.query<{ resume_token_hash: string }>(
        'SELECT resume_token_hash FROM qualifier_sessions WHERE id = $1',
        [session.id],
      );
      return rows[0]?.resume_token_hash;
    });
    expect(stored).toBe(hashResumeToken(token));
    expect(stored).not.toBe(token);
  });

  it('returns nothing for an unknown or empty token', async () => {
    expect(await findSession(newResumeToken())).toBeUndefined();
    expect(await findSession('')).toBeUndefined();
  });

  it('records the result with the rule version that produced it (CNV-002)', async () => {
    const { token } = await createSession('fr');
    await completeSession(token, 'assessment_fit', '2026.08.1');
    const session = await findSession(token);
    expect(session?.resultCategory).toBe('assessment_fit');
    expect(session?.ruleVersion).toBe('2026.08.1');
    expect(session?.completedAt).toBeInstanceOf(Date);
  });
});

describe('consent recording (PUB-006, SEC-012)', () => {
  it('starts with no decision, which is not consent', async () => {
    const { session } = await createSession('en');
    expect(session.consentAnalytics).toBeNull();
    expect(session.consentDecidedAt).toBeNull();
  });

  it('stores a refusal durably, so opt-out survives a cleared cookie', async () => {
    const { token } = await createSession('en');
    await recordConsent(token, false);
    const session = await findSession(token);
    expect(session?.consentAnalytics).toBe(false);
    expect(session?.consentDecidedAt).toBeInstanceOf(Date);
  });

  it('stores a grant with its timestamp', async () => {
    const { token } = await createSession('en');
    await recordConsent(token, true);
    expect((await findSession(token))?.consentAnalytics).toBe(true);
  });

  it('refuses at the database to record consent without a timestamp', async () => {
    await expect(
      withSystemContext('test: constraint check', async (tx) => {
        await tx.query(
          `INSERT INTO qualifier_sessions (id, resume_token_hash, locale, consent_analytics)
           VALUES (gen_random_uuid(), 'hash-a', 'en', true)`,
        );
      }),
    ).rejects.toThrow(/consent_recorded_together/);
  });

  it('refuses at the database to store an email without its own consent', async () => {
    await expect(
      withSystemContext('test: constraint check', async (tx) => {
        await tx.query(
          `INSERT INTO qualifier_sessions (id, resume_token_hash, locale, contact_email)
           VALUES (gen_random_uuid(), 'hash-b', 'en', 'someone@example.com')`,
        );
      }),
    ).rejects.toThrow(/contact_email_requires_consent/);
  });

  it('stores an email together with its consent when the visitor asks for a link', async () => {
    const { token } = await createSession('en');
    await recordContactEmail(token, 'visitor@example.com');
    const stored = await withSystemContext('test: inspect', async (tx) => {
      const { rows } = await tx.query<{ contact_consent_at: Date | null }>(
        'SELECT contact_consent_at FROM qualifier_sessions WHERE resume_token_hash = $1',
        [hashResumeToken(token)],
      );
      return rows[0]?.contact_consent_at;
    });
    expect(stored).toBeInstanceOf(Date);
  });
});

describe('retention sweep (CNV-001, A-14, A-15)', () => {
  const ageSession = async (token: string, days: number, completed: boolean) => {
    await withSystemContext('test: age a session', async (tx) => {
      await tx.query(
        `UPDATE qualifier_sessions
            SET updated_at = now() - ($2 || ' days')::interval,
                completed_at = CASE WHEN $3 THEN now() - ($2 || ' days')::interval ELSE NULL END
          WHERE resume_token_hash = $1`,
        [hashResumeToken(token), days, completed],
      );
    });
  };

  it('dry-runs by default and deletes nothing', async () => {
    const { token } = await createSession('en');
    await ageSession(token, RETENTION_DAYS.abandonedQualifierSession + 5, false);

    const report = await runRetention();
    expect(report.applied).toBe(false);
    expect(report.abandonedSessions).toBeGreaterThan(0);
    // Still there.
    expect(await findSession(token)).toBeDefined();
  });

  it('deletes abandoned sessions past the window when applied', async () => {
    const { token } = await createSession('en');
    await ageSession(token, RETENTION_DAYS.abandonedQualifierSession + 5, false);

    await runRetention({ apply: true });
    expect(await findSession(token)).toBeUndefined();
  });

  it('keeps an abandoned session that is still inside the window', async () => {
    const { token } = await createSession('en');
    await ageSession(token, RETENTION_DAYS.abandonedQualifierSession - 1, false);

    await runRetention({ apply: true });
    expect(await findSession(token)).toBeDefined();
  });

  it('keeps a completed session longer than an abandoned one', async () => {
    const { token } = await createSession('en');
    await completeSession(token, 'assessment_fit', '2026.08.1');
    await ageSession(token, RETENTION_DAYS.abandonedQualifierSession + 5, true);

    await runRetention({ apply: true });
    expect(await findSession(token)).toBeDefined();
  });
});
