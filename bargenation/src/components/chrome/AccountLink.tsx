'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * The header's account control.
 *
 * Renders "Sign in" until it learns otherwise, then swaps to the portal link.
 * The alternative — reading the session cookie in the root layout — would opt
 * every page out of static rendering for the sake of two words, so the header
 * stays static and corrects itself after hydration.
 *
 * A signed-in visitor may see "Sign in" for one frame. Both states link
 * somewhere correct, so the worst case is a slightly stale label, never a
 * broken destination.
 */
export function AccountLink({ className }: { className: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { signedIn?: boolean } | null) => {
        if (!cancelled) setSignedIn(Boolean(data?.signedIn));
      })
      .catch(() => {
        // A failed probe simply leaves the signed-out label in place.
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return signedIn ? (
    <Link href="/app/watchlist" className={className}>
      Your Bargenation
    </Link>
  ) : (
    <Link href="/login" className={className}>
      Sign in
    </Link>
  );
}
