'use client';

import { useEffect } from 'react';
import { noteInterestAction } from '@/data/member-actions';

/**
 * Tells the server this page was looked at (PRD §26, §37).
 *
 * Fires once per mount and returns nothing. The action itself decides whether
 * to record anything: it does nothing for an anonymous visitor and nothing for
 * a signed-in customer who has not turned behaviour alerts on. That check
 * lives on the server, so this component cannot be the thing that leaks a
 * page view — even if it is dropped onto a page by somebody who never read
 * this comment.
 *
 * Deliberately renders nothing and blocks nothing. A page must not wait on
 * this, and a failure here must never be visible.
 */
export function NoteInterest({ productSlug }: { productSlug: string }) {
  useEffect(() => {
    void noteInterestAction(productSlug).catch(() => undefined);
  }, [productSlug]);

  return null;
}
