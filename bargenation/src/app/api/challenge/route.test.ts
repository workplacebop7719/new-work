/**
 * The route that hands a form a fresh challenge.
 *
 * It is open to anybody, which is only safe because of the properties
 * asserted here: the purpose is bound, an unknown one is refused rather than
 * defaulted, and nothing is reused between calls.
 */
import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { verifyChallenge, type IssuedChallenge } from '@/security/challenge';

const call = (query: string) =>
  GET(new Request(`http://localhost/api/challenge${query}`));

describe('issuing a challenge', () => {
  it('issues one that the verifier accepts as genuine', async () => {
    const issued = (await (await call('?purpose=PASSWORD_RESET')).json()) as IssuedChallenge;
    expect(issued.purpose).toBe('PASSWORD_RESET');
    expect(issued.nonce).toMatch(/^[0-9a-f]{32}$/);
    // Wrong solution, but the signature and purpose must check out — the
    // failure has to be the proof of work, not a forged challenge.
    const verdict = verifyChallenge({ ...issued, solution: '0' }, 'PASSWORD_RESET');
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).not.toBe('MALFORMED');
  });

  it('never issues the same nonce twice', async () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const issued = (await (await call('?purpose=SIGN_UP')).json()) as IssuedChallenge;
      nonces.add(issued.nonce);
    }
    expect(nonces.size).toBe(20);
  });

  /**
   * The load-bearing one. Defaulting an unknown purpose would mint a
   * challenge bound to a form the caller did not ask about, which is exactly
   * what the purpose field exists to prevent: a cheap challenge spent on a
   * costly form.
   */
  it.each(['', '?purpose=', '?purpose=SIGN_IN', '?purpose=../SIGN_UP', '?purpose=sign_up'])(
    'refuses %j rather than defaulting', async (query) => {
      const response = await call(query);
      expect(response.status).toBe(400);
    },
  );

  it('is bound to the purpose it was asked for, and no other', async () => {
    const issued = (await (await call('?purpose=SUBSCRIBE')).json()) as IssuedChallenge;
    const wrongForm = verifyChallenge({ ...issued, solution: '0' }, 'SIGN_UP');
    expect(wrongForm.ok).toBe(false);
    if (!wrongForm.ok) expect(wrongForm.reason).toBe('WRONG_PURPOSE');
  });

  it('is never cached, since a cached challenge is a shared one', async () => {
    const response = await call('?purpose=SIGN_UP');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
