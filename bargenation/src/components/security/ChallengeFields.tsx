'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IssuedChallenge } from '@/security/challenge';

/**
 * Solves the proof-of-work challenge in the browser (PRD §01, §06).
 *
 * Runs in chunks with a yield between them. A single tight loop of 65,000
 * hashes freezes the tab on a slow phone, and a form that stops responding
 * while it "checks you are human" is exactly the experience a captcha vendor
 * would have given us.
 *
 * There is nothing for the person to do. No grid of traffic lights, no audio
 * alternative, no puzzle — which is the accessible answer rather than a
 * compromise on one.
 */

/** Hashes per chunk. Small enough that the main thread stays responsive. */
const CHUNK = 2_000;

const hex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Must agree exactly with leadingZeroBits on the server. */
function leadingZeroBits(digest: string): number {
  let bits = 0;
  for (const char of digest) {
    const value = parseInt(char, 16);
    if (Number.isNaN(value)) return bits;
    if (value === 0) { bits += 4; continue; }
    bits += Math.clz32(value) - 28;
    break;
  }
  return bits;
}

export type ChallengeState =
  | { status: 'solving'; solution: '' }
  | { status: 'ready'; solution: string }
  | { status: 'unsupported'; solution: '' };

export interface Challenge {
  state: ChallengeState;
  /** The challenge to submit — the server's on first paint, a fresh one after. */
  current: IssuedChallenge | null;
  /**
   * Fetch a new one. Call this after every submission.
   *
   * A solved signature can be spent exactly once, so the challenge sitting in
   * the form after a submit is dead. Without this, pressing the button a
   * second time — correcting a mistyped address, asking about a second
   * account — was refused with "Something went wrong checking this form",
   * which is the kind of failure that reads as a broken site.
   */
  refresh: () => void;
}

export function useChallenge(initial: IssuedChallenge | null): Challenge {
  const [state, setState] = useState<ChallengeState>({ status: 'solving', solution: '' });
  const [challenge, setChallenge] = useState<IssuedChallenge | null>(initial);

  /**
   * Replaces the spent challenge with a new one and starts solving it.
   *
   * On failure the OLD challenge is kept rather than cleared. A form with no
   * challenge at all still submits — the server has its own dwell-time and
   * honeypot checks and can say what happened — whereas a form stuck showing
   * "checking..." forever can do nothing at all.
   */
  const refresh = useCallback(() => {
    if (!initial) return; // this form does not use a challenge
    setState({ status: 'solving', solution: '' });
    fetch(`/api/challenge?purpose=${encodeURIComponent(initial.purpose)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((next: IssuedChallenge | null) => { if (next?.nonce) setChallenge(next); })
      .catch(() => undefined);
  }, [initial]);

  // Primitive dependencies, not the object: a parent re-render hands down a
  // new object with the same contents, and depending on identity would
  // restart the search every time anything above this re-rendered.
  const nonce = challenge?.nonce ?? null;
  const bits = challenge?.bits ?? 0;

  useEffect(() => {
    if (!nonce) return;
    let cancelled = false;
    const encoder = new TextEncoder();

    async function solve() {
      // Subtle crypto needs a secure context. On plain http beyond localhost
      // it is simply absent, and the form must still work — the server-side
      // dwell time and honeypot checks still apply, and the action can say
      // what happened rather than the page failing silently.
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        if (!cancelled) setState({ status: 'unsupported', solution: '' });
        return;
      }

      for (let start = 0; !cancelled; start += CHUNK) {
        for (let counter = start; counter < start + CHUNK; counter++) {
          const digest = await crypto.subtle.digest(
            'SHA-256', encoder.encode(`${nonce}:${counter}`),
          );
          if (cancelled) return;
          if (leadingZeroBits(hex(digest)) >= bits) {
            setState({ status: 'ready', solution: String(counter) });
            return;
          }
        }
        // Hand the thread back so typing and scrolling stay smooth.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    void solve();
    return () => { cancelled = true; };
  }, [nonce, bits]);

  return { state, current: challenge, refresh };
}

/**
 * The hidden fields the server reads back.
 *
 * `website` is the honeypot. It is hidden from sight, from the tab order and
 * from assistive technology, and labelled so that anything reading the DOM
 * without CSS is tempted to fill it in. A real person cannot reach it; a
 * form-filling script fills every input it finds.
 */
export function ChallengeFields({
  challenge,
  state,
}: {
  challenge: IssuedChallenge | null;
  state: ChallengeState;
}) {
  if (!challenge) return null;

  return (
    <>
      <input type="hidden" name="challengePurpose" value={challenge.purpose} />
      <input type="hidden" name="challengeNonce" value={challenge.nonce} />
      <input type="hidden" name="challengeBits" value={challenge.bits} />
      <input type="hidden" name="challengeIssuedAt" value={challenge.issuedAt} />
      <input type="hidden" name="challengeSignature" value={challenge.signature} />
      <input type="hidden" name="challengeSolution" value={state.solution} />

      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
    </>
  );
}
