import { NextResponse } from 'next/server';
import { readSession } from '@/auth/session';

/**
 * Minimal "who am I" probe for the site header.
 *
 * The header needs to know whether someone is signed in, but reading cookies
 * in the root layout would make EVERY page dynamic and give up static
 * generation of the deal pages (§67). So the header stays static and asks
 * this route after hydration instead.
 *
 * Returns the display name and nothing else — no email, no id. A header does
 * not need them, and this response is reachable by any script on the page.
 */
export async function GET() {
  const session = await readSession();
  return NextResponse.json(
    {
      signedIn: Boolean(session),
      name: session?.user.displayName ?? null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
