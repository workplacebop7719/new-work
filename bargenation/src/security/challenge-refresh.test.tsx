/**
 * THE SPENT-CHALLENGE BUG, PINNED.
 *
 * A challenge is issued when the server renders a form, and a solved
 * signature can be spent exactly once (migration 0016). So the SECOND
 * submission from the same page was always refused: the browser still held
 * the first challenge and the server correctly rejected it as used.
 *
 * A person met that on the most ordinary path there is — ask for a password
 * reset, mistype the address, correct it, press the button again — and was
 * told "Something went wrong checking this form."
 *
 * These assert the two halves of the fix: the hook asks for a new challenge
 * when told to, and the hidden fields carry the NEW one rather than the one
 * the server rendered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useChallenge, ChallengeFields } from '@/components/security/ChallengeFields';
import type { IssuedChallenge } from '@/security/challenge';

const challenge = (nonce: string): IssuedChallenge => ({
  purpose: 'PASSWORD_RESET', nonce, bits: 0, issuedAt: Date.now(),
  signature: `sig-${nonce}`,
});

function Harness({ initial }: { initial: IssuedChallenge | null }) {
  const { state, current, refresh } = useChallenge(initial);
  return (
    <form>
      <ChallengeFields challenge={current} state={state} />
      <button type="button" onClick={refresh}>refresh</button>
    </form>
  );
}

const signatureField = () =>
  document.querySelector<HTMLInputElement>('input[name=challengeSignature]')?.value ?? null;

describe('a spent challenge is replaced, not reused', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, json: async () => challenge('second'),
    })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders the challenge the server issued, before anything is submitted', () => {
    render(<Harness initial={challenge('first')} />);
    expect(signatureField()).toBe('sig-first');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks for a new one and submits that instead', async () => {
    render(<Harness initial={challenge('first')} />);
    await act(async () => { screen.getByText('refresh').click(); });
    await waitFor(() => expect(signatureField()).toBe('sig-second'));
  });

  /** The purpose is carried through, so a cheap challenge cannot be respent
   *  on a costly form — the whole reason the field exists. */
  it('asks for the same purpose it was given', async () => {
    render(<Harness initial={challenge('first')} />);
    await act(async () => { screen.getByText('refresh').click(); });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0]))
      .toContain('purpose=PASSWORD_RESET');
  });

  /**
   * A form with no challenge at all still submits — the server has its own
   * dwell-time and honeypot checks and can say what happened. A form stuck
   * showing the old, dead signature would submit something guaranteed to be
   * refused, so the old one is kept only when there is nothing better.
   */
  it('keeps the old challenge when a new one cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => null })));
    render(<Harness initial={challenge('first')} />);
    await act(async () => { screen.getByText('refresh').click(); });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(signatureField()).toBe('sig-first');
  });

  it('does nothing at all for a form that carries no challenge', async () => {
    render(<Harness initial={null} />);
    await act(async () => { screen.getByText('refresh').click(); });
    expect(fetch).not.toHaveBeenCalled();
    expect(signatureField()).toBeNull();
  });
});
