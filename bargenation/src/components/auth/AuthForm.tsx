'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { FormState } from '@/auth/actions';

/**
 * Shared shell for the sign-in and sign-up forms (PRD §29, §30).
 *
 * When the auth provider is not configured the submit control renders visibly
 * disabled with the reason stated, rather than accepting a password and
 * failing at the end (§01). The fields stay readable, so this is still a real
 * page rather than an error screen.
 */
export function AuthForm({
  action,
  submitLabel,
  configured,
  returnTo,
  children,
  footer,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  submitLabel: string;
  configured: boolean;
  returnTo: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="mt-12 max-w-[26rem]">
      <input type="hidden" name="returnTo" value={returnTo} />

      {state.error && (
        // role=alert announces the failure without stealing focus
        <p
          role="alert"
          className="mb-8 border-l-2 border-ink bg-wash px-4 py-3 text-[0.875rem] leading-snug"
        >
          {state.error}
        </p>
      )}

      <div className="space-y-7">{children}</div>

      <div className="mt-10">
        {configured ? (
          <button
            type="submit"
            disabled={pending}
            className="on-pink inline-flex min-h-[48px] w-full items-center justify-center px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {pending ? 'One moment' : submitLabel}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled
              aria-describedby="auth-unavailable"
              className="inline-flex min-h-[48px] w-full cursor-not-allowed items-center justify-center border border-line-strong px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-ink-50"
            >
              {submitLabel}
            </button>
            <p id="auth-unavailable" className="mt-3 text-[0.75rem] leading-snug text-ink-50">
              Accounts aren’t switched on yet — this needs credentials we don’t have. Nothing you
              typed here would be saved, so we’ve left the button off rather than pretend.
            </p>
          </>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-6 text-[0.875rem] leading-relaxed text-ink-70">
        {footer}
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-ink-50">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-2 min-h-[48px] w-full border-b border-ink bg-transparent pb-2 text-[1.0625rem] text-ink outline-none focus-visible:border-pink-ink"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-[0.75rem] leading-snug text-ink-50">
          {hint}
        </p>
      )}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-grow text-pink-ink">
      {children}
    </Link>
  );
}
