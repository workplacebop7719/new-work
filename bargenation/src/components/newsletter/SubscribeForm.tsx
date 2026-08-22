'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { subscribeAction, type SubscribeState } from '@/newsletter/actions';

/**
 * The signup control for The Edit.
 *
 * Double opt-in, so this promises nothing except that a request was recorded.
 * Where no provider is configured it says so and hands back the confirmation
 * link directly — a form that claims an email is on its way when none can be
 * sent is exactly the fake functionality §01 rules out.
 *
 * Controlled input: React 19 resets uncontrolled fields after a form action,
 * which would clear a typed address on any validation failure.
 */
export function SubscribeForm({ source = '/edit' }: { source?: string }) {
  const [state, act, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {
    error: null, pending: null, devConfirmUrl: null,
  });
  const [address, setAddress] = useState('');

  return (
    <div className="max-w-[32rem]">
      <form action={act}>
        <input type="hidden" name="source" value={source} />
        <label htmlFor="edit-email" className="eyebrow block text-ink-50">
          Your email
        </label>
        <div className="mt-2 flex items-stretch gap-4 border-b border-ink">
          <input
            id="edit-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-h-[48px] w-full bg-transparent pb-2 text-[1.0625rem] outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] hover:opacity-55 disabled:opacity-40"
          >
            {pending ? 'One moment' : 'Get the Edit'}
          </button>
        </div>
      </form>

      {(state.error || state.pending) && (
        <p role="status" className="mt-5 border-l-2 border-ink bg-wash px-4 py-3 text-[0.875rem] leading-relaxed">
          {state.error ?? state.pending}
        </p>
      )}

      {state.devConfirmUrl && (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-70">
          Because this is a development build, here is the confirmation link that would have been
          emailed:{' '}
          <Link href={state.devConfirmUrl} className="link-grow text-pink-ink">
            confirm your subscription
          </Link>
          .
        </p>
      )}

      <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-50">
        We record when you asked, and confirm before sending anything. One link in every issue
        removes you, and unsubscribing is immediate.
      </p>
    </div>
  );
}
