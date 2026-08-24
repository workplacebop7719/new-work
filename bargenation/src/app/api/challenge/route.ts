import { NextResponse } from 'next/server';
import { issueChallenge, type ChallengePurpose } from '@/security/challenge';

/**
 * A FRESH CHALLENGE, BECAUSE THE ONE ON THE PAGE IS SPENT (PRD §01, §06).
 *
 * THE BUG THIS EXISTS TO FIX. A challenge is issued when the server renders
 * the form, and a solved signature can be spent exactly once (migration 0016,
 * replay protection). So the SECOND submission from the same page was always
 * refused — the browser still held the first challenge, and the server
 * correctly rejected it as already used.
 *
 * A person meets that on the most ordinary path there is: ask for a password
 * reset, mistype the address, correct it, press the button again. They were
 * told "Something went wrong checking this form. Reload the page and try
 * again", which is both unhelpful and, on a router-cached page, wrong — a
 * reload could hand back the same spent challenge.
 *
 * It was found by a browser smoke that requested two resets in a row, which
 * is exactly what somebody with two email addresses does.
 *
 * WHY A ROUTE RATHER THAN A NEW PROP. The form is a client component and the
 * action does not re-render the page it lives on, so there is no server pass
 * in which a new challenge could be handed down. The first challenge still
 * comes from the page render, so the common case costs no round trip; this is
 * only reached after a submission.
 *
 * WHY THIS IS SAFE TO LEAVE OPEN. Issuing is free and worthless on its own.
 * The cost the challenge imposes is in SOLVING it, which happens in the
 * caller's browser, and the signature commits to a purpose and an issuing
 * time — so a stockpile cannot be spent on a different form, cannot outlive
 * MAX_AGE_MS, and cannot be replayed. Nothing about who is asking is read,
 * and nothing is recorded.
 */
const PURPOSES: readonly ChallengePurpose[] = ['SIGN_UP', 'PASSWORD_RESET', 'SUBSCRIBE'];

const isPurpose = (value: string | null): value is ChallengePurpose =>
  value !== null && (PURPOSES as readonly string[]).includes(value);

export async function GET(request: Request) {
  const purpose = new URL(request.url).searchParams.get('purpose');

  // An unknown purpose is refused rather than defaulted. Defaulting would mint
  // a challenge bound to a form the caller did not ask about, which is the one
  // thing the purpose field exists to prevent.
  if (!isPurpose(purpose)) {
    return NextResponse.json({ error: 'unknown purpose' }, { status: 400 });
  }

  return NextResponse.json(issueChallenge(purpose), {
    headers: { 'cache-control': 'no-store' },
  });
}
