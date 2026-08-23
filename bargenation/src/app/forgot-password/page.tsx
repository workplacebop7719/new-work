import type { Metadata } from 'next';
import { auth } from '@/auth';
import { requestPasswordResetAction } from '@/auth/actions';
import { AuthForm, Field, AuthLink } from '@/components/auth/AuthForm';
import { DeliveryNote } from '@/components/auth/DeliveryNote';
import { issueChallenge } from '@/security/challenge';

export const metadata: Metadata = {
  title: 'Forgot your password',
  // Recovery pages are for people who already have an account, and a search
  // engine indexing them serves nobody.
  robots: { index: false, follow: false },
};

/**
 * FORGOT PASSWORD (PRD §28, §29).
 *
 * The whole page is built around one rule: nothing here may reveal whether an
 * address has an account. The confirmation is identical either way, it renders
 * in place rather than redirecting to a "check your inbox" URL, and the copy
 * says "if there's an account" rather than "we've sent you a link".
 */
export default function ForgotPasswordPage() {
  const port = auth();

  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Account recovery</p>
      <h1 className="display display-xl mt-4 max-w-[16ch]">Let’s get you back in.</h1>
      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        Tell us the address you signed up with and we’ll send a link to set a new password. Your
        Watchlist, Saved items and Deal Signals are untouched by this.
      </p>

      <DeliveryNote port={port} />

      <AuthForm
        challenge={issueChallenge('PASSWORD_RESET')}
        action={requestPasswordResetAction}
        submitLabel="Send the link"
        configured={port.configured}
        footer={
          <p>
            Remembered it? <AuthLink href="/login">Sign in</AuthLink>.
          </p>
        }
      >
        <Field label="Email" name="email" type="email" autoComplete="email" />
      </AuthForm>
    </div>
  );
}

export const dynamic = 'force-dynamic';
