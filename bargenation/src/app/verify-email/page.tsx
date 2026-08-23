import type { Metadata } from 'next';
import { auth } from '@/auth';
import { verifyEmailAction } from '@/auth/actions';
import { isPlausibleToken } from '@/auth/token';
import { AuthForm, AuthLink } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

/**
 * VERIFY EMAIL (PRD §28, §30).
 *
 * Confirming is a button, not something the page does on load. Mail scanners,
 * link previewers and browser prefetchers fetch URLs they find in messages; if
 * arriving here consumed the token, a security appliance could burn it before
 * the customer ever clicked and they would be told their link had expired.
 *
 * So the page shows what it is about to do and waits to be told.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const port = auth();

  if (!isPlausibleToken(token)) {
    return (
      <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
        <p className="eyebrow text-ink-50">Your account</p>
        <h1 className="display display-xl mt-4 max-w-[16ch]">Nothing to confirm here.</h1>
        <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
          This page confirms an email address, and it needs the link from the message we sent to
          do that. Open it from your inbox rather than from history — a confirmation link stops
          working once it has been used.
        </p>
        <p className="mt-8">
          <AuthLink href="/login">Go to sign in</AuthLink>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Your account</p>
      <h1 className="display display-xl mt-4 max-w-[16ch]">Confirm this is you.</h1>
      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        Confirming your address is what lets us send you a Deal Signal when something you’re
        watching actually moves. Nothing else about your account changes.
      </p>

      <AuthForm
        action={verifyEmailAction}
        submitLabel="Confirm my email"
        configured={port.configured}
        hidden={{ token }}
        footer={
          <p>
            Once confirmed, <AuthLink href="/login">sign in</AuthLink> and your Watchlist is where
            you left it.
          </p>
        }
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
